import React, { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useStock } from '@/contexts/StockContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Medicine, MedicineUnit, ProductType } from '@/types/pharmacy';
import { medicineService } from '@/services/medicineService';
import { reportService } from '@/services/reportService';
import { stockService } from '@/services/stockService';
import * as XLSX from 'xlsx';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Package,
  AlertTriangle,
  Edit2,
  Calculator,
  Box,
  Pill,
  Loader2,
  DollarSign,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const unitTypes = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'PAIR', label: 'Pair' },
  { value: 'STRIP', label: 'Strip' },
  { value: 'BOX', label: 'Box' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'PACK', label: 'Pack' },
  { value: 'ML', label: 'ml' },
  { value: 'GRAM', label: 'Gram' },
  { value: 'PIECE', label: 'Piece' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'UNIT', label: 'Unit' },
];

// Product type configurations matching CreateMedicine
const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'tablets', label: 'Tablets' },
  { value: 'tablets_pair', label: 'Tablet Pairs' },
  { value: 'syrup', label: 'Syrup/Bottle' },
  { value: 'liquid_bottle', label: 'Liquid by Size' },
  { value: 'weight_based', label: 'Weight Based' },
  { value: 'individual', label: 'Individual Items' },
  { value: 'service', label: 'Service' },
  { value: 'box_only', label: 'Box Only' },
  { value: 'custom', label: 'Custom' },
];

interface UnitPrice {
  id: string;
  type: string;
  label: string;
  quantity: number;
  price: number;
}

// Helper function to safely parse and format dates
const formatDateSafe = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput || dateInput === '' || dateInput === null || dateInput === undefined) {
    return '';
  }
  
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    if (!isValid(date)) {
      if (typeof dateInput === 'string') {
        const timestamp = Date.parse(dateInput);
        if (!isNaN(timestamp)) {
          const parsedDate = new Date(timestamp);
          if (isValid(parsedDate)) {
            return format(parsedDate, 'MMM dd, yyyy');
          }
        }
      }
      return '';
    }
    
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, dateInput);
    return '';
  }
};

// Helper function to safely parse date for input fields
const parseDateForInput = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isValid(date)) {
      return date.toISOString().split('T')[0];
    }
    
    if (typeof dateInput === 'string') {
      const parsed = parseISO(dateInput);
      if (isValid(parsed)) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error parsing date for input:', error, dateInput);
    return '';
  }
};

// Helper function to calculate days to expiry safely
const calculateDaysToExpiry = (expiryDateInput: string | Date): number => {
  if (!expiryDateInput) return Infinity;
  
  try {
    const expiryDate = expiryDateInput instanceof Date ? expiryDateInput : new Date(expiryDateInput);
    if (!isValid(expiryDate)) return Infinity;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = expiryDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days to expiry:', error);
    return Infinity;
  }
};

// Helper function to parse units from string or object
const parseUnits = (units: any): MedicineUnit[] => {
  if (!units) return [];
  
  if (typeof units === 'string') {
    try {
      return JSON.parse(units);
    } catch (e) {
      console.error('Failed to parse units string:', e);
      return [];
    }
  }
  
  if (Array.isArray(units)) {
    return units;
  }
  
  return [];
};

