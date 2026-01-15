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
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  subDays,
  subMonths,
  parseISO,
  isSameDay,
  isSameMonth,
  isSameYear
} from 'date-fns';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { exportToPDF } from '@/utils/pdfExport';
import { reportService } from '@/services/reportService';
import { salesService } from '@/services/salesService';
import { Skeleton } from '@/components/ui/skeleton';

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for reports data
  const [reportsData, setReportsData] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    inventoryValue: 0,
    expensesByCategory: [] as { category: string; amount: number }[],
    categoryData: [] as { name: string; value: number; color: string }[],
    dailySalesData: [] as { day: string; date: Date; sales: number; cost: number; profit: number }[],
    monthlyTrendData: [] as { month: string; date: Date; sales: number; profit: number }[]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [allSales, setAllSales] = useState<any[]>([]);

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { 
          start: startOfWeek(now), 
          end: endOfWeek(now),
          display: 'This Week'
        };
      case 'month':
        return { 
          start: startOfMonth(now), 
          end: endOfMonth(now),
          display: format(now, 'MMMM yyyy')
        };
      case 'quarter':
        return { 
          start: startOfQuarter(now), 
          end: endOfQuarter(now),
          display: 'This Quarter'
        };
      case 'year':
        return { 
          start: startOfYear(now), 
          end: endOfYear(now),
          display: 'This Year'
        };
      default:
        return { 
          start: startOfMonth(now), 
          end: endOfMonth(now),
          display: format(now, 'MMMM yyyy')
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch all sales data
  const fetchAllSales = async () => {
    try {
      // Fetch sales for the last 6 months for trend data
      const sixMonthsAgo = subMonths(new Date(), 6);
      const response = await salesService.getAll({
        startDate: format(sixMonthsAgo, 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      });
      
      if (response.success && response.data) {
        setAllSales(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      return [];
    }
  };

  // Process daily sales data for last 7 days
  const processDailySalesData = (sales: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        day: format(date, 'EEE'),
        date: date,
        sales: 0,
        cost: 0,
        profit: 0
      };
    });

    // Group sales by day
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dayIndex = last7Days.findIndex(day => 
        isSameDay(day.date, saleDate)
      );
      
      if (dayIndex !== -1) {
        last7Days[dayIndex].sales += sale.total || 0;
        // Calculate cost from sale items
        const cost = sale.items?.reduce((sum: number, item: any) => {
          return sum + ((item.costPrice || 0) * (item.quantity || 0));
        }, 0) || 0;
        last7Days[dayIndex].cost += cost;
        last7Days[dayIndex].profit += (sale.total || 0) - cost;
      }
    });

    return last7Days;
  };

  // Process monthly trend data for last 6 months
  const processMonthlyTrendData = (sales: any[]) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM'),
        date: startOfMonth(date),
        sales: 0,
        profit: 0
      };
    });

    // Group sales by month
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const monthIndex = last6Months.findIndex(month => 
        isSameMonth(month.date, saleDate)
      );
      
      if (monthIndex !== -1) {
        last6Months[monthIndex].sales += sale.total || 0;
        // Calculate profit
        const cost = sale.items?.reduce((sum: number, item: any) => {
          return sum + ((item.costPrice || 0) * (item.quantity || 0));
        }, 0) || 0;
        last6Months[monthIndex].profit += (sale.total || 0) - cost;
      }
    });

    return last6Months;
  };

  // Process sales by category data
  const processCategoryData = (sales: any[]) => {
    const categoryMap = new Map<string, { sales: number; count: number }>();
    
    // Define colors for categories
    const colors = [
      'hsl(158, 64%, 32%)', // Green
      'hsl(199, 89%, 48%)', // Blue
      'hsl(38, 92%, 50%)',  // Orange
      'hsl(142, 71%, 45%)', // Light Green
      'hsl(215, 16%, 47%)', // Gray
      'hsl(280, 65%, 60%)', // Purple
      'hsl(340, 82%, 52%)', // Pink
    ];

    // Aggregate sales by category from medicine names
    sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        // Extract category from medicine name or use default
        let category = 'Other';
        const medicineName = item.medicineName || '';
        
        if (medicineName.toLowerCase().includes('pain') || 
            medicineName.toLowerCase().includes('paracetamol') ||
            medicineName.toLowerCase().includes('ibuprofen')) {
          category = 'Pain Relief';
        } else if (medicineName.toLowerCase().includes('antibiotic') ||
                  medicineName.toLowerCase().includes('amoxicillin') ||
                  medicineName.toLowerCase().includes('ciprofloxacin')) {
          category = 'Antibiotics';
        } else if (medicineName.toLowerCase().includes('vitamin') ||
                  medicineName.toLowerCase().includes('multivitamin')) {
          category = 'Vitamins';
        } else if (medicineName.toLowerCase().includes('first aid') ||
                  medicineName.toLowerCase().includes('bandage') ||
                  medicineName.toLowerCase().includes('gauze')) {
          category = 'First Aid';
        } else if (medicineName.toLowerCase().includes('cough') ||
                  medicineName.toLowerCase().includes('cold')) {
          category = 'Cough & Cold';
        } else if (medicineName.toLowerCase().includes('antacid') ||
                  medicineName.toLowerCase().includes('digestive')) {
          category = 'Digestive';
        }
        
        const current = categoryMap.get(category) || { sales: 0, count: 0 };
        current.sales += item.totalPrice || 0;
        current.count += 1;
        categoryMap.set(category, current);
      });
    });

    // Convert to array and calculate percentages
    const categoriesArray = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      sales: data.sales,
      count: data.count
    }));

    const totalSales = categoriesArray.reduce((sum, cat) => sum + cat.sales, 0);
    
    // Create category data for pie chart
    const categoryData = categoriesArray
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 7) // Top 7 categories
      .map((cat, index) => ({
        name: cat.name,
        value: totalSales > 0 ? Math.round((cat.sales / totalSales) * 100) : 0,
        color: colors[index % colors.length],
        sales: cat.sales
      }));

    return categoryData;
  };

  // Calculate totals for the selected period
  const calculatePeriodTotals = (sales: any[]) => {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalProfit = 0;

    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      if (saleDate >= dateRange.start && saleDate <= dateRange.end) {
        totalRevenue += sale.total || 0;
        
        // Calculate COGS from sale items
        const saleCost = sale.items?.reduce((sum: number, item: any) => {
          return sum + ((item.costPrice || 0) * (item.quantity || 0));
        }, 0) || 0;
        
        totalCOGS += saleCost;
        totalProfit += (sale.total || 0) - saleCost;
      }
    });

    return {
      totalRevenue,
      totalCOGS,
      grossProfit: totalProfit,
      netProfit: totalProfit // For now, net profit is same as gross profit (before expenses)
    };
  };

  // Fetch all reports data
  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      // Fetch sales data first
      const sales = await fetchAllSales();
      
      // Process all the data
      const dailySalesData = processDailySalesData(sales);
      const monthlyTrendData = processMonthlyTrendData(sales);
      const categoryData = processCategoryData(sales);
      const periodTotals = calculatePeriodTotals(sales);
      
      // Fetch additional data from backend
      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');
      
      const [incomeResponse, inventoryResponse] = await Promise.all([
        reportService.getIncomeStatement(startDate, endDate),
        reportService.getInventoryValue()
      ]);

      const incomeData = incomeResponse.data as any;
      const inventoryData = inventoryResponse.data as any;

      // Calculate expenses
      const expenses = incomeData?.operatingExpenses?.total || incomeData?.totalExpenses || 0;
      const netProfit = periodTotals.grossProfit - expenses;

      setReportsData({
        totalRevenue: periodTotals.totalRevenue,
        totalCOGS: periodTotals.totalCOGS,
        grossProfit: periodTotals.grossProfit,
        totalExpenses: expenses,
        netProfit: netProfit,
        profitMargin: periodTotals.totalRevenue > 0 ? (netProfit / periodTotals.totalRevenue) * 100 : 0,
        inventoryValue: inventoryData?.totalValue || inventoryData?.costValue || 0,
        expensesByCategory: incomeData?.operatingExpenses?.breakdown || [],
        categoryData: categoryData,
        dailySalesData: dailySalesData,
        monthlyTrendData: monthlyTrendData
      });

    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      // Use sample data as fallback
      setReportsData({
        ...reportsData,
        categoryData: [
          { name: 'Pain Relief', value: 35, color: 'hsl(158, 64%, 32%)' },
          { name: 'Antibiotics', value: 25, color: 'hsl(199, 89%, 48%)' },
          { name: 'Vitamins', value: 20, color: 'hsl(38, 92%, 50%)' },
          { name: 'First Aid', value: 15, color: 'hsl(142, 71%, 45%)' },
          { name: 'Others', value: 5, color: 'hsl(215, 16%, 47%)' },
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when period changes
  useEffect(() => {
    fetchReportsData();
  }, [period]);

  const handleExportPDF = () => {
    const contentId = activeTab === 'income' ? 'income-statement' 
      : activeTab === 'balance' ? 'balance-sheet'
      : activeTab === 'cashflow' ? 'cash-flow-statement'
      : 'reports-overview';
    
    const filename = `${activeTab}-report-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(contentId, filename);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Reports & Analytics</h1>
              <p className="text-muted-foreground text-sm mt-1">Financial statements and business insights</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading reports data...</span>
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
                                name === 'sales' ? 'Sales' : name === 'cost' ? 'Cost' : 'Profit'
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
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No sales data available for the last 7 days
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
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No trend data available
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
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {reportsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => {
                                const sales = props.payload.sales;
                                return [
                                  `${value}% (KSh ${sales?.toLocaleString() || 0})`,
                                  props.payload.name
                                ];
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No category data available
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
                      </div>
                      <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-lg md:text-2xl font-bold">KSh {reportsData.totalRevenue.toLocaleString()}</p>
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