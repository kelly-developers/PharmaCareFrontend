import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Medicine } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';
import { purchaseOrderService } from '@/services/purchaseOrderService';
import { supplierService } from '@/services/supplierService';
import { medicineService } from '@/services/medicineService';
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
} from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseOrders() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch data from backend
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, suppliersRes, medicinesRes] = await Promise.all([
        purchaseOrderService.getAll(),
        supplierService.getActive(),
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
        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      }

      if (medicinesRes.success && medicinesRes.data) {
        const medData = medicinesRes.data;
        if (Array.isArray(medData)) {
          setMedicines(medData);
        } else if ((medData as any).content) {
          setMedicines((medData as any).content);
        } else {
          setMedicines([]);
        }
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItemToOrder = (medicineId: string) => {
    const medicine = medicines.find((m) => m.id === medicineId);
    if (!medicine) return;

    setOrderItems((prev) => {
      const exists = prev.find((item) => item.medicineId === medicineId);
      if (exists) return prev;

      return [
        ...prev,
        {
          medicineId,
          medicineName: medicine.name,
          quantity: 100,
          unitPrice: medicine.costPrice,
          totalPrice: 100 * medicine.costPrice,
        },
      ];
    });
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      updated[index].totalPrice = quantity * updated[index].unitPrice;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCreateOrder = async () => {
    if (!selectedSupplier || orderItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a supplier and add items',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const supplier = suppliers.find((s) => s.id === selectedSupplier);
      const response = await purchaseOrderService.create({
        supplierId: selectedSupplier,
        supplierName: supplier?.name || '',
        items: orderItems,
        totalAmount,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      });

      if (response.success && response.data) {
        toast({
          title: 'Purchase Order Created',
          description: `Order for ${supplier?.name} - Total: KSh ${totalAmount.toLocaleString()}`,
        });
        setShowNewOrder(false);
        setOrderItems([]);
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto space-y-4 py-4">
                  {/* Supplier Selection */}
                  <div className="space-y-2">
                    <Label>Select Supplier</Label>
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
                  </div>

                  {/* Medicine Selection */}
                  <div className="space-y-2">
                    <Label>Add Medicines</Label>
                    <Select onValueChange={addItemToOrder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medicine to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((med) => (
                          <SelectItem key={med.id} value={med.id}>
                            {med.name} - KSh {med.costPrice}/unit
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Order Items */}
                  {orderItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Medicine</TableHead>
                            <TableHead className="w-32">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item, index) => (
                            <TableRow key={item.medicineId}>
                              <TableCell>{item.medicineName}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell className="text-right">KSh {item.unitPrice}</TableCell>
                              <TableCell className="text-right font-medium">
                                KSh {item.totalPrice.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">
                              Total Amount:
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              KSh {totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    disabled={!selectedSupplier || orderItems.length === 0 || isSaving}
                    onClick={handleCreateOrder}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Create Order
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                            {order.status === 'received' && null}
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
