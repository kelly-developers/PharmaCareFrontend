import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSales } from '@/contexts/SalesContext';
import { Sale, getUnitLabel } from '@/types/pharmacy';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  ShoppingCart,
  Eye,
  Printer,
  Banknote,
  Smartphone,
  CreditCard,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MySales() {
  const { user } = useAuth();
  const { cashierTodaySales, isLoading, refreshCashierTodaySales } = useSales();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const cashierId = user?.id || '';

  // Fetch today's sales for current cashier
  const fetchTodaySales = useCallback(async () => {
    if (!cashierId) return;
    
    try {
      const sales = await refreshCashierTodaySales(cashierId);
      if (sales && sales.length > 0) {
        console.log(`Loaded ${sales.length} sales for today`);
      }
    } catch (error) {
      console.error('Failed to fetch today sales:', error);
      toast.error('Failed to load today\'s sales');
    }
  }, [cashierId, refreshCashierTodaySales]);

  // Initial fetch on component mount
  useEffect(() => {
    if (cashierId) {
      fetchTodaySales();
    }
  }, [cashierId, fetchTodaySales]);

  // Calculate daily stats from cashierTodaySales
  const todaySales = cashierTodaySales || [];
  const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const cashSales = todaySales.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const mpesaSales = todaySales.filter((s) => s.paymentMethod === 'mpesa').reduce((sum, s) => sum + s.total, 0);
  const cardSales = todaySales.filter((s) => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const transactionCount = todaySales.length;

  // Count transactions by payment method
  const cashTransactions = todaySales.filter((s) => s.paymentMethod === 'cash').length;
  const mpesaTransactions = todaySales.filter((s) => s.paymentMethod === 'mpesa').length;
  const cardTransactions = todaySales.filter((s) => s.paymentMethod === 'card').length;

  // Calculate average sale
  const averageSale = transactionCount > 0 ? totalSales / transactionCount : 0;

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="success"><Banknote className="h-3 w-3 mr-1" />Cash</Badge>;
      case 'mpesa':
        return <Badge variant="info"><Smartphone className="h-3 w-3 mr-1" />M-Pesa</Badge>;
      case 'card':
        return <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-1" />Card</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const handleRefresh = async () => {
    await fetchTodaySales();
    toast.success('Sales data refreshed');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">My Daily Sales</h1>
            <p className="text-muted-foreground mt-1">
              Today's sales summary • {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Daily Stats - Consolidated */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Today's Total</p>
                  <p className="text-2xl font-bold">KSh {totalSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{transactionCount} transaction(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <Banknote className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Cash Sales</p>
                  <p className="text-2xl font-bold">KSh {cashSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{cashTransactions} transaction(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-info/10">
                  <Smartphone className="h-6 w-6 text-info" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">M-Pesa Sales</p>
                  <p className="text-2xl font-bold">KSh {mpesaSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{mpesaTransactions} transaction(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary/50 border-secondary">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <CreditCard className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Card Sales</p>
                  <p className="text-2xl font-bold">KSh {cardSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{cardTransactions} transaction(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Average Sale</p>
                  <p className="text-2xl font-bold">KSh {averageSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground">Per transaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Today's Transactions
                <Badge variant="outline" className="ml-2">
                  {todaySales.length}
                </Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Total: KSh {totalSales.toLocaleString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && todaySales.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading today's sales...</p>
              </div>
            ) : todaySales.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No sales yet today</p>
                <p className="text-sm">Start selling to see your transactions here</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for new sales
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount (KSh)</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaySales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono font-medium text-sm">{sale.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.customerName || 'Walk-in'}</p>
                            {sale.customerPhone && (
                              <p className="text-xs text-muted-foreground">{sale.customerPhone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{sale.items.length} item(s)</p>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          KSh {sale.total.toLocaleString()}
                        </TableCell>
                        <TableCell>{getPaymentBadge(sale.paymentMethod)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(sale.createdAt), 'HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSale(sale)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
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

      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Sale Details</span>
              <Button variant="outline" size="sm" onClick={printReceipt}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4 pt-4 text-sm">
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-lg">PharmaPOS Kenya</h2>
                <p className="text-xs text-muted-foreground">Your Health Partner</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(selectedSale.createdAt), 'PPP p')}
                </p>
                <p className="text-xs font-mono">{selectedSale.id}</p>
              </div>
              
              {/* Customer Info */}
              <div className="border-b pb-2">
                <p className="text-xs"><strong>Customer:</strong> {selectedSale.customerName || 'Walk-in'}</p>
                {selectedSale.customerPhone && (
                  <p className="text-xs"><strong>Phone:</strong> {selectedSale.customerPhone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="flex-1">
                      {item.medicineName} ({getUnitLabel(item.unitType)}) x{item.quantity}
                    </span>
                    <span className="font-medium">KSh {item.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Subtotal</span>
                  <span>KSh {selectedSale.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>KSh {selectedSale.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Method</span>
                  <span className="uppercase">{selectedSale.paymentMethod}</span>
                </div>
              </div>
              
              <div className="border-t pt-2 text-xs text-muted-foreground">
                <p><strong>Served by:</strong> {selectedSale.cashierName}</p>
                <p className="text-center mt-4">Thank you for shopping with us!</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
