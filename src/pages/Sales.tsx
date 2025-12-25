import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { useSales } from '@/contexts/SalesContext';
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
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Download,
  Eye,
  Users,
  RefreshCw,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function Sales() {
  const [period, setPeriod] = useState('today');
  const [cashierFilter, setCashierFilter] = useState('all');
  const { getAllSales, fetchAllSales, isLoading } = useSales();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allSales = getAllSales();

  // Get unique cashiers
  const cashiers = useMemo(() => {
    const uniqueCashiers = new Map();
    allSales.forEach(sale => {
      if (!uniqueCashiers.has(sale.cashierId)) {
        uniqueCashiers.set(sale.cashierId, sale.cashierName);
      }
    });
    return Array.from(uniqueCashiers, ([id, name]) => ({ id, name }));
  }, [allSales]);

  // Filter sales by period and cashier
  const filteredSales = useMemo(() => {
    const now = new Date();
    
    return allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      
      // Period filter
      let matchesPeriod = true;
      switch (period) {
        case 'today':
          matchesPeriod = isAfter(saleDate, startOfDay(now));
          break;
        case 'week':
          matchesPeriod = isAfter(saleDate, startOfWeek(now));
          break;
        case 'month':
          matchesPeriod = isAfter(saleDate, startOfMonth(now));
          break;
        case 'year':
          matchesPeriod = saleDate.getFullYear() === now.getFullYear();
          break;
        default:
          matchesPeriod = true;
      }
      
      // Cashier filter
      const matchesCashier = cashierFilter === 'all' || sale.cashierId === cashierFilter;
      
      return matchesPeriod && matchesCashier;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allSales, period, cashierFilter]);

  // Calculate stats
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const transactionCount = filteredSales.length;
  const avgTransaction = transactionCount > 0 ? Math.round(totalSales / transactionCount) : 0;

  // Calculate by payment method
  const byPaymentMethod = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredSales]);

  // Calculate by cashier
  const byCashier = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      if (!acc[sale.cashierId]) {
        acc[sale.cashierId] = { name: sale.cashierName, total: 0, count: 0 };
      }
      acc[sale.cashierId].total += sale.total;
      acc[sale.cashierId].count += 1;
      return acc;
    }, {} as Record<string, { name: string; total: number; count: number }>);
  }, [filteredSales]);

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="success">Cash</Badge>;
      case 'mpesa':
        return <Badge variant="info">M-Pesa</Badge>;
      case 'card':
        return <Badge variant="secondary">Card</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return "Today's";
      case 'week': return "This Week's";
      case 'month': return "This Month's";
      case 'year': return "This Year's";
      default: return '';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllSales();
      toast.success('Sales data refreshed');
    } catch (error) {
      toast.error('Failed to refresh sales data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchAllSales();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Sales</h1>
            <p className="text-muted-foreground mt-1">Track and manage your sales</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger className="w-40">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Cashiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashiers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={`${getPeriodLabel()} Total Sales`}
            value={`KSh ${totalSales.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Transactions"
            value={transactionCount.toString()}
            icon={<ShoppingCart className="h-6 w-6" />}
            iconClassName="bg-info/10 text-info"
          />
          <StatCard
            title="Avg. Transaction"
            value={`KSh ${avgTransaction.toLocaleString()}`}
            icon={<TrendingUp className="h-6 w-6" />}
            iconClassName="bg-primary/10 text-primary"
          />
        </div>

        {/* Payment Method Breakdown & Cashier Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Badge variant="success">Cash</Badge>
                  </span>
                  <span className="font-semibold">KSh {(byPaymentMethod.cash || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Badge variant="info">M-Pesa</Badge>
                  </span>
                  <span className="font-semibold">KSh {(byPaymentMethod.mpesa || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">Card</Badge>
                  </span>
                  <span className="font-semibold">KSh {(byPaymentMethod.card || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Cashier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(byCashier).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sales data</p>
                ) : (
                  Object.entries(byCashier).map(([id, data]) => (
                    <div key={id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{data.name}</p>
                        <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                      </div>
                      <span className="font-semibold">KSh {data.total.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <div className="text-sm text-muted-foreground">
              Total {filteredSales.length} transactions
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading sales data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No sales found for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono font-medium text-xs">
                            {sale.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sale.customerName || 'Walk-in'}</p>
                              {sale.customerPhone && (
                                <p className="text-xs text-muted-foreground">{sale.customerPhone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="truncate text-sm">
                                {sale.items.map((i) => `${i.medicineName} x${i.quantity}`).join(', ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sale.items.length} item(s)
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            KSh {sale.total.toLocaleString()}
                          </TableCell>
                          <TableCell>{getPaymentBadge(sale.paymentMethod)}</TableCell>
                          <TableCell>{sale.cashierName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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