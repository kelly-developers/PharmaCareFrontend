import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { demoMedicines, demoSuppliers } from '@/data/medicines';
import { PurchaseOrderItem } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { format } from 'date-fns';

// Demo orders
const demoOrders = [
  {
    id: 'PO-2024-001',
    supplierId: 'sup1',
    supplierName: 'PharmaCare Distributors',
    items: [
      { medicineId: 'med1', medicineName: 'Paracetamol 500mg', quantity: 1000, unitPrice: 3, totalPrice: 3000 },
      { medicineId: 'med2', medicineName: 'Amoxicillin 250mg', quantity: 500, unitPrice: 10, totalPrice: 5000 },
    ],
    status: 'sent' as const,
    totalAmount: 8000,
    createdAt: new Date('2024-01-15'),
    expectedDate: new Date('2024-01-20'),
  },
  {
    id: 'PO-2024-002',
    supplierId: 'sup2',
    supplierName: 'MediKenya Supplies',
    items: [
      { medicineId: 'med3', medicineName: 'Omeprazole 20mg', quantity: 300, unitPrice: 12, totalPrice: 3600 },
    ],
    status: 'received' as const,
    totalAmount: 3600,
    createdAt: new Date('2024-01-10'),
    expectedDate: new Date('2024-01-15'),
  },
];

export default function PurchaseOrders() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const { toast } = useToast();

  const addItemToOrder = (medicineId: string) => {
    const medicine = demoMedicines.find((m) => m.id === medicineId);
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

  const generatePDF = () => {
    const supplier = demoSuppliers.find((s) => s.id === selectedSupplier);
    if (!supplier) return;

    // In a real app, this would generate an actual PDF
    toast({
      title: 'Purchase Order Generated',
      description: `PDF created for ${supplier.name} - Total: KSh ${totalAmount.toLocaleString()}`,
    });
    
    setShowNewOrder(false);
    setOrderItems([]);
    setSelectedSupplier('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge variant="info"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'received':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
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
                  <label className="text-sm font-medium">Select Supplier</label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoSuppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name} - {sup.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Medicine Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Medicines</label>
                  <Select onValueChange={addItemToOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoMedicines.map((med) => (
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
                  disabled={!selectedSupplier || orderItems.length === 0}
                  onClick={generatePDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  {demoOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.id}</TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell className="text-right font-medium">
                        KSh {order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{format(order.createdAt, 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
