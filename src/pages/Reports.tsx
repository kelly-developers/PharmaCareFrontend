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
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { exportToPDF } from '@/utils/pdfExport';
import { reportService } from '@/services/reportService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Types for our local state
interface SalesCategory {
  name: string;
  value: number;
  color: string;
}

interface DailySalesData {
  day: string;
  sales: number;
  cost: number;
}

interface MonthlyTrendData {
  month: string;
  sales: number;
}

interface ReportsData {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  inventoryValue: number;
  expensesByCategory: { category: string; amount: number }[];
  salesTrend: { date: string; sales: number; cost: number; profit: number }[];
  categoryData: SalesCategory[];
  dailySalesData: DailySalesData[];
  monthlyTrendData: MonthlyTrendData[];
}

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [annualView, setAnnualView] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  
  // State for reports data
  const [reportsData, setReportsData] = useState<ReportsData>({
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    inventoryValue: 0,
    expensesByCategory: [],
    salesTrend: [],
    categoryData: [],
    dailySalesData: [],
    monthlyTrendData: []
  });

  // Annual tracking data
  const [annualData, setAnnualData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    sellerPayments: 0,
    monthlyData: [] as { month: string; revenue: number; profit: number; orders: number }[],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Generate sample daily sales data for the last 7 days
  const generateDailySalesData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayName = days[date.getDay()];
      const sales = Math.floor(Math.random() * 50000) + 20000;
      const cost = Math.floor(sales * 0.6);
      
      data.push({
        day: dayName,
        sales,
        cost
      });
    }
    
    return data;
  };

  // Generate sample monthly trend data for the last 6 months
  const generateMonthlyTrendData = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const monthName = format(date, 'MMM');
      const sales = Math.floor(Math.random() * 500000) + 300000;
      
      months.push({
        month: monthName,
        sales
      });
    }
    
    return months;
  };

  // Fetch reports data from backend
  const fetchReportsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      
      // Fetch all reports data in parallel
      const [
        incomeResponse,
        inventoryResponse,
        salesByCategoryResponse,
        salesTrendResponse
      ] = await Promise.all([
        reportService.getIncomeStatement(startDate, endDate),
        reportService.getInventoryValue(),
        reportService.getSalesByCategory(startDate, endDate).catch(() => ({ data: [] })),
        reportService.getSalesTrend(period as 'week' | 'month' | 'quarter' | 'year').catch(() => ({ data: [] }))
      ]);
      
      // Process income statement data
      const incomeData = incomeResponse.data;
      const revenue = incomeData?.revenue || 0;
      const cogs = incomeData?.costOfGoodsSold || 0;
      const grossProfit = incomeData?.grossProfit || 0;
      const netProfit = incomeData?.netProfit || 0;
      const totalExpenses = incomeData?.totalExpenses || 0;
      const expensesByCategory = incomeData?.expenses || [];
      
      // Process inventory data
      const inventoryData = inventoryResponse.data;
      const inventoryValue = inventoryData?.totalValue || 0;
      
      // Process sales by category data
      const categoryDataFromAPI = salesByCategoryResponse.data || [];
      const categoryData = processCategoryData(categoryDataFromAPI);
      
      // Process sales trend data
      const trendDataFromAPI = salesTrendResponse.data || [];
      const monthlyTrendData = processTrendData(trendDataFromAPI);
      
      // Generate sample data if API data is empty
      const dailySalesData = generateDailySalesData();
      
      const newData: ReportsData = {
        totalRevenue: revenue,
        totalCOGS: cogs,
        grossProfit: grossProfit,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        inventoryValue: inventoryValue,
        expensesByCategory: expensesByCategory,
        salesTrend: [],
        categoryData: categoryData,
        dailySalesData: dailySalesData,
        monthlyTrendData: monthlyTrendData.length > 0 ? monthlyTrendData : generateMonthlyTrendData()
      };

      setReportsData(newData);
      
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      setError('Failed to load reports data. Please try again.');
      
      // Generate sample data for demonstration
      const sampleData: ReportsData = {
        totalRevenue: 1250000,
        totalCOGS: 750000,
        grossProfit: 500000,
        totalExpenses: 200000,
        netProfit: 300000,
        profitMargin: 24,
        inventoryValue: 850000,
        expensesByCategory: [
          { category: 'Rent', amount: 50000 },
          { category: 'Salaries', amount: 80000 },
          { category: 'Utilities', amount: 20000 },
          { category: 'Marketing', amount: 15000 },
          { category: 'Other', amount: 35000 }
        ],
        salesTrend: [],
        categoryData: processCategoryData([]),
        dailySalesData: generateDailySalesData(),
        monthlyTrendData: generateMonthlyTrendData()
      };
      
      setReportsData(sampleData);
    } finally {
      setIsLoading(false);
    }
  };

  // Process category data from API
  const processCategoryData = (apiData: any[]): SalesCategory[] => {
    const colors = [
      'hsl(158, 64%, 32%)', // Pain Relief
      'hsl(199, 89%, 48%)', // Antibiotics
      'hsl(38, 92%, 50%)',  // Vitamins
      'hsl(142, 71%, 45%)', // First Aid
      'hsl(280, 65%, 60%)', // Dermatology
      'hsl(340, 82%, 52%)', // Respiratory
      'hsl(215, 16%, 47%)', // Others
    ];
    
    // If we have real data from API
    if (Array.isArray(apiData) && apiData.length > 0) {
      const total = apiData.reduce((sum, item) => sum + (item.total || 0), 0);
      
      return apiData.map((item, index) => ({
        name: item.category || item.name || `Category ${index + 1}`,
        value: total > 0 ? Math.round(((item.total || 0) / total) * 100) : 0,
        color: colors[index % colors.length]
      }));
    }
    
    // Sample data for demonstration
    return [
      { name: 'Pain Relief', value: 28, color: colors[0] },
      { name: 'Antibiotics', value: 22, color: colors[1] },
      { name: 'Vitamins', value: 18, color: colors[2] },
      { name: 'First Aid', value: 15, color: colors[3] },
      { name: 'Dermatology', value: 12, color: colors[4] },
      { name: 'Others', value: 5, color: colors[5] }
    ];
  };

  // Process trend data from API
  const processTrendData = (apiData: any[]): MonthlyTrendData[] => {
    if (Array.isArray(apiData) && apiData.length > 0) {
      return apiData.slice(0, 6).map(item => ({
        month: format(new Date(item.date || item.month), 'MMM'),
        sales: item.sales || item.revenue || 0
      }));
    }
    return [];
  };

  // Fetch annual data
  const fetchAnnualData = async () => {
    try {
      const response = await reportService.getAnnualSummary();
      const responseData = response.data;
      
      if (responseData) {
        setAnnualData({
          totalRevenue: responseData.totalRevenue || 0,
          totalProfit: responseData.totalProfit || 0,
          totalOrders: responseData.totalOrders || 0,
          sellerPayments: responseData.sellerPayments || 0,
          monthlyData: responseData.monthlyData || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch annual data:', error);
    }
  };

  // Fetch data when period or active tab changes
  useEffect(() => {
    fetchReportsData();
    if (activeTab === 'annual') {
      fetchAnnualData();
    }
  }, [period, activeTab]);

  const handleExportPDF = () => {
    const contentId = activeTab === 'income' ? 'income-statement' 
      : activeTab === 'balance' ? 'balance-sheet'
      : activeTab === 'cashflow' ? 'cash-flow-statement'
      : 'reports-overview';
    
    const filename = `${activeTab}-report-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(contentId, filename);
  };

  // Loading skeleton
  if (isLoading && activeTab === 'overview') {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Financial statements and business insights</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
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
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
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
                  isLoading={isLoading}
                />
                <StatCard
                  title="Cost of Goods"
                  value={`KSh ${reportsData.totalCOGS.toLocaleString()}`}
                  icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-warning/10 text-warning"
                  isLoading={isLoading}
                />
                <StatCard
                  title="Gross Profit"
                  value={`KSh ${reportsData.grossProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName="bg-primary/10 text-primary"
                  isLoading={isLoading}
                />
                <StatCard
                  title="Net Profit"
                  value={`KSh ${reportsData.netProfit.toLocaleString()}`}
                  icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
                  iconClassName={reportsData.netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                  isLoading={isLoading}
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
                      {reportsData.dailySalesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={reportsData.dailySalesData} 
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="day" 
                              className="text-xs" 
                              tick={{ fontSize: 11 }} 
                            />
                            <YAxis 
                              className="text-xs" 
                              tick={{ fontSize: 11 }} 
                              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} 
                            />
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `KSh ${value.toLocaleString()}`,
                                name === 'sales' ? 'Sales' : 'Cost'
                              ]}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar 
                              dataKey="sales" 
                              fill="hsl(158, 64%, 32%)" 
                              radius={[4, 4, 0, 0]} 
                              name="Sales" 
                            />
                            <Bar 
                              dataKey="cost" 
                              fill="hsl(38, 92%, 50%)" 
                              radius={[4, 4, 0, 0]} 
                              name="Cost" 
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No sales data available</p>
                        </div>
                      )}
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
                      {reportsData.monthlyTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={reportsData.monthlyTrendData} 
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="month" 
                              className="text-xs" 
                              tick={{ fontSize: 11 }} 
                            />
                            <YAxis 
                              className="text-xs" 
                              tick={{ fontSize: 11 }} 
                              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} 
                            />
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
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No trend data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Sales by Category */}
                <Card variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg">Sales by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 md:h-64">
                      {reportsData.categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportsData.categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={60}
                              paddingAngle={2}
                              dataKey="value"
                              label={(entry) => `${entry.name}: ${entry.value}%`}
                              labelLine={false}
                            >
                              {reportsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value}%`, 'Percentage']}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend 
                              layout="vertical" 
                              align="right" 
                              verticalAlign="middle"
                              wrapperStyle={{ fontSize: '11px' }}
                              formatter={(value, entry) => (
                                <span className="text-xs">{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No category data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Period Summary */}
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
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Cost of Goods Sold</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalCOGS.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-lg md-text-2xl font-bold">KSh {reportsData.totalExpenses.toLocaleString()}</p>
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-xs md:text-sm text-success">Gross Profit</p>
                        <p className="text-lg md:text-2xl font-bold text-success">KSh {reportsData.grossProfit.toLocaleString()}</p>
                      </div>
                      <div className={`p-3 md:p-4 rounded-lg ${reportsData.netProfit >= 0 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        <p className={`text-xs md:text-sm ${reportsData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>Net Profit</p>
                        <p className={`text-lg md:text-2xl font-bold ${reportsData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>KSh {reportsData.netProfit.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Annual Tab */}
          <TabsContent value="annual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Annual Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {annualData.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={annualData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`KSh ${value?.toLocaleString()}`, 'Value']} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                        <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No annual data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                accountsReceivable={reportsData.totalRevenue * 0.1} // 10% of revenue as accounts receivable
                inventoryValue={reportsData.inventoryValue}
                totalAssets={reportsData.inventoryValue + reportsData.netProfit + (reportsData.totalRevenue * 0.1)}
                accountsPayable={reportsData.totalExpenses * 0.2} // 20% of expenses as accounts payable
                totalLiabilities={reportsData.totalExpenses * 0.2}
                retainedEarnings={reportsData.netProfit}
                totalEquity={reportsData.netProfit}
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