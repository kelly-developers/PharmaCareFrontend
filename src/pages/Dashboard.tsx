import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSales } from '@/contexts/SalesContext';
import { useStock } from '@/contexts/StockContext';
import { Sale } from '@/types/pharmacy';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { reportService } from '@/services/reportService';
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
  Legend,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const { getAllSales, getTodaySales, fetchAllSales } = useSales();
  const { medicines, refreshMedicines } = useStock();
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'daily' | 'monthly' | 'annual'>('daily');
  
  // State for all dashboard data from backend
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayTransactions: 0,
    todayProfit: 0,
    thisMonthProfit: 0,
    lastMonthProfit: 0,
    inventoryValue: 0,
    totalStockItems: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    outOfStockCount: 0,
    todayExpenses: 0,
    pendingOrders: 0,
    pendingPrescriptions: 0,
  });

  // Annual tracking data
  const [annualData, setAnnualData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    sellerPayments: 0,
    monthlyData: [] as { month: string; revenue: number; profit: number; orders: number }[],
  });

  // Only admin and manager can see profits
  const canViewProfit = user?.role === 'admin' || user?.role === 'manager';

  // Fetch all dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      const response = await reportService.getDashboardStats();
      if (response.success && response.data) {
        setDashboardData(prev => ({
          ...prev,
          ...response.data,
          todaySales: response.data.todaySales || 0,
          todayTransactions: response.data.todayTransactions || 0,
          todayProfit: response.data.todayProfit || 0,
          thisMonthProfit: response.data.thisMonthProfit || 0,
          lastMonthProfit: response.data.lastMonthProfit || 0,
          inventoryValue: response.data.inventoryValue || 0,
          totalStockItems: response.data.totalStockItems || 0,
          lowStockCount: response.data.lowStockCount || 0,
          expiringSoonCount: response.data.expiringCount || response.data.expiringSoonCount || 0,
          pendingOrders: response.data.pendingOrders || 0,
          pendingExpenses: response.data.pendingExpenses || 0,
          pendingPrescriptions: response.data.pendingPrescriptions || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  // Fetch annual income data from backend
  const fetchAnnualData = async () => {
    try {
      const response = await reportService.getAnnualSummary();
      if (response.success && response.data) {
        setAnnualData({
          totalRevenue: response.data.totalRevenue || 0,
          totalProfit: response.data.totalProfit || 0,
          totalOrders: response.data.totalOrders || 0,
          sellerPayments: response.data.sellerPayments || 0,
          monthlyData: response.data.monthlyData || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch annual data:', error);
    }
  };

  // Fetch today's sales
  useEffect(() => {
    const fetchTodaySales = async () => {
      const sales = await getTodaySales();
      setTodaySales(sales);
    };
    fetchTodaySales();
  }, [getTodaySales]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
    if (canViewProfit) {
      fetchAnnualData();
    }
  }, [canViewProfit]);

  // Get real sales data
  const allSales = getAllSales();
  
  // Get low stock items
  const lowStockItems = medicines.filter(med => 
    med.stockQuantity <= med.reorderLevel
  ).slice(0, 4);
  
  // Get expiring items
  const expiringItems = medicines.filter(med => {
    const daysToExpiry = Math.ceil(
      (new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return med.stockQuantity > 0 && daysToExpiry <= 90 && daysToExpiry > 0;
  }).slice(0, 3);
  
  // Recent sales (last 4)
  const recentSales = [...allSales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchAllSales(),
        refreshMedicines(),
        fetchDashboardData(),
        canViewProfit ? fetchAnnualData() : Promise.resolve()
      ]);
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate trend percentage for monthly profit
  const calculateMonthlyProfitTrend = () => {
    if (dashboardData.lastMonthProfit === 0) {
      return dashboardData.thisMonthProfit > 0 ? 100 : 0;
    }
    return ((dashboardData.thisMonthProfit - dashboardData.lastMonthProfit) / Math.abs(dashboardData.lastMonthProfit)) * 100;
  };

  const monthlyProfitTrend = calculateMonthlyProfitTrend();
  const isMonthlyProfitPositive = monthlyProfitTrend >= 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {(user?.name || user?.email || 'there')
                .toString()
                .split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">Here's what's happening at your pharmacy today</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {user?.role !== 'pharmacist' && (
              <Link to="/pos">
                <Button variant="hero" size="lg">
                  <ShoppingCart className="h-4 w-4" />
                  New Sale
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={`KSh ${dashboardData.todaySales.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            trend={{ value: todaySales.length > 0 ? 12 : 0, isPositive: true }}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Transactions"
            value={dashboardData.todayTransactions.toString()}
            icon={<ShoppingCart className="h-6 w-6" />}
            trend={{ value: dashboardData.todayTransactions > 0 ? 8 : 0, isPositive: true }}
            iconClassName="bg-info/10 text-info"
          />
          <StatCard
            title="Inventory Value"
            value={`KSh ${dashboardData.inventoryValue.toLocaleString()}`}
            icon={<Package className="h-6 w-6" />}
            trend={{ value: 0, isPositive: true }}
            iconClassName="bg-warning/10 text-warning"
            subtitle={`${dashboardData.totalStockItems} items`}
          />
          {canViewProfit && (
            <StatCard
              title="Monthly Gross Profit"
              value={`KSh ${dashboardData.thisMonthProfit.toLocaleString()}`}
              icon={<TrendingUp className="h-6 w-6" />}
              trend={{ 
                value: Math.abs(monthlyProfitTrend), 
                isPositive: isMonthlyProfitPositive 
              }}
              iconClassName="bg-primary/10 text-primary"
              subtitle="This month"
            />
          )}
        </div>

        {/* Alerts Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" className="bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold">{dashboardData.lowStockCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated" className="bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">{dashboardData.expiringSoonCount}</p>
                </div>
                <Clock className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated" className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Stock Items</p>
                  <p className="text-2xl font-bold">{dashboardData.totalStockItems}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Annual Income Tracking - Admin/Manager Only */}
        {canViewProfit && (
          <Card variant="elevated">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Annual Income Tracking - {new Date().getFullYear()}
                </CardTitle>
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
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
                    <ShoppingCart className="h-4 w-4 text-info" />
                    <span className="text-xs text-muted-foreground">Total Orders</span>
                  </div>
                  <p className="text-xl font-bold text-info">{annualData.totalOrders.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Seller Payments</span>
                  </div>
                  <p className="text-xl font-bold text-warning">KSh {annualData.sellerPayments.toLocaleString()}</p>
                </div>
              </div>

              {/* Monthly Revenue & Profit Chart */}
              {annualData.monthlyData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualData.monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `KSh ${value.toLocaleString()}`,
                          name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Orders'
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Profit Overview for Admins/Managers */}
        {canViewProfit && (
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Profit Performance</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div>
                        <span className="text-2xl font-bold">KSh {dashboardData.thisMonthProfit.toLocaleString()}</span>
                        <span className={`ml-2 text-sm font-medium ${isMonthlyProfitPositive ? 'text-success' : 'text-destructive'}`}>
                          {isMonthlyProfitPositive ? '+' : ''}{monthlyProfitTrend.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        vs last month: KSh {dashboardData.lastMonthProfit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Today's Profit</p>
                  <p className="text-lg font-semibold">KSh {dashboardData.todayProfit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Sales</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Link to="/sales">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales yet today</p>
                ) : (
                  recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{sale.customerName || 'Walk-in'}</p>
                          <p className="text-sm text-muted-foreground">{sale.items.length} item(s) • {sale.cashierName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">KSh {sale.total.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(sale.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alerts Column */}
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All items are well stocked</p>
                  ) : (
                    lowStockItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        <Badge variant={item.stockQuantity === 0 ? "destructive" : "warning"} className="ml-2">
                          {item.stockQuantity === 0 ? "Out of stock" : `${item.stockQuantity} left`}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                <Link to="/inventory" className="block mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Inventory
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-destructive" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expiringItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items expiring soon</p>
                  ) : (
                    expiringItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.stockQuantity}</p>
                        </div>
                        <Badge variant="destructive" className="ml-2">
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
