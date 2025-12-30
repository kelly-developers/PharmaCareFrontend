import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  Search,
  Filter,
  Package,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { medicineService } from '@/services/medicineService';
import { Medicine } from '@/types/pharmacy';
import { Button } from '@/components/ui/button';

export default function PharmacistMedicines() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0
  });

  useEffect(() => {
    loadMedicines();
    loadCategories();
    loadStats();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicineService.getAll({ 
        page: 1, 
        limit: 100 
      });
      
      if (response.success && response.data) {
        // Handle different response structures
        let medicinesArray: Medicine[] = [];
        const data = response.data;
        
        if (data.content && Array.isArray(data.content)) {
          // Paginated response
          medicinesArray = data.content;
        } else if (data.data && Array.isArray(data.data)) {
          // Nested data structure
          medicinesArray = data.data;
        } else if (Array.isArray(data)) {
          // Direct array
          medicinesArray = data;
        } else if (data.medicines && Array.isArray(data.medicines)) {
          // Another possible structure
          medicinesArray = data.medicines;
        }
        
        console.log('Loaded medicines:', medicinesArray.length);
        setMedicines(medicinesArray);
        
        // Update stats based on loaded medicines
        const inStock = medicinesArray.filter(med => med.stockQuantity > 0).length;
        const outOfStock = medicinesArray.filter(med => med.stockQuantity === 0).length;
        const lowStock = medicinesArray.filter(med => 
          med.stockQuantity > 0 && med.stockQuantity <= med.reorderLevel
        ).length;
        
        setStats(prev => ({
          ...prev,
          total: medicinesArray.length,
          inStock,
          outOfStock,
          lowStock
        }));
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to load medicines',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to load medicines:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load medicines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await medicineService.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await medicineService.getStats();
      if (response.success && response.data) {
        const data = response.data;
        setStats({
          total: data.totalMedicines || 0,
          inStock: data.activeMedicines || (data.totalMedicines - (data.outOfStockCount || 0)),
          outOfStock: data.outOfStockCount || 0,
          lowStock: data.lowStockCount || 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMedicines(),
      loadCategories(),
      loadStats()
    ]);
    toast({
      title: 'Refreshed',
      description: 'Medicine data has been refreshed',
    });
  };

  const filteredMedicines = medicines.filter((med) => {
    if (med.isActive === false) return false;
    
    const matchesSearch = 
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || med.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (medicine: Medicine) => {
    if (medicine.stockQuantity === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, color: 'text-destructive' };
    } else if (medicine.stockQuantity <= medicine.reorderLevel) {
      return { label: 'Low Stock', variant: 'warning' as const, color: 'text-warning' };
    } else {
      return { label: 'In Stock', variant: 'success' as const, color: 'text-success' };
    }
  };

  const getExpiryStatus = (expiryDate: Date) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      return { label: 'Expired', variant: 'destructive' as const };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'Expiring Soon', variant: 'warning' as const };
    } else {
      return { label: 'Valid', variant: 'success' as const };
    }
  };

  if (loading && !refreshing) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Loading Medicines</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch the latest medicine data</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Available Medicines</h1>
            <p className="text-muted-foreground mt-1">View medicine stock availability</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Medicines</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-success">{stats.inStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Package className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-destructive">{stats.outOfStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, generic name, or batch number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Medicine Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Available Quantity</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                          <div className="space-y-1">
                            <p className="font-medium">No medicines found</p>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery || categoryFilter !== 'all' 
                                ? 'Try adjusting your search or filter criteria' 
                                : 'No medicines available in the inventory'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMedicines.map((med) => {
                      const stockStatus = getStockStatus(med);
                      const expiryStatus = getExpiryStatus(new Date(med.expiryDate));
                      
                      return (
                        <TableRow key={med.id} className="hover:bg-secondary/50">
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{med.name}</p>
                              <div className="flex items-center gap-2">
                                {med.batchNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    {med.batchNumber}
                                  </Badge>
                                )}
                                {med.manufacturer && (
                                  <span className="text-xs text-muted-foreground">
                                    {med.manufacturer}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {med.genericName || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{med.category}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg ${stockStatus.color}`}>
                            {med.stockQuantity.toLocaleString()}
                            {med.reorderLevel > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Reorder at: {med.reorderLevel}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={expiryStatus.variant}>
                              {expiryStatus.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(med.expiryDate).toLocaleDateString()}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredMedicines.length > 0 && (
              <div className="p-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Showing {filteredMedicines.length} of {medicines.length} medicines
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}