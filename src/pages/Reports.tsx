import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Download,
  FileText,
  BarChart3,
  Wallet,
  ArrowDownUp,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useSales } from '@/contexts/SalesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useStock } from '@/contexts/StockContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, isWithinInterval, subMonths, subDays } from 'date-fns';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { exportToPDF } from '@/utils/pdfExport';

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const { sales } = useSales();
  const { expenses } = useExpenses();
  const { medicines } = useStock();

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const dateRange = getDateRange();

  // Filter sales by period
  const filteredSales = useMemo(() => {
    const { start, end } = dateRange;
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return isWithinInterval(saleDate, { start, end });
    });
  }, [sales, period]);

  // Filter expenses by period
  const filteredExpenses = useMemo(() => {
    const { start, end } = dateRange;
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return isWithinInterval(expDate, { start, end });
    });
  }, [expenses, period]);

  // Calculate totals
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCOGS = filteredSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const medicine = medicines.find(m => m.id === item.medicineId);
      return itemSum + ((medicine?.costPrice || item.costPrice || 0) * item.quantity);
    }, 0);
  }, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    return Object.entries(categories).map(([category, amount]) => ({ category, amount }));
  }, [filteredExpenses]);

  // Calculate inventory value
  const inventoryValue = medicines.reduce((sum, med) => sum + (med.costPrice * med.stockQuantity), 0);

  // Calculate daily sales data for chart
  const dailySalesData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    
    return days.map(day => {
      const dayStr = format(day, 'EEE');
      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return format(saleDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      const salesTotal = daySales.reduce((sum, sale) => sum + sale.total, 0);
      const costTotal = daySales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const medicine = medicines.find(m => m.id === item.medicineId);
          return itemSum + ((medicine?.costPrice || item.costPrice || 0) * item.quantity);
        }, 0);
      }, 0);

      return { day: dayStr, sales: salesTotal, cost: costTotal };
    });
  }, [sales, medicines]);

  // Calculate monthly trend data
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
      });
      
      const total = monthSales.reduce((sum, sale) => sum + sale.total, 0);
      return { month: format(month, 'MMM'), sales: total };
    });
  }, [sales]);

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const medicine = medicines.find(m => m.id === item.medicineId);
        const category = medicine?.category || 'Unknown';
        categoryTotals[category] = (categoryTotals[category] || 0) + (item.unitPrice * item.quantity);
      });
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const colors = [
      'hsl(158, 64%, 32%)',
      'hsl(199, 89%, 48%)',
      'hsl(38, 92%, 50%)',
      'hsl(142, 71%, 45%)',
      'hsl(215, 16%, 47%)',
    ];

    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value: total > 0 ? Math.round((value / total) * 100) : 0,
        color: colors[index % colors.length],
      }))
      .slice(0, 5);
  }, [filteredSales, medicines]);

  const handleExportPDF = () => {
    const contentId = activeTab === 'income' ? 'income-statement' 
      : activeTab === 'balance' ? 'balance-sheet'
      : activeTab === 'cashflow' ? 'cash-flow-statement'
      : 'reports-overview';
    
    const filename = `${activeTab}-report-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(contentId, filename);
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Financial statements and business insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs for different reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              P&L
            </TabsTrigger>
            <TabsTrigger value="balance" className="text-xs sm:text-sm">
              <Wallet className="h-4 w-4 mr-1 hidden sm:inline" />
              Balance
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">
              <ArrowDownUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Cash Flow
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div id="reports-overview">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                <StatCard
                  title="Total Revenue"
                  value={`KSh ${totalRevenue.toLocaleString()}`}
                  icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-success/10 text-success"
                />
                <StatCard
                  title="Cost of Goods"
                  value={`KSh ${totalCOGS.toLocaleString()}`}
                  icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-warning/10 text-warning"
                />
                <StatCard
                  title="Gross Profit"
                  value={`KSh ${grossProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-primary/10 text-primary"
                />
                <StatCard
                  title="Net Profit"
                  value={`KSh ${netProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName={netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                {/* Daily Sales vs Cost */}
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <FileText className="h-4 w-4 md:h-5 md:w-5" />
                      Daily Sales vs Cost (Last 7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 md:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 11 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                          <Tooltip
                            formatter={(value: number, name: string) => [`KSh ${value.toLocaleString()}`, name === 'sales' ? 'Sales' : 'Cost']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="sales" fill="hsl(158, 64%, 32%)" radius={[4, 4, 0, 0]} name="Sales" />
                          <Bar dataKey="cost" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Cost" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Revenue Trend */}
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                      Revenue Trend (6 Months)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 md:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                          <Tooltip
                            formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Revenue']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="sales"
                            stroke="hsl(158, 64%, 32%)"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(158, 64%, 32%)', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Sales by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 md:h-64">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={60}
                              dataKey="value"
                              labelLine={false}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Legend 
                              layout="vertical" 
                              align="right" 
                              verticalAlign="middle"
                              wrapperStyle={{ fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No sales data for this period
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated" className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">
                      Period Summary - {period === 'week' ? 'This Week' : period === 'month' ? format(new Date(), 'MMMM yyyy') : period === 'quarter' ? 'This Quarter' : 'This Year'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Inventory Value</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {inventoryValue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Cost of Goods Sold</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {totalCOGS.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {totalExpenses.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-xs md:text-sm text-success">Gross Profit</p>
                        <p className="text-lg md:text-2xl font-bold text-success">KSh {grossProfit.toLocaleString()}</p>
                      </div>
                      <div className={`p-3 md:p-4 rounded-lg ${netProfit >= 0 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        <p className={`text-xs md:text-sm ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>Net Profit</p>
                        <p className={`text-lg md:text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>KSh {netProfit.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Income Statement Tab */}
          <TabsContent value="income">
            <div id="income-statement" className="max-w-2xl mx-auto">
              <IncomeStatement
                period={period}
                dateRange={dateRange}
                revenue={totalRevenue}
                cogs={totalCOGS}
                grossProfit={grossProfit}
                expenses={expensesByCategory}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
              />
            </div>
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance">
            <div id="balance-sheet" className="max-w-2xl mx-auto">
              <BalanceSheet
                asOfDate={new Date()}
                cashBalance={totalRevenue - totalCOGS - totalExpenses}
                accountsReceivable={0}
                inventoryValue={inventoryValue}
                totalAssets={inventoryValue + (totalRevenue - totalCOGS - totalExpenses)}
                accountsPayable={0}
                totalLiabilities={0}
                retainedEarnings={netProfit}
                totalEquity={inventoryValue + netProfit}
              />
            </div>
          </TabsContent>

          {/* Cash Flow Statement Tab */}
          <TabsContent value="cashflow">
            <div id="cash-flow-statement" className="max-w-2xl mx-auto">
              <CashFlowStatement
                period={period}
                dateRange={dateRange}
                salesCashInflow={totalRevenue}
                inventoryPurchases={totalCOGS}
                operatingExpenses={totalExpenses}
                netOperatingCashFlow={totalRevenue - totalCOGS - totalExpenses}
                netCashFlow={netProfit}
                openingCashBalance={0}
                closingCashBalance={netProfit}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
