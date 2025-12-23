import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const { getAllSales, getTodaySales } = useSales();
  const { medicines } = useStock();
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  
  // Only admin and manager can see profits
  const canViewProfit = user?.role === 'admin' || user?.role === 'manager';

  // Fetch today's sales
  useEffect(() => {
    const fetchTodaySales = async () => {
      const sales = await getTodaySales();
      setTodaySales(sales);
    };
    fetchTodaySales();
  }, [getTodaySales]);

  // Get real sales data
  const allSales = getAllSales();
  
  // Calculate today's stats
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayTransactions = todaySales.length;
  
  // Calculate profit (total - cost)
  const todayProfit = todaySales.reduce((sum, sale) => {
    const saleCost = sale.items.reduce((itemSum, item) => itemSum + ((item.costPrice || 0) * item.quantity), 0);
    return sum + (sale.total - saleCost);
  }, 0);
  
  // Get total stock items
  const totalStockItems = medicines.reduce((sum, med) => sum + med.stockQuantity, 0);
  
  // Low stock items (stock <= reorderLevel)
  const lowStockItems = medicines.filter(med => med.stockQuantity <= med.reorderLevel).slice(0, 4);
  
  // Expiring items (within 90 days)
  const expiringItems = medicines.filter(med => {
    const daysToExpiry = Math.ceil(
      (new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysToExpiry <= 90 && daysToExpiry > 0;
  }).slice(0, 3);
  
  // Recent sales (last 4)
  const recentSales = [...allSales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

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
          {user?.role !== 'pharmacist' && (
            <Link to="/pos">
              <Button variant="hero" size="lg">
                <ShoppingCart className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={`KSh ${todayTotal.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            trend={{ value: todaySales.length > 0 ? 12 : 0, isPositive: true }}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Transactions"
            value={todayTransactions.toString()}
            icon={<ShoppingCart className="h-6 w-6" />}
            trend={{ value: todayTransactions > 0 ? 8 : 0, isPositive: true }}
            iconClassName="bg-info/10 text-info"
          />
          <StatCard
            title="Items in Stock"
            value={totalStockItems.toLocaleString()}
            icon={<Package className="h-6 w-6" />}
            iconClassName="bg-warning/10 text-warning"
          />
          {canViewProfit && (
            <StatCard
              title="Gross Profit"
              value={`KSh ${todayProfit.toLocaleString()}`}
              icon={<TrendingUp className="h-6 w-6" />}
              trend={{ value: todayProfit > 0 ? 5 : 0, isPositive: true }}
              iconClassName="bg-primary/10 text-primary"
            />
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Sales</CardTitle>
              <Link to="/sales">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
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
                        <Badge variant="warning" className="ml-2">
                          {item.stockQuantity} left
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