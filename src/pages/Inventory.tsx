import React, { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useStock } from '@/contexts/StockContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { categories } from '@/data/medicines';
import { useToast } from '@/hooks/use-toast';
import { Medicine, MedicineUnit } from '@/types/pharmacy';
import { medicineService } from '@/services/medicineService';
import { reportService } from '@/services/reportService';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const unitTypes = [
  { value: 'single', label: 'Single/Tablet' },
  { value: 'strip', label: 'Strip' },
  { value: 'box', label: 'Box' },
  { value: 'pair', label: 'Pair' },
  { value: 'bottle', label: 'Bottle' },
];

interface UnitPrice {
  type: string;
  quantity: number;
  price: number;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editUnits, setEditUnits] = useState<UnitPrice[]>([]);
  const [tabletsPerBox, setTabletsPerBox] = useState<number>(100);
  const [tabletsPerStrip, setTabletsPerStrip] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({
    totalValue: 0,
    lowStockCount: 0,
    expiringCount: 0,
    loading: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { medicines, refreshMedicines } = useStock();
  const { getCategoryNames } = useCategories();
  const { toast } = useToast();

  const categoryNames = getCategoryNames();

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || med.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate medicine stock value - matches backend calculation
  const calculateMedicineStockValue = (medicine: Medicine): number => {
    if (!medicine || !medicine.units || medicine.stockQuantity === 0) {
      return 0;
    }

    // Find single unit (tablet) price
    const singleUnit = medicine.units.find(u => 
      u.type.toLowerCase() === 'single' || u.type === 'SINGLE'
    );
    
    if (singleUnit && singleUnit.price > 0) {
      // Use selling price per tablet × stock quantity
      const pricePerTablet = singleUnit.price / singleUnit.quantity;
      return medicine.stockQuantity * pricePerTablet;
    }

    // Fallback to cost price calculation
    // Find box unit to get tablets per box
    const boxUnit = medicine.units.find(u => 
      u.type.toLowerCase() === 'box' || u.type === 'BOX'
    );
    const tabletsPerBox = boxUnit?.quantity || 100;
    
    if (tabletsPerBox > 0) {
      const costPerTablet = medicine.costPrice / tabletsPerBox;
      return medicine.stockQuantity * costPerTablet;
    }

    return 0;
  };

  // Calculate totals using backend-corrected formula
  const totalValue = filteredMedicines.reduce(
    (sum, med) => sum + calculateMedicineStockValue(med),
    0
  );

  const lowStockCount = filteredMedicines.filter(
    (med) => med.stockQuantity <= med.reorderLevel
  ).length;

  const expiringCount = filteredMedicines.filter((med) => {
    const daysToExpiry = Math.ceil(
      (new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysToExpiry <= 90;
  }).length;

  // Fetch inventory statistics from backend
  const fetchInventoryStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard stats which includes inventory value
      const response = await reportService.getDashboardStats();
      
      if (response.success && response.data) {
        setInventoryStats({
          totalValue: response.data.inventoryValue || 0,
          lowStockCount: response.data.lowStockCount || 0,
          expiringCount: response.data.expiringCount || response.data.expiringSoonCount || 0,
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
      // Fallback to local calculation
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

  // Start editing a medicine
  const startEdit = (med: Medicine) => {
    setEditingMedicine(med);
    
    // Extract tablets per box and strip from units
    const boxUnit = med.units.find(u => u.type === 'box' || u.type === 'BOX');
    const stripUnit = med.units.find(u => u.type === 'strip' || u.type === 'STRIP');
    const singleUnit = med.units.find(u => u.type === 'single' || u.type === 'SINGLE');
    
    if (boxUnit) {
      setTabletsPerBox(boxUnit.quantity);
    }
    if (stripUnit) {
      setTabletsPerStrip(stripUnit.quantity);
    }
    
    setEditFormData({
      name: med.name,
      genericName: med.genericName || '',
      category: med.category,
      manufacturer: med.manufacturer || '',
      batchNumber: med.batchNumber,
      expiryDate: format(new Date(med.expiryDate), 'yyyy-MM-dd'),
      stockQuantity: med.stockQuantity.toString(),
      reorderLevel: med.reorderLevel.toString(),
      costPrice: med.costPrice.toString(),
      boxPrice: boxUnit?.price?.toString() || '0',
      tabletPrice: singleUnit?.price?.toString() || '0',
    });
    
    // Initialize units based on medicine data
    const defaultUnits: UnitPrice[] = [];
    
    // Add single unit
    if (singleUnit) {
      defaultUnits.push({
        type: 'single',
        quantity: 1,
        price: singleUnit.price,
      });
    }
    
    // Add strip unit if exists
    if (stripUnit) {
      defaultUnits.push({
        type: 'strip',
        quantity: stripUnit.quantity,
        price: stripUnit.price,
      });
    }
    
    // Add box unit
    if (boxUnit) {
      defaultUnits.push({
        type: 'box',
        quantity: boxUnit.quantity,
        price: boxUnit.price,
      });
    }
    
    setEditUnits(defaultUnits.length > 0 ? defaultUnits : [
      { type: 'single', quantity: 1, price: 0 },
      { type: 'strip', quantity: 10, price: 0 },
      { type: 'box', quantity: 100, price: 0 },
    ]);
  };

  // Calculate tablet price from box price
  const calculateTabletPrice = (boxPrice: number) => {
    if (tabletsPerBox > 0) {
      const tabletPrice = boxPrice / tabletsPerBox;
      
      // Update tablet price in form
      setEditFormData(prev => ({
        ...prev,
        tabletPrice: tabletPrice.toFixed(2)
      }));
      
      // Update single unit price
      const updatedUnits = [...editUnits];
      const singleIndex = updatedUnits.findIndex(unit => unit.type === 'single');
      if (singleIndex > -1) {
        updatedUnits[singleIndex].price = parseFloat(tabletPrice.toFixed(2));
      }
      
      // Update strip unit price
      const stripIndex = updatedUnits.findIndex(unit => unit.type === 'strip');
      if (stripIndex > -1 && tabletsPerStrip > 0) {
        const stripPrice = tabletPrice * tabletsPerStrip;
        updatedUnits[stripIndex].price = parseFloat(stripPrice.toFixed(2));
      }
      
      setEditUnits(updatedUnits);
    }
  };

  // Update unit quantities based on tablets per box/strip
  useEffect(() => {
    if (editingMedicine) {
      const updatedUnits = editUnits.map(unit => {
        if (unit.type === 'box') {
          return { ...unit, quantity: tabletsPerBox };
        } else if (unit.type === 'strip') {
          return { ...unit, quantity: tabletsPerStrip };
        }
        return unit;
      });
      
      // Recalculate prices based on new quantities
      const boxPrice = parseFloat(editFormData.boxPrice) || 0;
      if (boxPrice > 0) {
        calculateTabletPrice(boxPrice);
      }
      
      setEditUnits(updatedUnits);
    }
  }, [tabletsPerBox, tabletsPerStrip]);

  // Update tablet price when box price changes
  useEffect(() => {
    if (editingMedicine) {
      const boxPrice = parseFloat(editFormData.boxPrice) || 0;
      calculateTabletPrice(boxPrice);
    }
  }, [editFormData.boxPrice]);

  // Save edited medicine via API
  const saveEdit = async () => {
    if (!editingMedicine) return;

    try {
      setIsLoading(true);
      const response = await medicineService.update(editingMedicine.id, {
        name: editFormData.name,
        genericName: editFormData.genericName || undefined,
        category: editFormData.category,
        manufacturer: editFormData.manufacturer,
        batchNumber: editFormData.batchNumber,
        expiryDate: editFormData.expiryDate,
        stockQuantity: parseInt(editFormData.stockQuantity) || 0,
        reorderLevel: parseInt(editFormData.reorderLevel) || 50,
        costPrice: parseFloat(editFormData.costPrice) || 0,
        units: editUnits.map(u => ({
          type: u.type.toUpperCase() as MedicineUnit['type'],
          quantity: u.quantity,
          price: u.price,
        })),
      });

      if (response.success) {
        toast({
          title: 'Medicine Updated',
          description: `${editFormData.name} has been updated successfully`,
        });
        
        // Refresh medicines and inventory stats
        await refreshMedicines();
        await fetchInventoryStats();
      } else {
        toast({
          title: 'Update Failed',
          description: response.error || 'Failed to update medicine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'An error occurred while updating the medicine',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }

    setEditingMedicine(null);
  };

  // Export medicines to Excel
  const handleExport = () => {
    const exportData = medicines.map(med => {
      const stockValue = calculateMedicineStockValue(med);
      
      return {
        'Medicine Name': med.name,
        'Generic Name': med.genericName || '',
        'Category': med.category,
        'Manufacturer': med.manufacturer || '',
        'Batch Number': med.batchNumber,
        'Expiry Date': format(new Date(med.expiryDate), 'yyyy-MM-dd'),
        'Stock Quantity': med.stockQuantity,
        'Reorder Level': med.reorderLevel,
        'Cost Price': med.costPrice,
        'Selling Price per Tablet': (() => {
          const singleUnit = med.units?.find(u => u.type.toLowerCase() === 'single');
          if (singleUnit && singleUnit.price > 0) {
            return singleUnit.price / singleUnit.quantity;
          }
          return med.costPrice / 100; // Default assumption
        })(),
        'Stock Value': stockValue,
        'Status': med.stockQuantity === 0 ? 'Out of Stock' : med.stockQuantity <= med.reorderLevel ? 'Low Stock' : 'In Stock',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
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
          
          // Skip rows without medicine name
          if (!rowData['Medicine Name'] && !rowData['name']) {
            errors.push('Row missing medicine name');
            continue;
          }
          
          const medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'> = {
            name: rowData['Medicine Name'] || rowData['name'] || '',
            genericName: rowData['Generic Name'] || rowData['genericName'] || undefined,
            category: rowData['Category'] || rowData['category'] || 'General',
            manufacturer: rowData['Manufacturer'] || rowData['manufacturer'] || '',
            batchNumber: rowData['Batch Number'] || rowData['batchNumber'] || `BATCH-${Date.now()}`,
            expiryDate: rowData['Expiry Date'] ? new Date(rowData['Expiry Date']) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            units: [{
              type: 'single' as const,
              quantity: 1,
              price: parseFloat(rowData['Selling Price per Tablet']) || 
                     parseFloat(rowData['sellingPrice']) || 
                     (parseFloat(rowData['Selling Price']) || 0) / 100, // Default assumption
            }],
            stockQuantity: parseInt(rowData['Stock Quantity']) || parseInt(rowData['stockQuantity']) || 0,
            reorderLevel: parseInt(rowData['Reorder Level']) || parseInt(rowData['reorderLevel']) || 50,
            supplierId: 'sup1',
            costPrice: parseFloat(rowData['Cost Price']) || parseFloat(rowData['costPrice']) || 0,
            imageUrl: '',
          };

          if (medicine.name) {
            // Call API to add medicine
            const response = await medicineService.create({
              name: medicine.name,
              genericName: medicine.genericName,
              category: medicine.category,
              manufacturer: medicine.manufacturer,
              batchNumber: medicine.batchNumber,
              expiryDate: medicine.expiryDate instanceof Date ? 
                         medicine.expiryDate.toISOString().split('T')[0] : 
                         medicine.expiryDate as string,
              units: medicine.units,
              stockQuantity: medicine.stockQuantity,
              reorderLevel: medicine.reorderLevel,
              costPrice: medicine.costPrice,
              imageUrl: medicine.imageUrl,
            });
            
            if (response.success) {
              importedCount++;
            } else {
              errors.push(`Failed to import ${medicine.name}: ${response.error}`);
            }
          }
        }

        // Refresh data
        await refreshMedicines();
        await fetchInventoryStats();
        
        toast({
          title: 'Import Complete',
          description: `${importedCount} medicines imported successfully${errors.length > 0 ? `. ${errors.length} errors.` : ''}`,
          variant: errors.length > 0 ? 'destructive' : 'default',
        });

        // Reset file input
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Correctly calculated from backend
                  </p>
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
                  disabled={isLoading}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
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
                      const isLowStock = med.stockQuantity <= med.reorderLevel;
                      const isOutOfStock = med.stockQuantity === 0;
                      const daysToExpiry = Math.ceil(
                        (new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      const isExpiring = daysToExpiry <= 90;
                      const isExpired = daysToExpiry <= 0;
                      const stockValue = calculateMedicineStockValue(med);

                      return (
                        <TableRow key={med.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{med.name}</p>
                              <p className="text-sm text-muted-foreground">{med.genericName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{med.category}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{med.batchNumber}</TableCell>
                          <TableCell>
                            <span className={isExpiring || isExpired ? 'text-destructive font-medium' : ''}>
                              {format(new Date(med.expiryDate), 'MMM dd, yyyy')}
                              {isExpiring && !isExpired && (
                                <span className="text-xs text-muted-foreground block">({daysToExpiry} days)</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                            {med.stockQuantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">KSh {med.costPrice.toLocaleString()}</TableCell>
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => startEdit(med)}
                              disabled={isLoading}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit Stock
                            </Button>
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

      {/* Edit Medicine Dialog */}
      <Dialog open={!!editingMedicine} onOpenChange={() => setEditingMedicine(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          {editingMedicine && (
            <div className="space-y-6 pt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medicine Name *</Label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name</Label>
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
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryNames.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {categories.map((cat) => (
                        !categoryNames.includes(cat) && <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={editFormData.manufacturer}
                    onChange={(e) => setEditFormData({ ...editFormData, manufacturer: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Number *</Label>
                  <Input
                    value={editFormData.batchNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, batchNumber: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date *</Label>
                  <Input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Tablets Configuration */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="tabletsPerBox" className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Tablets per Box *
                  </Label>
                  <Input
                    id="tabletsPerBox"
                    type="number"
                    min="1"
                    value={tabletsPerBox}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 100;
                      setTabletsPerBox(value);
                    }}
                    placeholder="e.g., 100"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Total tablets in one box</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tabletsPerStrip">
                    Tablets per Strip *
                  </Label>
                  <Input
                    id="tabletsPerStrip"
                    type="number"
                    min="1"
                    value={tabletsPerStrip}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 10;
                      setTabletsPerStrip(value);
                    }}
                    placeholder="e.g., 10"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Tablets in one strip</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Stock Quantity (Tablets)</Label>
                  <Input
                    type="number"
                    value={editFormData.stockQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level (Tablets)</Label>
                  <Input
                    type="number"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buying Price (per Box)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.costPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                      className="pl-12"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Price you pay for one box</p>
                </div>
              </div>

              {/* Pricing Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  <Label className="text-base font-medium">Pricing</Label>
                </div>
                
                {/* Box Price Input */}
                <div className="space-y-2">
                  <Label htmlFor="boxPrice">Selling Price (per Box)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      id="boxPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.boxPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, boxPrice: e.target.value })}
                      placeholder="Enter selling price for entire box"
                      className="pl-12"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the price you want to sell the entire box for
                  </p>
                </div>

                {/* Price Calculation Display */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Price Calculation</Label>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Price per tablet</p>
                        <p className="text-xs text-muted-foreground">
                          Box price ÷ {tabletsPerBox} tablets
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          KSh {editFormData.tabletPrice || '0.00'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Price per strip</p>
                        <p className="text-xs text-muted-foreground">
                          Tablet price × {tabletsPerStrip} tablets
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          KSh {(() => {
                            const tabletPrice = parseFloat(editFormData.tabletPrice) || 0;
                            const stripPrice = tabletPrice * tabletsPerStrip;
                            return stripPrice.toFixed(2);
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Pricing Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Single Tablet</p>
                      <p className="text-lg font-bold">KSh {editFormData.tabletPrice || '0.00'}</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Strip ({tabletsPerStrip} tablets)
                      </p>
                      <p className="text-lg font-bold">
                        KSh {(() => {
                          const tabletPrice = parseFloat(editFormData.tabletPrice) || 0;
                          return (tabletPrice * tabletsPerStrip).toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Box ({tabletsPerBox} tablets)
                      </p>
                      <p className="text-lg font-bold">KSh {editFormData.boxPrice || '0.00'}</p>
                    </div>
                  </div>
                  
                  {/* Markup */}
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Markup</p>
                        <p className="text-xs text-muted-foreground">Profit margin percentage</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {(() => {
                            const cost = parseFloat(editFormData.costPrice) || 0;
                            const sellingPrice = parseFloat(editFormData.boxPrice) || 0;
                            if (cost === 0) return 'N/A';
                            const markup = ((sellingPrice - cost) / cost * 100).toFixed(1);
                            return `${markup}%`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                  disabled={isLoading}
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
    </MainLayout>
  );
}