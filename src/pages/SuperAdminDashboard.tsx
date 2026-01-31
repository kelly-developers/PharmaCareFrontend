import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  TrendingUp,
  Pill,
  Store,
  ShoppingBag,
  Package,
  Plus,
  ArrowRight,
  RefreshCw,
  Activity,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { businessService } from '@/services/businessService';
import { toast } from 'sonner';

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingBusinesses: number;
  pharmacyCount: number;
  generalCount: number;
  supermarketCount: number;
  retailCount: number;
  totalUsers?: number;
  adminCount?: number;
  recentBusinesses?: number;
  monthlyGrowth?: {
    current: number;
    previous: number;
  };
}

const businessTypeConfig = {
  pharmacy: { icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', label: 'Pharmacy' },
  general: { icon: Store, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: 'General Store' },
  supermarket: { icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950', label: 'Supermarket' },
  retail: { icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950', label: 'Retail' },
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    suspendedBusinesses: 0,
    pendingBusinesses: 0,
    pharmacyCount: 0,
    generalCount: 0,
    supermarketCount: 0,
    retailCount: 0,
    totalUsers: 0,
    adminCount: 0,
    recentBusinesses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await businessService.getStats();
      
      if (response.success && response.data) {
        // Ensure all required fields exist
        const data = response.data as any;
        
        const safeStats: DashboardStats = {
          totalBusinesses: data.totalBusinesses || 0,
          activeBusinesses: data.activeBusinesses || 0,
          suspendedBusinesses: data.suspendedBusinesses || 0,
          pendingBusinesses: data.pendingBusinesses || 0,
          pharmacyCount: data.pharmacyCount || 0,
          generalCount: data.generalCount || 0,
          supermarketCount: data.supermarketCount || 0,
          retailCount: data.retailCount || 0,
          totalUsers: data.totalUsers || 0,
          adminCount: data.adminCount || 0,
          recentBusinesses: data.recentBusinesses || 0,
          monthlyGrowth: data.monthlyGrowth || {
            current: data.recentBusinesses || 0,
            previous: Math.floor((data.recentBusinesses || 0) * 0.8)
          }
        };
        
        setStats(safeStats);
        toast.success('Dashboard stats updated');
      } else {
        throw new Error(response.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard stats';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Set default stats on error
      setStats({
        totalBusinesses: 0,
        activeBusinesses: 0,
        suspendedBusinesses: 0,
        pendingBusinesses: 0,
        pharmacyCount: 0,
        generalCount: 0,
        supermarketCount: 0,
        retailCount: 0,
        totalUsers: 0,
        adminCount: 0,
        recentBusinesses: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    subtitle,
    trend,
    isLoading: cardLoading 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string; 
    subtitle?: string;
    trend?: { value: number; label: string };
    isLoading?: boolean;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading || cardLoading ? (
              <div className="h-8 w-16 animate-pulse bg-muted rounded" />
            ) : (
              <p className="text-3xl font-bold">{value.toLocaleString()}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 ${trend.value >= 0 ? '' : 'rotate-180'}`} />
                <span>{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Calculate growth percentage safely
  const getGrowthPercentage = () => {
    if (!stats?.monthlyGrowth) return 0;
    const { current, previous } = stats.monthlyGrowth;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const growthPercentage = getGrowthPercentage();

  if (error && !stats) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-amber-500" />
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Super Admin
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">
              Platform Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of all businesses and platform statistics
            </p>
            {stats?.recentBusinesses !== undefined && stats.recentBusinesses > 0 && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className={`h-4 w-4 ${growthPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <span className={growthPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {growthPercentage >= 0 ? '+' : ''}{growthPercentage}% from last month
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="hero" onClick={() => navigate('/businesses/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-400">
                  Some data may be incomplete
                </p>
                <p className="text-sm text-red-700 dark:text-red-500">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Businesses"
            value={stats?.totalBusinesses || 0}
            icon={Building2}
            color="bg-gradient-to-br from-primary to-primary/80"
            isLoading={isLoading}
          />
          <StatCard
            title="Active Businesses"
            value={stats?.activeBusinesses || 0}
            icon={CheckCircle}
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
            isLoading={isLoading}
            subtitle={`${Math.round((stats?.activeBusinesses || 0) / (stats?.totalBusinesses || 1) * 100)}% of total`}
          />
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={UserCheck}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            subtitle="Across all businesses"
            isLoading={isLoading}
          />
          <StatCard
            title="Admins"
            value={stats?.adminCount || 0}
            icon={Shield}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
            isLoading={isLoading}
          />
        </div>

        {/* Business Types Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Types Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Businesses by Type
              </CardTitle>
              <CardDescription>Distribution of registered business types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(businessTypeConfig).map(([type, config]) => {
                const count = type === 'pharmacy' ? stats?.pharmacyCount || 0 :
                              type === 'general' ? stats?.generalCount || 0 :
                              type === 'supermarket' ? stats?.supermarketCount || 0 :
                              stats?.retailCount || 0;
                const total = stats?.totalBusinesses || 1;
                const percentage = Math.round((count / total) * 100);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={type} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {percentage}% of total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold">{count}</div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common super admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => navigate('/businesses')}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Manage Businesses</p>
                    <p className="text-xs text-muted-foreground">View, edit, and manage all businesses</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => navigate('/businesses/new')}
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">Create New Business</p>
                    <p className="text-xs text-muted-foreground">Add a new business to the platform</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => navigate('/users')}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">View All Users</p>
                    <p className="text-xs text-muted-foreground">Manage users across businesses</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Business Status Overview</CardTitle>
            <CardDescription>Current status of all registered businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                {isLoading ? (
                  <div className="h-8 w-12 animate-pulse bg-emerald-200 dark:bg-emerald-800 rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {stats?.activeBusinesses || 0}
                  </p>
                )}
                <p className="text-sm text-emerald-600 dark:text-emerald-500">Active</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 text-center">
                <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                {isLoading ? (
                  <div className="h-8 w-12 animate-pulse bg-amber-200 dark:bg-amber-800 rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {stats?.pendingBusinesses || 0}
                  </p>
                )}
                <p className="text-sm text-amber-600 dark:text-amber-500">Pending</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                {isLoading ? (
                  <div className="h-8 w-12 animate-pulse bg-red-200 dark:bg-red-800 rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {stats?.suspendedBusinesses || 0}
                  </p>
                )}
                <p className="text-sm text-red-600 dark:text-red-500">Suspended</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 text-center">
                <Building2 className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                {isLoading ? (
                  <div className="h-8 w-12 animate-pulse bg-gray-200 dark:bg-gray-800 rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                    {stats?.totalBusinesses || 0}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}