// Transform backend medicine to frontend format
const transformBackendMedicine = (backendMedicine: any): Medicine => {
  return {
    id: backendMedicine.id,
    name: backendMedicine.name,
    genericName: backendMedicine.generic_name || '',
    category: backendMedicine.category,
    manufacturer: backendMedicine.manufacturer || '',
    batchNumber: backendMedicine.batch_number || '',
    expiryDate: backendMedicine.expiry_date ? new Date(backendMedicine.expiry_date) : new Date(),
    units: parseUnits(backendMedicine.units),
    stockQuantity: backendMedicine.stock_quantity || 0,
    reorderLevel: backendMedicine.reorder_level || 10,
    supplierId: backendMedicine.supplier_id || '',
    costPrice: backendMedicine.cost_price || 0,
    imageUrl: backendMedicine.image_url,
    description: backendMedicine.description || '',
    productType: backendMedicine.product_type as ProductType || 'tablets',
    createdAt: backendMedicine.created_at ? new Date(backendMedicine.created_at) : new Date(),
    updatedAt: backendMedicine.updated_at ? new Date(backendMedicine.updated_at) : new Date(),
    isActive: backendMedicine.is_active !== false,
  };
};

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [addStockMedicine, setAddStockMedicine] = useState<Medicine | null>(null);
  const [addStockQuantity, setAddStockQuantity] = useState<string>('');
  const [addStockReason, setAddStockReason] = useState<string>('');
  const [editFormData, setEditFormData] = useState<any>({});
  const [editUnits, setEditUnits] = useState<UnitPrice[]>([]);
  const [editProductType, setEditProductType] = useState<ProductType>('tablets');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({
    totalValue: 0,
    lowStockCount: 0,
    expiringCount: 0,
    loading: true
  });
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { medicines, refreshMedicines } = useStock();
  const { categories: categoryList, getCategoryNames, refreshCategories } = useCategories();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get category names from backend
  const categoryNames = getCategoryNames();

  // Refresh categories on component mount
  useEffect(() => {
    refreshCategories();
  }, []);

  // Debug: Log all medicines
  console.log('📦 Inventory medicines from context:', medicines);
  
  // Format medicines data
  const formattedMedicines = React.useMemo(() => {
    return medicines.map(med => {
      // Calculate stock value based on cost price
      const stockValue = (med.stockQuantity || 0) * (med.costPrice || 0);
      
      return {
        ...med,
        computedStockValue: stockValue
      };
    });
  }, [medicines]);

  const filteredMedicines = formattedMedicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || med.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalValue = filteredMedicines.reduce(
    (sum, med) => sum + (med.computedStockValue || 0),
    0
  );

  const lowStockCount = filteredMedicines.filter(
    (med) => (med.stockQuantity || 0) <= (med.reorderLevel || 0)
  ).length;

  const expiringCount = filteredMedicines.filter((med) => {
    const daysToExpiry = calculateDaysToExpiry(med.expiryDate);
    return daysToExpiry <= 90;
  }).length;

  // Fetch inventory statistics from backend
  const fetchInventoryStats = async () => {
    try {
      setIsLoading(true);
      
      const response = await reportService.getDashboardStats();
      
      if (response.success && response.data) {
        setInventoryStats({
          totalValue: response.data.stockValue || totalValue,
          lowStockCount: response.data.lowStockCount || lowStockCount,
          expiringCount: response.data.expiringSoonCount || response.data.expiringCount || expiringCount,
          loading: false
        });
      } else {
        // Fallback to local calculation if API fails
        setInventoryStats({
          totalValue,
          lowStockCount,
          expiringCount,
          loading: false
        });
      }
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
      setInventoryStats({
        totalValue,
        lowStockCount,
        expiringCount,
        loading: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    refreshMedicines();
    fetchInventoryStats();
  }, []);

  // Handle refresh categories
  const handleRefreshCategories = async () => {
    setCategoriesLoading(true);
    try {
      await refreshCategories();
      toast({
        title: 'Categories refreshed',
        description: `Found ${categoryNames.length} categories`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh categories',
        variant: 'destructive',
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Start editing a medicine
  const startEdit = (med: Medicine) => {
    setEditingMedicine(med);
    
    const parsedExpiryDate = parseDateForInput(med.expiryDate);
    setEditProductType(med.productType || 'tablets');
    
    setEditFormData({
      name: med.name,
      genericName: med.genericName || '',
      category: med.category,
      manufacturer: med.manufacturer || '',
      batchNumber: med.batchNumber || '',
      expiryDate: parsedExpiryDate,
      stockQuantity: med.stockQuantity?.toString() || '0',
      reorderLevel: med.reorderLevel?.toString() || '10',
      costPrice: med.costPrice?.toString() || '0',
      description: med.description || '',
    });
    
    // Initialize units based on medicine data
    const id = () => Math.random().toString(36).substr(2, 9);
    const units = med.units || [];
    const defaultUnits: UnitPrice[] = units.map(u => ({
      id: id(),
      type: u.type?.toUpperCase() || 'TABLET',
      label: u.label || u.type || 'Tablet',
      quantity: u.quantity || 1,
      price: u.price || 0,
    }));
    
    setEditUnits(defaultUnits.length > 0 ? defaultUnits : [
      { id: id(), type: 'TABLET', label: 'Tablet', quantity: 1, price: med.costPrice || 0 },
    ]);
  };

  // Add a new unit to edit form
  const addEditUnit = () => {
    setEditUnits([...editUnits, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'TABLET', 
      label: 'Tablet', 
      quantity: 1, 
      price: 0 
    }]);
  };

  // Remove a unit from edit form
  const removeEditUnit = (id: string) => {
    if (editUnits.length > 1) {
      setEditUnits(editUnits.filter(u => u.id !== id));
    }
  };

  // Update a unit in edit form
  const updateEditUnit = (id: string, field: keyof UnitPrice, value: string | number) => {
    setEditUnits(editUnits.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  // Calculate prices from the largest unit
  const calculateEditPrices = () => {
    if (editUnits.length === 0) return;
    
    const sortedUnits = [...editUnits].sort((a, b) => b.quantity - a.quantity);
    const largestUnit = sortedUnits[0];
    
    if (largestUnit.price <= 0 || largestUnit.quantity <= 0) return;
    
    const pricePerSmallestUnit = largestUnit.price / largestUnit.quantity;
    
    setEditUnits(editUnits.map(unit => ({
      ...unit,
      price: unit.id === largestUnit.id ? unit.price : parseFloat((pricePerSmallestUnit * unit.quantity).toFixed(2))
    })));
    
    toast({ 
      title: 'Prices calculated', 
      description: 'All unit prices have been updated based on the largest unit price' 
    });
  };

  // Save edited medicine via API
  const saveEdit = async () => {
    if (!editingMedicine) return;

    try {
      setIsLoading(true);
      
      let expiryDateStr = '';
      if (editFormData.expiryDate && editFormData.expiryDate.trim() !== '') {
        const dateObj = new Date(editFormData.expiryDate);
        if (isValid(dateObj)) {
          expiryDateStr = dateObj.toISOString();
        }
      }
      
      const unitsForBackend = editUnits.map(u => ({
        type: u.type.toUpperCase(),
        label: u.label,
        quantity: u.quantity,
        price: u.price,
      }));

      const updateData: any = {
        name: editFormData.name,
        genericName: editFormData.genericName || '',
        category: editFormData.category,
        manufacturer: editFormData.manufacturer || '',
        batchNumber: editFormData.batchNumber || '',
        stockQuantity: parseInt(editFormData.stockQuantity) || 0,
        reorderLevel: parseInt(editFormData.reorderLevel) || 10,
        costPrice: parseFloat(editFormData.costPrice) || 0,
        units: unitsForBackend,
        description: editFormData.description || '',
        productType: editProductType,
      };

      if (expiryDateStr) {
        updateData.expiryDate = expiryDateStr;
      }

      const response = await medicineService.update(editingMedicine.id, updateData);

      if (response.success) {
        toast({
          title: 'Product Updated',
          description: `${editFormData.name} has been updated successfully`,
        });
        
        await refreshMedicines();
        await fetchInventoryStats();
        setEditingMedicine(null);
      } else {
        toast({
          title: 'Update Failed',
          description: response.error || 'Failed to update product',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error updating medicine:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating the product',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export medicines to Excel
  const handleExport = () => {
    const exportData = formattedMedicines.map(med => {
      const stockValue = (med.stockQuantity || 0) * (med.costPrice || 0);
      
      return {
        'Medicine Name': med.name,
        'Generic Name': med.genericName || '',
        'Category': med.category,
        'Manufacturer': med.manufacturer || '',
        'Batch Number': med.batchNumber || '',
        'Expiry Date': formatDateSafe(med.expiryDate),
        'Stock Quantity': med.stockQuantity || 0,
        'Reorder Level': med.reorderLevel || 10,
        'Cost Price': med.costPrice || 0,
        'Stock Value': stockValue,
        'Status': (med.stockQuantity || 0) === 0 ? 'Out of Stock' : (med.stockQuantity || 0) <= (med.reorderLevel || 0) ? 'Low Stock' : 'In Stock',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }
    ];
    
    XLSX.writeFile(wb, `inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: 'Export Successful',
      description: 'Inventory has been exported to Excel',
    });
  };

  // Import medicines from Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsLoading(true);
        const binaryStr = evt.target?.result;
        const wb = XLSX.read(binaryStr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;
        let errors: string[] = [];
        
        for (const row of data) {
          const rowData = row as any;
          
          if (!rowData['Medicine Name'] && !rowData['name']) {
            errors.push('Row missing medicine name');
            continue;
          }
          
          const medicine: any = {
            name: rowData['Medicine Name'] || rowData['name'] || '',
            genericName: rowData['Generic Name'] || rowData['genericName'] || '',
            category: rowData['Category'] || rowData['category'] || 'General',
            manufacturer: rowData['Manufacturer'] || rowData['manufacturer'] || '',
            batchNumber: rowData['Batch Number'] || rowData['batchNumber'] || `BATCH-${Date.now()}`,
            expiryDate: rowData['Expiry Date'] ? new Date(rowData['Expiry Date']).toISOString() : 
                     new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            units: [{
              type: 'TABLET',
              quantity: 1,
              price: parseFloat(rowData['Unit Price']) || 
                     parseFloat(rowData['sellingPrice']) || 
                     parseFloat(rowData['Cost Price']) || 0,
              label: 'Tablet'
            }],
            stockQuantity: parseInt(rowData['Stock Quantity']) || parseInt(rowData['stockQuantity']) || 0,
            reorderLevel: parseInt(rowData['Reorder Level']) || parseInt(rowData['reorderLevel']) || 10,
            costPrice: parseFloat(rowData['Cost Price']) || parseFloat(rowData['costPrice']) || 0,
            imageUrl: '',
            description: rowData['Description'] || '',
            productType: 'tablets'
          };

          if (medicine.name) {
            const response = await medicineService.create(medicine);
            
            if (response.success) {
              importedCount++;
            } else {
              errors.push(`Failed to import ${medicine.name}: ${response.error}`);
            }
          }
        }

        await refreshMedicines();
        await fetchInventoryStats();
        
        toast({
          title: 'Import Complete',
          description: `${importedCount} medicines imported successfully${errors.length > 0 ? `. ${errors.length} errors.` : ''}`,
          variant: errors.length > 0 ? 'destructive' : 'default',
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: 'Import Failed',
          description: 'Failed to parse Excel file. Please check the format.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">Manage your medicine stock</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              disabled={isLoading}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/create-medicine">
              <Button variant="hero" disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Medicine
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{filteredMedicines.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-destructive">
                    {inventoryStats.loading ? '...' : inventoryStats.lowStockCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {inventoryStats.loading ? 'Loading...' : `KSh ${inventoryStats.totalValue.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, generic name, or batch number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryNames.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleRefreshCategories}
                  variant="outline"
                  size="icon"
                  disabled={categoriesLoading || isLoading}
                  title="Refresh Categories"
                >
                  {categoriesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading inventory...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicines.map((med) => {
                      const stockQuantity = med.stockQuantity || 0;
                      const reorderLevel = med.reorderLevel || 0;
                      const isLowStock = stockQuantity <= reorderLevel;
                      const isOutOfStock = stockQuantity === 0;
                      const daysToExpiry = calculateDaysToExpiry(med.expiryDate);
                      const isExpiring = daysToExpiry <= 90;
                      const isExpired = daysToExpiry <= 0;
                      const stockValue = med.computedStockValue || 0;
                      const formattedExpiry = formatDateSafe(med.expiryDate);
                      const costPrice = med.costPrice || 0;

                      return (
                        <TableRow key={med.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Medicine Image */}
                              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                                {med.imageUrl ? (
                                  <img 
                                    src={med.imageUrl} 
                                    alt={med.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-primary/40" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{med.name}</p>
                                <p className="text-sm text-muted-foreground">{med.genericName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{med.category || 'Uncategorized'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {med.batchNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={isExpiring || isExpired ? 'text-destructive font-medium' : ''}>
                              {formattedExpiry || 'No expiry'}
                              {isExpiring && !isExpired && daysToExpiry !== Infinity && (
                                <span className="text-xs text-muted-foreground block">({daysToExpiry} days)</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                            {stockQuantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            KSh {costPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-700">
                            KSh {stockValue.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : isOutOfStock ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLowStock ? (
                              <Badge variant="warning">Low Stock</Badge>
                            ) : isExpiring ? (
                              <Badge variant="warning">Expiring Soon</Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setAddStockMedicine(med as Medicine);
                                  setAddStockQuantity('');
                                  setAddStockReason('');
                                }}
                                disabled={isLoading}
                                className="text-success hover:text-success"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Stock
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => startEdit(med as Medicine)}
                                disabled={isLoading}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Medicine Dialog - matches CreateMedicine format */}
      <Dialog open={!!editingMedicine} onOpenChange={() => setEditingMedicine(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingMedicine && (
            <div className="space-y-6 pt-4">
              {/* Product Type Selection */}
              <div className="space-y-2">
                <Label className="font-medium">Product Type</Label>
                <Select value={editProductType} onValueChange={(v) => setEditProductType(v as ProductType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name / Description</Label>
                  <Input
                    value={editFormData.genericName}
                    onChange={(e) => setEditFormData({ ...editFormData, genericName: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                    disabled={isLoading || categoriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading categories...</span>
                        </div>
                      ) : categoryNames.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <p>No categories found</p>
                        </div>
                      ) : (
                        categoryNames.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer / Brand</Label>
                  <Input
                    value={editFormData.manufacturer}
                    onChange={(e) => setEditFormData({ ...editFormData, manufacturer: e.target.value })}
                    disabled={isLoading}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  placeholder="Optional notes"
                  disabled={isLoading}
                />
              </div>

              {/* Batch & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input
                    value={editFormData.batchNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, batchNumber: e.target.value })}
                    disabled={isLoading}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Optional - leave blank if no expiry</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={editFormData.stockQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price (KSh)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.costPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Units & Pricing - matching CreateMedicine format */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Units & Pricing
                  </Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addEditUnit}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Unit
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={calculateEditPrices}>
                      <Calculator className="h-4 w-4 mr-1" />
                      Auto-Calculate
                    </Button>
                  </div>
                </div>

                {/* Units List */}
                <div className="space-y-3">
                  {editUnits.map((unit) => (
                    <div key={unit.id} className="flex items-end gap-3 p-3 bg-secondary/30 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Unit Type</Label>
                          <Select value={unit.type} onValueChange={(v) => updateEditUnit(unit.id, 'type', v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border">
                              {unitTypes.map((ut) => (
                                <SelectItem key={ut.value} value={ut.value}>{ut.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={unit.label}
                            onChange={(e) => updateEditUnit(unit.id, 'label', e.target.value)}
                            placeholder="e.g., 500ml Bottle"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={unit.quantity}
                            onChange={(e) => updateEditUnit(unit.id, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="1"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price (KSh)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unit.price}
                            onChange={(e) => updateEditUnit(unit.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => removeEditUnit(unit.id)}
                        disabled={editUnits.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Pricing Preview */}
                {editUnits.some(u => u.price > 0) && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-medium mb-3">Pricing Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {editUnits.filter(u => u.price > 0).map((unit) => (
                        <div key={unit.id} className="p-3 bg-background rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">{unit.label}</p>
                          <p className="text-lg font-bold">KSh {unit.price.toFixed(2)}</p>
                          {unit.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">({unit.quantity} units)</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setEditingMedicine(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={saveEdit}
                  disabled={isLoading || categoriesLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={!!addStockMedicine} onOpenChange={() => setAddStockMedicine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-success" />
              Add Stock to Existing Item
            </DialogTitle>
          </DialogHeader>
          {addStockMedicine && (
            <div className="space-y-4 pt-4">
              {/* Current Stock Info */}
              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-medium">{addStockMedicine.name}</h4>
                <p className="text-sm text-muted-foreground">{addStockMedicine.genericName}</p>
                <div className="mt-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Stock:</span>
                  <span className="font-bold">{(addStockMedicine.stockQuantity || 0).toLocaleString()} units</span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="addQuantity">Quantity to Add *</Label>
                <Input
                  id="addQuantity"
                  type="number"
                  min="1"
                  value={addStockQuantity}
                  onChange={(e) => setAddStockQuantity(e.target.value)}
                  placeholder="Enter quantity to add"
                  disabled={isAddingStock}
                />
                <p className="text-xs text-muted-foreground">
                  New total will be: {((addStockMedicine.stockQuantity || 0) + (parseInt(addStockQuantity) || 0)).toLocaleString()} units
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="addReason">Reason (Optional)</Label>
                <Select value={addStockReason} onValueChange={setAddStockReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for adding stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Additional Purchase</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="transfer">Transfer from Another Location</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setAddStockMedicine(null)}
                  disabled={isAddingStock}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={async () => {
                    if (!addStockQuantity || parseInt(addStockQuantity) <= 0) {
                      toast({
                        title: 'Invalid Quantity',
                        description: 'Please enter a valid quantity to add',
                        variant: 'destructive',
                      });
                      return;
                    }

                    setIsAddingStock(true);
                    try {
                      const response = await stockService.addStock({
                        medicineId: addStockMedicine.id,
                        quantity: parseInt(addStockQuantity),
                        reason: addStockReason || 'Additional stock added',
                        performedBy: user?.id || user?.email || 'Unknown',
                        performedByRole: user?.role,
                      });

                      if (response.success) {
                        toast({
                          title: 'Stock Added',
                          description: `Added ${addStockQuantity} units to ${addStockMedicine.name}`,
                        });
                        await refreshMedicines();
                        await fetchInventoryStats();
                        setAddStockMedicine(null);
                      } else {
                        toast({
                          title: 'Failed to Add Stock',
                          description: response.error || 'Something went wrong',
                          variant: 'destructive',
                        });
                      }
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to add stock',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsAddingStock(false);
                    }
                  }}
                  disabled={isAddingStock || !addStockQuantity}
                >
                  {isAddingStock ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stock
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}