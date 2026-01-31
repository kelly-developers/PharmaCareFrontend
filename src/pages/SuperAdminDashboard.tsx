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
  totalUsers: number;
  adminCount: number;
}

const businessTypeConfig = {
  pharmacy: { icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  general: { icon: Store, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  supermarket: { icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950' },
  retail: { icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950' },
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await businessService.getStats();
      if (response.success && response.data) {
        setStats({
          totalBusinesses: response.data.totalBusinesses || 0,
          activeBusinesses: response.data.activeBusinesses || 0,
          suspendedBusinesses: 0,
          pendingBusinesses: 0,
          pharmacyCount: response.data.pharmacyCount || 0,
          generalCount: response.data.generalCount || 0,
          supermarketCount: response.data.supermarketCount || 0,
          retailCount: response.data.retailCount || 0,
          totalUsers: 0,
          adminCount: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="hero" onClick={() => navigate('/businesses')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Businesses"
            value={stats?.totalBusinesses ?? 0}
            icon={Building2}
            color="bg-gradient-to-br from-primary to-primary/80"
          />
          <StatCard
            title="Active Businesses"
            value={stats?.activeBusinesses ?? 0}
            icon={CheckCircle}
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            subtitle="Across all businesses"
          />
          <StatCard
            title="Admins"
            value={stats?.adminCount ?? 0}
            icon={Shield}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
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
                const count = type === 'pharmacy' ? stats?.pharmacyCount :
                              type === 'general' ? stats?.generalCount :
                              type === 'supermarket' ? stats?.supermarketCount :
                              stats?.retailCount;
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{type}</p>
                        <p className="text-sm text-muted-foreground">
                          {type === 'pharmacy' ? 'Medical & Healthcare' : 
                           type === 'supermarket' ? 'Food & Groceries' :
                           type === 'general' ? 'General Merchandise' : 'Retail Items'}
                        </p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{count ?? 0}</div>
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
                onClick={() => navigate('/businesses')}
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
                onClick={() => navigate('/businesses')}
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
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {stats?.activeBusinesses ?? 0}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-500">Active</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 text-center">
                <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {stats?.pendingBusinesses ?? 0}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">Pending</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {stats?.suspendedBusinesses ?? 0}
                </p>
                <p className="text-sm text-red-600 dark:text-red-500">Suspended</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 text-center">
                <Building2 className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {stats?.totalBusinesses ?? 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
