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

// Default pharmacy info - in real app this would come from settings/context
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
  const { toast } = useToast();

  // Calculate low stock items from medicines
  const calculateLowStockItems = useCallback((meds: Medicine[]): LowStockItem[] => {
    return meds
      .filter(med => med.stockQuantity <= med.reorderLevel && med.isActive !== false)
      .map(med => {
        // Suggested quantity: enough to reach 3x reorder level
        const suggestedQty = Math.max(50, (med.reorderLevel * 3) - med.stockQuantity);
        return {
          medicineId: med.id,
          medicineName: med.name,
          currentStock: med.stockQuantity,
          reorderLevel: med.reorderLevel,
          suggestedQty,
          costPrice: med.costPrice || 0,
          orderQty: suggestedQty,
          totalPrice: suggestedQty * (med.costPrice || 0),
          selected: true,
        };
      })
      .sort((a, b) => (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel));
  }, []);

  // Fetch data from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, suppliersRes, medicinesRes] = await Promise.all([
        purchaseOrderService.getAll(1, 1000),
        supplierService.getAll(1, 1000),
        medicineService.getAll(),
      ]);

      if (ordersRes.success && ordersRes.data) {
        const data = ordersRes.data;
        if (Array.isArray(data)) {
          setOrders(data);
        } else if ((data as any).content) {
          setOrders((data as any).content);
        } else {
          setOrders([]);
        }
      }

      if (suppliersRes.success && suppliersRes.data) {
        const data = suppliersRes.data;
        let suppliersList: Supplier[] = [];
        if (Array.isArray(data)) {
          suppliersList = data;
        } else if ((data as any).content) {
          suppliersList = (data as any).content;
        } else if ((data as any).data) {
          suppliersList = (data as any).data;
        } else if ((data as any).suppliers) {
          suppliersList = (data as any).suppliers;
        }
        setSuppliers(suppliersList);
      }

      if (medicinesRes.success && medicinesRes.data) {
        const medData = medicinesRes.data;
        let medsList: Medicine[] = [];
        if (Array.isArray(medData)) {
          medsList = medData;
        } else if ((medData as any).content) {
          medsList = (medData as any).content;
        }
        setMedicines(medsList);
        setLowStockItems(calculateLowStockItems(medsList));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
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
    if (!supplier) return;

    const orderNumber = `PO-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const supplierInfo: SupplierInfo = {
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
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

    setIsSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      const orderItems: PurchaseOrderItem[] = selectedItems.map(item => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: item.orderQty,
        unitPrice: item.costPrice,
        totalPrice: item.totalPrice,
      }));

      const response = await purchaseOrderService.create({
        supplierId: selectedSupplier,
        supplierName: supplier?.name || '',
        items: orderItems,
        totalAmount,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (response.success) {
        toast({
          title: 'Order Created',
          description: `Purchase order for ${supplier?.name} has been saved`,
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
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order',
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
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit order', variant: 'destructive' });
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.approve(id);
      if (response.success) {
        toast({ title: 'Order Approved', description: 'The order has been approved' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve order', variant: 'destructive' });
    }
  };

  const handleReceiveOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.receive(id);
      if (response.success) {
        toast({ title: 'Order Received', description: 'The order has been marked as received' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to receive order', variant: 'destructive' });
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      const response = await purchaseOrderService.cancel(id);
      if (response.success) {
        toast({ title: 'Order Cancelled', description: 'The order has been cancelled' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel order', variant: 'destructive' });
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
                          {suppliers.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.name} - {sup.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedSupplier && (() => {
                        const supplier = suppliers.find(s => s.id === selectedSupplier);
                        return supplier && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-muted-foreground">Contact: {supplier.contactPerson}</p>
                            <p className="text-muted-foreground">Tel: {supplier.phone}</p>
                            <p className="text-muted-foreground">Email: {supplier.email}</p>
                            <p className="text-muted-foreground">{supplier.address}, {supplier.city}</p>
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
                      <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">All items are well stocked!</p>
                      <p className="text-sm text-muted-foreground">No items are below reorder level</p>
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
                          {order.id.substring(0, 12)}...
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
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {order.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => handleSubmitOrder(order.id)}>
                                <Send className="h-3 w-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {order.status === 'sent' && (
                              <Button variant="outline" size="sm" onClick={() => handleApproveOrder(order.id)}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {(order.status as string) === 'approved' && (
                              <Button variant="outline" size="sm" onClick={() => handleReceiveOrder(order.id)}>
                                <Package className="h-3 w-3 mr-1" />
                                Receive
                              </Button>
                            )}
                            {order.status === 'draft' && (
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
      </div>
    </MainLayout>
  );
}
