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
import { useState, useMemo, useEffect } from 'react';
import { useSales } from '@/contexts/SalesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useStock } from '@/contexts/StockContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { exportToPDF } from '@/utils/pdfExport';
import { reportService } from '@/services/reportService';

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [annualView, setAnnualView] = useState<'daily' | 'monthly' | 'annual'>('monthly');
  
  // State for reports data - FIXED: Proper structure with numeric values
  const [reportsData, setReportsData] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    inventoryValue: 0,
    expensesByCategory: [] as { category: string; amount: number }[],
    salesTrend: [] as { date: string; sales: number; cost: number; profit: number }[],
    categoryData: [] as { name: string; value: number; color: string }[],
    dailySalesData: [] as { day: string; sales: number; cost: number }[],
    monthlyTrendData: [] as { month: string; sales: number }[]
  });

  // Annual tracking data - FIXED: Ensure numeric values
  const [annualData, setAnnualData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    sellerPayments: 0,
    monthlyData: [] as { month: string; revenue: number; profit: number; orders: number }[],
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

  // Fetch reports data from backend - FIXED: Proper API response parsing
  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
      
      // Fetch all reports data
      const incomeResponse = await reportService.getIncomeStatement(startDate, endDate);
      const inventoryResponse = await reportService.getInventoryValue();
      const salesByCategoryResponse = await reportService.getSalesByCategory(startDate, endDate);
      
      // FIXED: Parse the actual response structure from your backend
      const incomeData = incomeResponse.data as any;
      const inventoryData = inventoryResponse.data as any;
      
      // FIXED: Extract numeric values from the response
      const revenue = typeof incomeData?.revenue === 'object' 
        ? incomeData?.revenue?.netSales || incomeData?.revenue?.grossSales || 0 
        : incomeData?.revenue || 0;
        
      const cogs = incomeData?.costOfGoodsSold || 0;
      const grossProfit = incomeData?.grossProfit || 0;
      const netProfit = incomeData?.netIncome || incomeData?.netProfit || 0;
      const expenses = incomeData?.operatingExpenses?.total || incomeData?.totalExpenses || 0;

      // Parse sales by category data
      const categoryDataFromAPI = salesByCategoryResponse.data as any;
      let categoryData: { name: string; value: number; color: string }[] = [];
      
      const defaultColors = [
        'hsl(158, 64%, 32%)',
        'hsl(199, 89%, 48%)',
        'hsl(38, 92%, 50%)',
        'hsl(142, 71%, 45%)',
        'hsl(215, 16%, 47%)',
        'hsl(280, 65%, 60%)',
        'hsl(340, 82%, 52%)',
      ];
      
      if (categoryDataFromAPI && Array.isArray(categoryDataFromAPI) && categoryDataFromAPI.length > 0) {
        const totalCategorySales = categoryDataFromAPI.reduce((sum: number, c: any) => sum + (c.total || c.value || 0), 0);
        categoryData = categoryDataFromAPI.slice(0, 7).map((cat: any, idx: number) => ({
          name: cat.category || cat.name || 'Other',
          value: totalCategorySales > 0 ? Math.round(((cat.total || cat.value || 0) / totalCategorySales) * 100) : 0,
          color: defaultColors[idx % defaultColors.length],
        }));
      }
      
      const newData = {
        totalRevenue: revenue,
        totalCOGS: cogs,
        grossProfit: grossProfit,
        totalExpenses: expenses,
        netProfit: netProfit,
        profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        inventoryValue: inventoryData?.costValue || inventoryData?.totalValue || 0,
        expensesByCategory: incomeData?.operatingExpenses?.breakdown || [],
        salesTrend: [],
        categoryData: categoryData,
        dailySalesData: reportsData.dailySalesData, // Keep sample structure
        monthlyTrendData: [] // Initialize empty
      };

      setReportsData(newData);
      
      // Fetch sales trend data
      try {
        const salesTrendResponse = await reportService.getSalesTrend(period as 'week' | 'month' | 'quarter' | 'year');
        const trendData = salesTrendResponse.data;
        
        if (trendData && Array.isArray(trendData)) {
          const monthlyData = trendData.map((item: any) => ({
            month: format(new Date(item.date || item.month), 'MMM'),
            sales: item.sales || item.revenue || 0
          }));
          
          setReportsData(prev => ({
            ...prev,
            monthlyTrendData: monthlyData
          }));
        }
      } catch (error) {
        console.warn('Failed to fetch sales trend:', error);
      }
      
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch annual income data - FIXED: Proper parsing
  const fetchAnnualData = async () => {
    try {
      const response = await reportService.getAnnualSummary();
      // FIXED: Access the correct data structure
      const responseData = response.data;
      
      if (responseData) {
        const monthlyData = responseData.monthlyData?.map((item: any) => ({
          month: item.month,
          revenue: item.revenue || 0,
          profit: item.profit || 0,
          orders: item.orders || 0
        })) || [];
        
        setAnnualData({
          totalRevenue: responseData.totalRevenue || 0,
          totalProfit: responseData.totalProfit || 0,
          totalOrders: responseData.totalOrders || 0,
          sellerPayments: responseData.sellerPayments || 0,
          monthlyData: monthlyData
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

          {/* Overview Tab - FIXED: Using properly parsed numeric values */}
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
                        <BarChart data={reportsData.dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      {reportsData.monthlyTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportsData.monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No trend data available for this period
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
                              dataKey="value"
                              labelLine={false}
                            >
                              {reportsData.categoryData.map((entry, index) => (
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
                          No category data available for this period
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