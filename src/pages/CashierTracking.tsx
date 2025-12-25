import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSales } from '@/contexts/SalesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { Sale, UnitType } from '@/types/pharmacy';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  ShoppingCart,
  Calendar,
  Eye,
  Printer,
  Users,
  Banknote,
  Smartphone,
  CreditCard,
  Download,
  Wallet,
  Receipt,
  TrendingUp,
  User,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

import { getUnitLabel } from '@/types/pharmacy';

type Period = 'today' | 'week' | 'month' | 'all';

export default function CashierTracking() {
  const { getAllSales } = useSales();
  const { expenses } = useExpenses();
  const [period, setPeriod] = useState<Period>('today');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState('sales');

  const allSales = getAllSales();

  // Get unique cashiers from sales
  const cashiers = useMemo(() => {
    const cashierMap = new Map<string, { id: string; name: string }>();
    allSales.forEach((sale) => {
      if (!cashierMap.has(sale.cashierId)) {
        cashierMap.set(sale.cashierId, { id: sale.cashierId, name: sale.cashierName });
      }
    });
    return Array.from(cashierMap.values());
  }, [allSales]);

  // Get start date based on period
  const getStartDate = (periodType: Period): Date => {
    const now = new Date();
    switch (periodType) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      default:
        return new Date(0);
    }
  };

  // Filter sales based on period and cashier
  const filteredSales = useMemo(() => {
    const startDate = getStartDate(period);
    return allSales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      const matchesPeriod = isAfter(saleDate, startDate) || saleDate.getTime() === startDate.getTime();
      const matchesCashier = selectedCashier === 'all' || sale.cashierId === selectedCashier;
      return matchesPeriod && matchesCashier;
    });
  }, [period, selectedCashier, allSales]);

  // Filter cashier expenses
  const cashierExpenses = useMemo(() => {
    const startDate = getStartDate(period);
    const cashierExp = expenses.filter(e => e.createdByRole === 'cashier');
    return cashierExp.filter((exp) => {
      const expDate = new Date(exp.date);
      const matchesPeriod = isAfter(expDate, startDate) || expDate.getTime() === startDate.getTime();
      const selectedCashierName = cashiers.find(c => c.id === selectedCashier)?.name;
      const matchesCashier = selectedCashier === 'all' || exp.createdBy === selectedCashierName;
      return matchesPeriod && matchesCashier;
    });
  }, [period, selectedCashier, expenses, cashiers]);

  // Calculate cashier summaries
  const cashierSummaries = useMemo(() => {
    const summaries = new Map<string, {
      name: string;
      totalSales: number;
      cash: number;
      mpesa: number;
      card: number;
      transactions: number;
    }>();

    filteredSales.forEach((sale) => {
      const existing = summaries.get(sale.cashierId) || {
        name: sale.cashierName,
        totalSales: 0,
        cash: 0,
        mpesa: 0,
        card: 0,
        transactions: 0,
      };

      existing.totalSales += sale.total;
      existing.transactions += 1;
      
      if (sale.paymentMethod === 'cash') existing.cash += sale.total;
      else if (sale.paymentMethod === 'mpesa') existing.mpesa += sale.total;
      else if (sale.paymentMethod === 'card') existing.card += sale.total;

      summaries.set(sale.cashierId, existing);
    });

    return Array.from(summaries.entries()).map(([id, data]) => ({ id, ...data }));
  }, [filteredSales]);

  // Expense summaries by cashier
  const expensesByCashier = useMemo(() => {
    const summaries = new Map<string, { name: string; total: number; count: number }>();
    cashierExpenses.forEach((exp) => {
      const existing = summaries.get(exp.createdBy) || { name: exp.createdBy, total: 0, count: 0 };
      existing.total += exp.amount;
      existing.count += 1;
      summaries.set(exp.createdBy, existing);
    });
    return Array.from(summaries.values());
  }, [cashierExpenses]);

  // Overall stats
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCash = filteredSales.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const totalMpesa = filteredSales.filter((s) => s.paymentMethod === 'mpesa').reduce((sum, s) => sum + s.total, 0);
  const totalCard = filteredSales.filter((s) => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = filteredSales.length;
  const totalCashierExpenses = cashierExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="success" className="text-xs"><Banknote className="h-3 w-3 mr-1" />Cash</Badge>;
      case 'mpesa':
        return <Badge variant="info" className="text-xs"><Smartphone className="h-3 w-3 mr-1" />M-Pesa</Badge>;
      case 'card':
        return <Badge variant="secondary" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Card</Badge>;
      default:
        return <Badge className="text-xs">{method}</Badge>;
    }
  };

  const printReceipt = (sale: Sale) => {
    const receiptContent = `
========================================
         PHARMACY RECEIPT
========================================
Date: ${format(new Date(sale.createdAt), 'PPpp')}
Receipt #: ${sale.id}
Cashier: ${sale.cashierName}
----------------------------------------
ITEMS:
${sale.items.map(item => 
  `${item.medicineName}
   ${item.quantity} x ${getUnitLabel(item.unitType)} @ KSh ${item.unitPrice.toLocaleString()}
   Subtotal: KSh ${item.totalPrice.toLocaleString()}`
).join('\n')}
----------------------------------------
Subtotal: KSh ${sale.subtotal.toLocaleString()}
Discount: KSh ${sale.discount.toLocaleString()}
Tax: KSh ${sale.tax.toLocaleString()}
----------------------------------------
TOTAL: KSh ${sale.total.toLocaleString()}
Payment: ${sale.paymentMethod.toUpperCase()}
----------------------------------------
Customer: ${sale.customerName || 'Walk-in Customer'}
${sale.customerPhone ? `Phone: ${sale.customerPhone}` : ''}
========================================
       Thank you for your purchase!
========================================
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace;">${receiptContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Date', 'Receipt ID', 'Cashier', 'Items', 'Payment Method', 'Total'].join(','),
      ...filteredSales.map(sale => [
        format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm'),
        sale.id,
        sale.cashierName,
        sale.items.length,
        sale.paymentMethod,
        sale.total,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashier-tracking-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Cashier Tracking</h1>
            <p className="text-muted-foreground text-sm">Monitor sales, transactions & expenses by cashier</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportReport} className="w-fit">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-primary/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All Cashiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashiers.map(cashier => (
                      <SelectItem key={cashier.id} value={cashier.id}>{cashier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Total Sales</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-success">KSh {totalSales.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cash</span>
              </div>
              <p className="text-lg md:text-xl font-bold">KSh {totalCash.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4 text-info" />
                <span className="text-xs text-muted-foreground">M-Pesa</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-info">KSh {totalMpesa.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary/50 to-secondary/30 border-secondary/40">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-secondary-foreground" />
                <span className="text-xs text-muted-foreground">Card</span>
              </div>
              <p className="text-lg md:text-xl font-bold">KSh {totalCard.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Transactions</span>
              </div>
              <p className="text-lg md:text-xl font-bold">{totalTransactions}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Expenses</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-destructive">KSh {totalCashierExpenses.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="sales" className="flex-shrink-0">
              <TrendingUp className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Sales by </span>Cashier
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-shrink-0">
              <Receipt className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">All </span>Transactions
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-shrink-0">
              <Wallet className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Cashier </span>Expenses
            </TabsTrigger>
          </TabsList>

          {/* Sales by Cashier Tab */}
          <TabsContent value="sales" className="space-y-4 mt-4">
            {cashierSummaries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No sales found</p>
                  <p className="text-sm">No sales recorded for {getPeriodLabel().toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {cashierSummaries.map(summary => (
                  <Card key={summary.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{summary.name}</CardTitle>
                          <CardDescription className="text-xs">{summary.transactions} transactions</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="mb-3">
                        <span className="text-xs text-muted-foreground">Total Sales</span>
                        <p className="text-xl md:text-2xl font-bold text-success">KSh {summary.totalSales.toLocaleString()}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-success/10 text-center">
                          <p className="text-sm md:text-base font-bold text-success">KSh {summary.cash.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Cash</p>
                        </div>
                        <div className="p-2 rounded-lg bg-info/10 text-center">
                          <p className="text-sm md:text-base font-bold text-info">KSh {summary.mpesa.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">M-Pesa</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-sm md:text-base font-bold">KSh {summary.card.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Card</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">Transaction History - {getPeriodLabel()}</CardTitle>
                <CardDescription className="text-xs">All transactions for selected period</CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Receipt</TableHead>
                          <TableHead className="text-xs">Cashier</TableHead>
                          <TableHead className="text-xs">Customer</TableHead>
                          <TableHead className="text-xs text-center">Items</TableHead>
                          <TableHead className="text-xs">Payment</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSales.map(sale => (
                            <TableRow key={sale.id}>
                              <TableCell className="text-xs whitespace-nowrap">
                                {format(new Date(sale.createdAt), 'MMM dd, HH:mm')}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{sale.id.slice(0, 8)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{sale.cashierName}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{sale.customerName || 'Walk-in'}</TableCell>
                              <TableCell className="text-center text-xs">{sale.items.length}</TableCell>
                              <TableCell>{getPaymentBadge(sale.paymentMethod)}</TableCell>
                              <TableCell className="text-right font-semibold text-sm">
                                KSh {sale.total.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(sale)}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => printReceipt(sale)}>
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4 mt-4">
            {/* Expense Summary Cards */}
            {expensesByCashier.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No cashier expenses</p>
                  <p className="text-sm">No expenses recorded for {getPeriodLabel().toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {expensesByCashier.map(cashier => (
                    <Card key={cashier.name} className="border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-destructive/10">
                            <Wallet className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{cashier.name}</p>
                            <p className="text-lg font-bold text-destructive">KSh {cashier.total.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{cashier.count} expense(s)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Expenses Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Expense Records - {getPeriodLabel()}</CardTitle>
                    <CardDescription className="text-xs">Included in profit calculations</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 md:p-6 md:pt-0">
                    <ScrollArea className="w-full">
                      <div className="min-w-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Cashier</TableHead>
                              <TableHead className="text-xs">Category</TableHead>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cashierExpenses.map(expense => (
                              <TableRow key={expense.id}>
                                <TableCell className="text-xs">{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{expense.createdBy}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate">{expense.description}</TableCell>
                                <TableCell className="text-right font-semibold text-destructive">
                                  KSh {expense.amount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Sale Details Dialog */}
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span>Sale Details</span>
                {selectedSale && (
                  <Button variant="outline" size="sm" onClick={() => printReceipt(selectedSale)}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>Transaction receipt and item details</DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Receipt ID</p>
                    <p className="font-mono font-semibold text-xs">{selectedSale.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="font-semibold text-xs">{format(new Date(selectedSale.createdAt), 'PPp')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cashier</p>
                    <p className="font-semibold text-sm">{selectedSale.cashierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <div className="mt-0.5">{getPaymentBadge(selectedSale.paymentMethod)}</div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Items</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-secondary/50 rounded-lg text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x {getUnitLabel(item.unitType)} @ KSh {item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                        <p className="font-semibold ml-2">KSh {item.totalPrice.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KSh {selectedSale.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-KSh {selectedSale.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span className="text-success">KSh {selectedSale.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t pt-2 text-xs text-muted-foreground">
                  <p><strong>Served by:</strong> {selectedSale.cashierName}</p>
                  <p><strong>Customer:</strong> {selectedSale.customerName || 'Walk-in Customer'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}