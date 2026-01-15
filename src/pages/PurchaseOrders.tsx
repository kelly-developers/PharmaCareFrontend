import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Medicine } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';
import { purchaseOrderService } from '@/services/purchaseOrderService';
import { supplierService } from '@/services/supplierService';
import { medicineService } from '@/services/medicineService';
import { generatePurchaseOrderPDF, PharmacyInfo, SupplierInfo, OrderItem } from '@/utils/pdfExport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  FileText,
  Download,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  Loader2,
  RefreshCw,
  Package,
  AlertTriangle,
  Printer,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';

interface LowStockItem {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  costPrice: number;
  orderQty: number;
  totalPrice: number;
  selected: boolean;
}

const DEFAULT_PHARMACY: PharmacyInfo = {
  name: 'PharmaCare Kenya',
  licenseNo: 'PPB-2024-12345',
  phone: '+254 722 123 456',
  email: 'info@pharmacare.co.ke',
  address: 'Kenyatta Avenue, CBD, Nairobi',
};

export default function PurchaseOrders() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const { toast } = useToast();

  const calculateLowStockItems = useCallback((meds: Medicine[]): LowStockItem[] => {
    console.log('📊 Calculating low stock items from:', meds.length, 'medicines');
    
    const lowStockMeds = meds.filter(med => {
      const m = med as any;
      const stockQuantity = med.stockQuantity || m.stock_quantity || 0;
      const reorderLevel = med.reorderLevel || m.reorder_level || 10;
      const isActive = med.isActive !== false && m.active !== false;
      
      console.log('📦 Medicine:', med.name, {
        stockQuantity,
        reorderLevel,
        isActive,
        isLow: stockQuantity <= reorderLevel
      });
      
      return stockQuantity <= reorderLevel && isActive;
    });
    
    console.log('⚠️ Found low stock items:', lowStockMeds.length);
    
    return lowStockMeds
      .map(med => {
        const m = med as any;
        const currentStock = med.stockQuantity || m.stock_quantity || 0;
        const reorderLevel = med.reorderLevel || m.reorder_level || 10;
        const costPrice = med.costPrice || m.cost_price || 0;
        
        // Suggested quantity: enough to reach 3x reorder level
        const suggestedQty = Math.max(50, (reorderLevel * 3) - currentStock);
        
        return {
          medicineId: med.id,
          medicineName: med.name,
          currentStock,
          reorderLevel,
          suggestedQty,
          costPrice,
          orderQty: suggestedQty,
          totalPrice: suggestedQty * costPrice,
          selected: true,
        };
      })
      .sort((a, b) => (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel));
  }, []);

  // FIXED: fetchData function with proper medicine response handling
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching data for purchase orders...');
      
      const [ordersRes, suppliersRes, medicinesRes] = await Promise.all([
        purchaseOrderService.getAll(0, 1000),
        supplierService.getAll(0, 1000),
        medicineService.getAll(),
      ]);

      console.log('📋 Suppliers API Response:', suppliersRes);
      console.log('💊 Medicines API Response:', medicinesRes);

      // Handle suppliers response
      if (suppliersRes.success && suppliersRes.data) {
        const data = suppliersRes.data;
        let suppliersList: Supplier[] = [];
        
        if (data.content && Array.isArray(data.content)) {
          suppliersList = data.content;
        } else if (Array.isArray(data)) {
          suppliersList = data;
        } else if (data.data && Array.isArray(data.data)) {
          suppliersList = data.data;
        } else if (data.suppliers && Array.isArray(data.suppliers)) {
          suppliersList = data.suppliers;
        }
        
        // Transform backend snake_case to frontend camelCase
        const transformedSuppliers = suppliersList.map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person || supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          notes: supplier.notes,
          isActive: supplier.is_active !== false && supplier.active !== false,
          createdAt: supplier.created_at || supplier.createdAt,
          updatedAt: supplier.updated_at || supplier.updatedAt
        }));
        
        setSuppliers(transformedSuppliers);
        console.log('✅ Transformed suppliers:', transformedSuppliers.length, transformedSuppliers);
      } else {
        console.warn('❌ Suppliers response not successful:', suppliersRes);
        setSuppliers([]);
      }

      // Handle orders response
      if (ordersRes.success && ordersRes.data) {
        const data = ordersRes.data;
        let ordersList: any[] = [];
        
        if (data.content && Array.isArray(data.content)) {
          ordersList = data.content;
        } else if (Array.isArray(data)) {
          ordersList = data;
        } else if (data.data && Array.isArray(data.data)) {
          ordersList = data.data;
        } else if (data.orders && Array.isArray(data.orders)) {
          ordersList = data.orders;
        }
        
        // Transform orders if needed
        const transformedOrders = ordersList.map((order: any) => ({
          id: order.id,
          orderNumber: order.order_number || order.orderNumber,
          supplierId: order.supplier_id || order.supplierId,
          supplierName: order.supplier_name || order.supplierName,
          items: order.items || [],
          totalAmount: order.total_amount || order.totalAmount || order.total || 0,
          status: (order.status || 'draft').toLowerCase(),
          createdAt: order.created_at || order.createdAt,
          expectedDate: order.expected_delivery_date || order.expectedDate
        }));
        
        setOrders(transformedOrders as any);
      } else {
        console.warn('❌ Orders response not successful:', ordersRes);
        setOrders([]);
      }

      // FIXED: Handle medicines response
      if (medicinesRes.success && medicinesRes.data) {
        const medData = medicinesRes.data;
        let medsList: any[] = [];
        
        console.log('💊 Medicine response structure:', medData);
        
        // Handle various response structures
        if (Array.isArray(medData)) {
          medsList = medData;
        } else if (medData.content && Array.isArray(medData.content)) {
          medsList = medData.content;
        } else if (medData.data && Array.isArray(medData.data)) {
          medsList = medData.data;
        } else if (medData.medicines && Array.isArray(medData.medicines)) {
          medsList = medData.medicines;
        } else if (typeof medData === 'object' && medData !== null) {
          // If it's an object with nested data
          Object.keys(medData).forEach(key => {
            if (Array.isArray(medData[key])) {
              medsList = medData[key];
            }
          });
        }
        
        console.log('📦 Extracted medicines:', medsList.length, medsList);
        
        // Transform medicine data
        const transformedMeds: Medicine[] = medsList.map(med => ({
          id: med.id,
          name: med.name,
          genericName: med.generic_name || med.genericName,
          category: med.category,
          manufacturer: med.manufacturer,
          batchNumber: med.batch_number || med.batchNumber,
          expiryDate: med.expiry_date || med.expiryDate,
          units: med.units || [],
          stockQuantity: med.stock_quantity || med.stockQuantity || 0,
          reorderLevel: med.reorder_level || med.reorderLevel || 10,
          supplierId: med.supplier_id || med.supplierId,
          costPrice: med.cost_price || med.costPrice || 0,
          imageUrl: med.image_url || med.imageUrl,
          description: med.description,
          productType: med.product_type || med.productType,
          createdAt: med.created_at || med.createdAt,
          updatedAt: med.updated_at || med.updatedAt,
          isActive: med.is_active !== false && med.active !== false,
          active: med.active !== false,
          is_active: med.is_active !== false,
        }));
        
        console.log('✅ Transformed medicines:', transformedMeds.length);
        
        // Log first few medicines for debugging
        transformedMeds.slice(0, 5).forEach((med, i) => {
          console.log(`📦 Medicine ${i + 1}:`, med.name, {
            stockQuantity: med.stockQuantity,
            reorderLevel: med.reorderLevel,
            isLow: (med.stockQuantity || 0) <= (med.reorderLevel || 10)
          });
        });
        
        setMedicines(transformedMeds);
        
        // Calculate low stock items
        const calculatedLowStock = calculateLowStockItems(transformedMeds);
        console.log('⚠️ Calculated low stock items:', calculatedLowStock.length);
        setLowStockItems(calculatedLowStock);
        
        // Show toast if we found low stock items
        if (calculatedLowStock.length > 0) {
          console.log('🔴 Low stock items found:', calculatedLowStock.map(item => ({
            name: item.medicineName,
            current: item.currentStock,
            reorder: item.reorderLevel
          })));
        }
      } else {
        console.warn('❌ Medicines response not successful:', medicinesRes);
        setMedicines([]);
        setLowStockItems([]);
        toast({
          title: 'Medicines Error',
          description: 'Failed to load medicine data. Please check your medicine service.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
      setSuppliers([]);
      setOrders([]);
      setMedicines([]);
      setLowStockItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, calculateLowStockItems]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle item selection
  const toggleItemSelection = (medicineId: string) => {
    setLowStockItems(prev => 
      prev.map(item => 
        item.medicineId === medicineId 
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  // Update item quantity
  const updateItemQuantity = (medicineId: string, quantity: number) => {
    setLowStockItems(prev =>
      prev.map(item =>
        item.medicineId === medicineId
          ? { ...item, orderQty: quantity, totalPrice: quantity * item.costPrice }
          : item
      )
    );
  };

  // Update item cost price
  const updateItemCostPrice = (medicineId: string, costPrice: number) => {
    setLowStockItems(prev =>
      prev.map(item =>
        item.medicineId === medicineId
          ? { ...item, costPrice, totalPrice: item.orderQty * costPrice }
          : item
      )
    );
  };

  // Select/deselect all items
  const toggleSelectAll = (selected: boolean) => {
    setLowStockItems(prev => prev.map(item => ({ ...item, selected })));
  };

  // Get selected items
  const selectedItems = lowStockItems.filter(item => item.selected);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Generate PDF
  const handleGeneratePDF = () => {
    if (!selectedSupplier) {
      toast({
        title: 'Select Supplier',
        description: 'Please select a supplier before generating the order',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one item to order',
        variant: 'destructive',
      });
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) {
      toast({
        title: 'Supplier Not Found',
        description: 'Selected supplier not found in database',
        variant: 'destructive',
      });
      return;
    }

    const orderNumber = `PO-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const supplierInfo: SupplierInfo = {
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
    };

    const orderItems: OrderItem[] = selectedItems.map(item => ({
      medicineName: item.medicineName,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      suggestedQty: item.suggestedQty,
      orderQty: item.orderQty,
      costPrice: item.costPrice,
      totalPrice: item.totalPrice,
    }));

    generatePurchaseOrderPDF({
      orderNumber,
      orderDate: format(new Date(), 'MMMM dd, yyyy'),
      pharmacy: DEFAULT_PHARMACY,
      supplier: supplierInfo,
      items: orderItems,
      totalAmount,
    });

    toast({
      title: 'PDF Generated',
      description: 'Purchase order PDF has been generated. Use print dialog to save as PDF.',
    });
  };

  // Create and save order to backend
  const handleCreateOrder = async () => {
    if (!selectedSupplier || selectedItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a supplier and at least one item',
        variant: 'destructive',
      });
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) {
      toast({
        title: 'Error',
        description: 'Selected supplier not found',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const orderItems: PurchaseOrderItem[] = selectedItems.map(item => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.orderQty,
        unitPrice: item.costPrice,
        totalPrice: item.totalPrice,
      }));

      const response = await purchaseOrderService.create({
        supplierId: selectedSupplier,
        supplierName: supplier.name,
        items: orderItems,
        totalAmount,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (response.success) {
        toast({
          title: 'Order Created',
          description: `Purchase order for ${supplier.name} has been saved`,
        });
        setShowNewOrder(false);
        setSelectedSupplier('');
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create order',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.submit(id);
      if (response.success) {
        toast({ title: 'Order Submitted', description: 'The order has been submitted to the supplier' });
        fetchData();
      } else {
        toast({ title: 'Error', description: response.error || 'Failed to submit order', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit order', variant: 'destructive' });
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.approve(id);
      if (response.success) {
        toast({ title: 'Order Approved', description: 'The order has been approved' });
        fetchData();
      } else {
        toast({ title: 'Error', description: response.error || 'Failed to approve order', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to approve order', variant: 'destructive' });
    }
  };

  const handleReceiveOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.receive(id);
      if (response.success) {
        toast({ title: 'Order Received', description: 'The order has been marked as received' });
        fetchData();
      } else {
        toast({ title: 'Error', description: response.error || 'Failed to receive order', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to receive order', variant: 'destructive' });
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.cancel(id);
      if (response.success) {
        toast({ title: 'Order Cancelled', description: 'The order has been cancelled' });
        fetchData();
      } else {
        toast({ title: 'Error', description: response.error || 'Failed to cancel order', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel order', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'submitted':
      case 'sent':
        return <Badge variant="info"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'approved':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'received':
        return <Badge variant="success"><Package className="h-3 w-3 mr-1" />Received</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Purchase Orders</h1>
            <p className="text-muted-foreground mt-1">Create and manage supplier orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Create Purchase Order - Low Stock Items
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto space-y-4 py-4">
                  {/* Supplier Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Select Supplier
                      </h3>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              {isLoading ? 'Loading suppliers...' : 'No suppliers found'}
                            </div>
                          ) : (
                            suppliers.map((sup) => (
                              <SelectItem key={sup.id} value={sup.id}>
                                {sup.name} - {sup.city}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      
                      {selectedSupplier && (() => {
                        const supplier = suppliers.find(s => s.id === selectedSupplier);
                        return supplier && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-muted-foreground">Contact: {supplier.contactPerson || 'N/A'}</p>
                            <p className="text-muted-foreground">Tel: {supplier.phone || 'N/A'}</p>
                            <p className="text-muted-foreground">Email: {supplier.email || 'N/A'}</p>
                            <p className="text-muted-foreground">{supplier.address || 'N/A'}, {supplier.city || 'N/A'}</p>
                          </div>
                        );
                      })()}
                    </Card>
                    
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3">Pharmacy Details</h3>
                      <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                        <p className="font-medium">{DEFAULT_PHARMACY.name}</p>
                        <p className="text-muted-foreground">License: {DEFAULT_PHARMACY.licenseNo}</p>
                        <p className="text-muted-foreground">Tel: {DEFAULT_PHARMACY.phone}</p>
                        <p className="text-muted-foreground">Email: {DEFAULT_PHARMACY.email}</p>
                        <p className="text-muted-foreground">{DEFAULT_PHARMACY.address}</p>
                      </div>
                    </Card>
                  </div>

                  {/* Low Stock Items Alert */}
                  {lowStockItems.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-amber-800 dark:text-amber-200 font-medium">
                        {lowStockItems.length} items are below reorder level
                      </span>
                    </div>
                  )}

                  {/* Low Stock Items Table */}
                  {lowStockItems.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-muted flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={lowStockItems.every(item => item.selected)}
                            onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                          />
                          <span className="text-sm font-medium">Select All ({lowStockItems.length} items)</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {selectedItems.length} selected
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Medicine</TableHead>
                            <TableHead className="text-center">Current Stock</TableHead>
                            <TableHead className="text-center">Reorder Level</TableHead>
                            <TableHead className="text-center">Suggested Qty</TableHead>
                            <TableHead className="w-28">Order Qty</TableHead>
                            <TableHead className="w-32">Cost/Unit (KSh)</TableHead>
                            <TableHead className="text-right">Total (KSh)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockItems.map((item) => (
                            <TableRow 
                              key={item.medicineId}
                              className={item.selected ? 'bg-primary/5' : 'opacity-50'}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={item.selected}
                                  onCheckedChange={() => toggleItemSelection(item.medicineId)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{item.medicineName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={item.currentStock === 0 ? 'destructive' : 'warning'}>
                                  {item.currentStock}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{item.reorderLevel}</TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {item.suggestedQty}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.orderQty}
                                  onChange={(e) => updateItemQuantity(item.medicineId, parseInt(e.target.value) || 0)}
                                  className="w-24 h-8"
                                  disabled={!item.selected}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.costPrice}
                                  onChange={(e) => updateItemCostPrice(item.medicineId, parseFloat(e.target.value) || 0)}
                                  className="w-28 h-8"
                                  disabled={!item.selected}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.selected ? item.totalPrice.toLocaleString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      {medicines.length === 0 ? (
                        <>
                          <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground">No medicines found</p>
                          <p className="text-sm text-muted-foreground">Check your medicine service or add some medicines first</p>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground">All items are well stocked!</p>
                          <p className="text-sm text-muted-foreground">No items are below reorder level</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            (Total medicines: {medicines.length}, Reorder level check: {medicines.filter(m => (m.stockQuantity || 0) <= (m.reorderLevel || 10)).length} low stock)
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Order Summary */}
                  {selectedItems.length > 0 && (
                    <Card className="p-4 bg-primary/5 border-primary/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Order Summary</p>
                          <div className="flex items-baseline gap-4">
                            <span className="text-sm">{selectedItems.length} items</span>
                            <span className="text-sm">{selectedItems.reduce((sum, i) => sum + i.orderQty, 0).toLocaleString()} units</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-2xl font-bold text-primary">KSh {totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!selectedSupplier || selectedItems.length === 0}
                    onClick={handleGeneratePDF}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button
                    variant="hero"
                    disabled={!selectedSupplier || selectedItems.length === 0 || isSaving}
                    onClick={handleCreateOrder}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Save Order
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        {lowStockItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      {lowStockItems.length} items need reordering
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      These items are at or below their reorder levels
                    </p>
                  </div>
                </div>
                <Button variant="hero" size="sm" onClick={() => setShowNewOrder(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No purchase orders found</p>
                <p className="text-sm text-muted-foreground">Create your first order to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.orderNumber || order.id.substring(0, 12)}...
                        </TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>{order.items?.length || 0} items</TableCell>
                        <TableCell className="text-right font-medium">
                          KSh {(order.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setViewingOrder(order)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {order.status === 'DRAFT' && (
                              <Button variant="outline" size="sm" onClick={() => handleSubmitOrder(order.id)}>
                                <Send className="h-3 w-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {order.status === 'SUBMITTED' && (
                              <Button variant="outline" size="sm" onClick={() => handleApproveOrder(order.id)}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {order.status === 'APPROVED' && (
                              <Button variant="outline" size="sm" onClick={() => handleReceiveOrder(order.id)}>
                                <Package className="h-3 w-3 mr-1" />
                                Receive
                              </Button>
                            )}
                            {order.status === 'DRAFT' && (
                              <Button 
                                variant="ghost"
                                size="sm" 
                                className="text-destructive"
                                onClick={() => handleCancelOrder(order.id)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Purchase Order Details
              </DialogTitle>
            </DialogHeader>
            
            {viewingOrder && (
              <div className="space-y-4 py-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order Number</p>
                    <p className="font-mono font-medium">{viewingOrder.orderNumber || viewingOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {getStatusBadge(viewingOrder.status)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{viewingOrder.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {viewingOrder.createdAt ? format(new Date(viewingOrder.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  {viewingOrder.expectedDate && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">
                        {format(new Date(viewingOrder.expectedDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="font-medium mb-2">Order Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingOrder.items && viewingOrder.items.length > 0 ? (
                          viewingOrder.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.medicineName || 'Unknown Item'}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">KSh {(item.unitPrice || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">KSh {(item.totalPrice || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              No items in this order
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">
                      KSh {(viewingOrder.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewingOrder(null)} className="flex-1">
                    Close
                  </Button>
                  {viewingOrder.status === 'DRAFT' && (
                    <Button 
                      variant="hero" 
                      className="flex-1"
                      onClick={() => {
                        handleSubmitOrder(viewingOrder.id);
                        setViewingOrder(null);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Order
                    </Button>
                  )}
                  {viewingOrder.status === 'APPROVED' && (
                    <Button 
                      variant="hero" 
                      className="flex-1"
                      onClick={() => {
                        handleReceiveOrder(viewingOrder.id);
                        setViewingOrder(null);
                      }}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mark as Received
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}