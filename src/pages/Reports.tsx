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
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { exportToPDF } from '@/utils/pdfExport';
import { reportService } from '@/services/reportService';

// Define TypeScript interfaces for your actual data
interface SaleItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  profit: number;
}

interface SaleTransaction {
  id: string;
  cashier_name: string;
  total_amount: string;
  final_amount: string;
  profit: number;
  payment_method: string;
  created_at: string;
  items: SaleItem[];
}

interface InventoryData {
  costValue: number;
  retailValue: number;
  totalUnits: number;
  potentialProfit: number;
}

interface MonthlyStockMovement {
  year: number;
  month: number;
  totalAdditions: number;
  totalSales: number;
  netChange: number;
}

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [annualView, setAnnualView] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  
  // State for reports data - REAL DATA STRUCTURE
  const [reportsData, setReportsData] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    inventoryValue: 0,
    expensesByCategory: [] as { category: string; amount: number }[],
    salesTransactions: [] as SaleTransaction[],
    inventoryData: {} as InventoryData,
    stockMovement: {} as MonthlyStockMovement,
  });

  // Chart data derived from real transactions
  const [chartData, setChartData] = useState({
    dailySalesData: [] as { day: string; sales: number; cost: number }[],
    monthlyTrendData: [] as { month: string; sales: number }[],
    categoryData: [] as { name: string; value: number; color: string }[],
  });

  // Annual tracking data
  const [annualData, setAnnualData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    monthlyBreakdown: [] as { month: string; revenue: number; profit: number; transactions: number }[],
  });

  const [isLoading, setIsLoading] = useState(false);

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

  // Process sales transactions to extract data for charts
  const processSalesData = (transactions: SaleTransaction[]) => {
    if (!transactions.length) return;

    // 1. Process daily sales data (last 7 days)
    const dailyData: { [key: string]: { sales: number; cost: number } } = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'EEE');
    }).reverse();

    // Initialize with zeros
    last7Days.forEach(day => {
      dailyData[day] = { sales: 0, cost: 0 };
    });

    // Calculate sales and cost for each transaction
    transactions.forEach(transaction => {
      const day = format(new Date(transaction.created_at), 'EEE');
      const sales = parseFloat(transaction.final_amount);
      
      // Calculate cost from items
      let cost = 0;
      transaction.items.forEach(item => {
        cost += (item.cost_price * item.quantity);
      });

      if (dailyData[day]) {
        dailyData[day].sales += sales;
        dailyData[day].cost += cost;
      }
    });

    const dailySalesData = last7Days.map(day => ({
      day,
      sales: dailyData[day]?.sales || 0,
      cost: dailyData[day]?.cost || 0
    }));

    // 2. Process monthly trend data (last 6 months)
    const monthlyData: { [key: string]: number } = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return format(date, 'MMM');
    }).reverse();

    // Group transactions by month
    transactions.forEach(transaction => {
      const month = format(new Date(transaction.created_at), 'MMM');
      const sales = parseFloat(transaction.final_amount);
      
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += sales;
    });

    const monthlyTrendData = last6Months.map(month => ({
      month,
      sales: monthlyData[month] || 0
    }));

    // 3. Process category data
    const categoryMap: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      transaction.items.forEach(item => {
        // Extract category from medicine name or use generic
        const category = item.medicine_name.includes('Tablets') ? 'Pain Relief' :
                        item.medicine_name.includes('Syrup') ? 'Liquids' :
                        item.medicine_name.includes('Capsules') ? 'Capsules' :
                        'Others';
        
        if (!categoryMap[category]) {
          categoryMap[category] = 0;
        }
        categoryMap[category] += parseFloat(item.subtotal.toString());
      });
    });

    const categoryColors = [
      'hsl(158, 64%, 32%)', // Pain Relief - green
      'hsl(199, 89%, 48%)', // Antibiotics - blue
      'hsl(38, 92%, 50%)',  // Vitamins - orange
      'hsl(142, 71%, 45%)', // First Aid - light green
      'hsl(215, 16%, 47%)', // Others - gray
    ];

    const totalSales = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);
    const categoryData = Object.entries(categoryMap).map(([name, value], index) => ({
      name,
      value: totalSales > 0 ? Math.round((value / totalSales) * 100) : 0,
      color: categoryColors[index % categoryColors.length]
    }));

    setChartData({
      dailySalesData,
      monthlyTrendData,
      categoryData: categoryData.length > 0 ? categoryData : [
        { name: 'Pain Relief', value: 35, color: 'hsl(158, 64%, 32%)' },
        { name: 'Antibiotics', value: 25, color: 'hsl(199, 89%, 48%)' },
        { name: 'Vitamins', value: 20, color: 'hsl(38, 92%, 50%)' },
        { name: 'First Aid', value: 15, color: 'hsl(142, 71%, 45%)' },
        { name: 'Others', value: 5, color: 'hsl(215, 16%, 47%)' },
      ]
    });
  };

  // Fetch reports data from backend
  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
      
      // Fetch real data from your backend endpoints
      // Based on your screenshot, you have multiple API responses
      // Let's fetch them one by one
      
      // 1. Fetch sales transactions (from your screenshot data)
      const salesResponse = await reportService.getSalesSummary(startDate, endDate);
      const salesData = salesResponse.data?.content || [];
      
      // 2. Fetch inventory value
      const inventoryResponse = await reportService.getInventoryValue();
      const inventoryData = inventoryResponse.data || {};
      
      // 3. Fetch stock movement
      const stockMovementResponse = await reportService.getMonthlyBreakdown();
      const stockMovement = stockMovementResponse.data || {};
      
      // 4. Calculate totals from sales transactions
      let totalRevenue = 0;
      let totalCOGS = 0;
      let totalProfit = 0;
      
      salesData.forEach((transaction: SaleTransaction) => {
        totalRevenue += parseFloat(transaction.final_amount);
        totalProfit += transaction.profit || 0;
        
        // Calculate COGS from items
        transaction.items.forEach(item => {
          totalCOGS += (item.cost_price * item.quantity);
        });
      });
      
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = totalProfit;
      
      const newData = {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses: 0, // You'll need to fetch expenses separately
        netProfit,
        inventoryValue: inventoryData.costValue || 0,
        expensesByCategory: [],
        salesTransactions: salesData,
        inventoryData: inventoryData,
        stockMovement: stockMovement,
      };

      setReportsData(newData);
      
      // Process chart data from sales transactions
      processSalesData(salesData);
      
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch annual income data
  const fetchAnnualData = async () => {
    try {
      const response = await reportService.getAnnualSummary();
      const responseData = response.data?.data || response.data;
      
      if (responseData) {
        const monthlyData = responseData.monthlyBreakdown?.map((item: any) => ({
          month: format(new Date().setMonth(item.month - 1), 'MMM'),
          revenue: item.revenue || 0,
          profit: item.profit || 0,
          transactions: item.transactions || 0
        })) || [];
        
        setAnnualData({
          totalRevenue: responseData.totalRevenue || 0,
          totalProfit: responseData.totalProfit || 0,
          totalTransactions: responseData.totalTransactions || 0,
          monthlyBreakdown: monthlyData
        });
      }
    } catch (error) {
      console.error('Failed to fetch annual data:', error);
    }
  };

  // Fetch data when period or date range changes
  useEffect(() => {
    fetchReportsData();
    fetchAnnualData();
  }, [period]);

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
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="annual" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Annual
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

          {/* Annual Tab */}
          <TabsContent value="annual" className="space-y-4 md:space-y-6">
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Annual Income Tracking - {new Date().getFullYear()}
                  </CardTitle>
                  <Tabs value={annualView} onValueChange={(v) => setAnnualView(v as any)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
                      <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                      <TabsTrigger value="annual" className="text-xs px-3">Annual</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {/* Annual Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-success" />
                      <span className="text-xs text-muted-foreground">Total Revenue</span>
                    </div>
                    <p className="text-xl font-bold text-success">KSh {annualData.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Profit</span>
                    </div>
                    <p className="text-xl font-bold text-primary">KSh {annualData.totalProfit.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBag className="h-4 w-4 text-info" />
                      <span className="text-xs text-muted-foreground">Total Transactions</span>
                    </div>
                    <p className="text-xl font-bold text-info">{annualData.totalTransactions.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-4 w-4 text-warning" />
                      <span className="text-xs text-muted-foreground">Avg. Transaction</span>
                    </div>
                    <p className="text-xl font-bold text-warning">
                      KSh {annualData.totalTransactions > 0 ? 
                        (annualData.totalRevenue / annualData.totalTransactions).toFixed(2) : 
                        '0.00'
                      }
                    </p>
                  </div>
                </div>

                {/* Monthly Revenue & Profit Chart */}
                {annualData.monthlyBreakdown.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={annualData.monthlyBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `KSh ${value.toLocaleString()}`,
                            name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Transactions'
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="revenue" fill="hsl(158, 64%, 32%)" radius={[4, 4, 0, 0]} name="Revenue" />
                        <Bar dataKey="profit" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <p>No annual data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div id="reports-overview">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                <StatCard
                  title="Total Revenue"
                  value={`KSh ${reportsData.totalRevenue.toLocaleString()}`}
                  icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-success/10 text-success"
                />
                <StatCard
                  title="Cost of Goods"
                  value={`KSh ${reportsData.totalCOGS.toLocaleString()}`}
                  icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-warning/10 text-warning"
                />
                <StatCard
                  title="Gross Profit"
                  value={`KSh ${reportsData.grossProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-primary/10 text-primary"
                />
                <StatCard
                  title="Net Profit"
                  value={`KSh ${reportsData.netProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName={reportsData.netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
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
                        <BarChart data={chartData.dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      Revenue Trend (Last 6 Months)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 md:h-72">
                      {chartData.monthlyTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                          <p>No revenue data available for trend analysis</p>
                        </div>
                      )}
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
                      {chartData.categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={60}
                              dataKey="value"
                              labelLine={false}
                            >
                              {chartData.categoryData.map((entry, index) => (
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
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <p>No category data available</p>
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
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.inventoryValue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reportsData.inventoryData?.retailValue ? 
                            `Retail: KSh ${reportsData.inventoryData.retailValue.toLocaleString()}` : 
                            ''
                          }
                        </p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reportsData.salesTransactions.length} transactions
                        </p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Cost of Goods Sold</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalCOGS.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalExpenses.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-xs md:text-sm text-success">Gross Profit</p>
                        <p className="text-lg md:text-2xl font-bold text-success">KSh {reportsData.grossProfit.toLocaleString()}</p>
                        <p className="text-xs text-success mt-1">
                          Margin: {reportsData.totalRevenue > 0 ? 
                            `${((reportsData.grossProfit / reportsData.totalRevenue) * 100).toFixed(1)}%` : 
                            '0%'
                          }
                        </p>
                      </div>
                      <div className={`p-3 md:p-4 rounded-lg ${reportsData.netProfit >= 0 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        <p className={`text-xs md:text-sm ${reportsData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>Net Profit</p>
                        <p className={`text-lg md:text-2xl font-bold ${reportsData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          KSh {reportsData.netProfit.toLocaleString()}
                        </p>
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
                revenue={reportsData.totalRevenue}
                cogs={reportsData.totalCOGS}
                grossProfit={reportsData.grossProfit}
                expenses={reportsData.expensesByCategory}
                totalExpenses={reportsData.totalExpenses}
                netProfit={reportsData.netProfit}
              />
            </div>
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance">
            <div id="balance-sheet" className="max-w-2xl mx-auto">
              <BalanceSheet
                asOfDate={new Date()}
                cashBalance={reportsData.netProfit}
                accountsReceivable={0}
                inventoryValue={reportsData.inventoryValue}
                totalAssets={reportsData.inventoryValue + reportsData.netProfit}
                accountsPayable={0}
                totalLiabilities={0}
                retainedEarnings={reportsData.netProfit}
                totalEquity={reportsData.inventoryValue + reportsData.netProfit}
              />
            </div>
          </TabsContent>

          {/* Cash Flow Statement Tab */}
          <TabsContent value="cashflow">
            <div id="cash-flow-statement" className="max-w-2xl mx-auto">
              <CashFlowStatement
                period={period}
                dateRange={dateRange}
                salesCashInflow={reportsData.totalRevenue}
                inventoryPurchases={reportsData.totalCOGS}
                operatingExpenses={reportsData.totalExpenses}
                netOperatingCashFlow={reportsData.netProfit}
                netCashFlow={reportsData.netProfit}
                openingCashBalance={0}
                closingCashBalance={reportsData.netProfit}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}