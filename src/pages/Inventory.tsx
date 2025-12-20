import { useState, useRef } from 'react';
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
  X,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { medicines, addMedicine } = useStock();
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

  const totalValue = filteredMedicines.reduce(
    (sum, med) => sum + med.stockQuantity * med.costPrice,
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

  // Start editing a medicine
  const startEdit = (med: Medicine) => {
    setEditingMedicine(med);
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
    });
    setEditUnits(med.units.map(u => ({
      type: u.type,
      quantity: u.quantity,
      price: u.price,
    })));
  };

  // Save edited medicine via API
  const saveEdit = async () => {
    if (!editingMedicine) return;

    try {
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
          type: u.type as MedicineUnit['type'],
          quantity: u.quantity,
          price: u.price,
        })),
      });

      if (response.success) {
        toast({
          title: 'Medicine Updated',
          description: `${editFormData.name} has been updated successfully`,
        });
        
        // Refresh medicines from context
        window.location.reload();
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
    }

    setEditingMedicine(null);
  };

  const updateEditUnit = (index: number, field: keyof UnitPrice, value: string | number) => {
    const updated = [...editUnits];
    updated[index] = { ...updated[index], [field]: value };
    setEditUnits(updated);
  };

  const addEditUnit = () => {
    setEditUnits([...editUnits, { type: 'strip', quantity: 10, price: 0 }]);
  };

  const removeEditUnit = (index: number) => {
    if (editUnits.length > 1) {
      setEditUnits(editUnits.filter((_, i) => i !== index));
    }
  };

  // Export medicines to Excel
  const handleExport = () => {
    const exportData = medicines.map(med => ({
      'Medicine Name': med.name,
      'Generic Name': med.genericName || '',
      'Category': med.category,
      'Manufacturer': med.manufacturer || '',
      'Batch Number': med.batchNumber,
      'Expiry Date': format(new Date(med.expiryDate), 'yyyy-MM-dd'),
      'Stock Quantity': med.stockQuantity,
      'Reorder Level': med.reorderLevel,
      'Cost Price': med.costPrice,
      'Selling Price': med.units[0]?.price || 0,
      'Status': med.stockQuantity === 0 ? 'Out of Stock' : med.stockQuantity <= med.reorderLevel ? 'Low Stock' : 'In Stock',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
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
    reader.onload = (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const wb = XLSX.read(binaryStr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;
        data.forEach((row: any) => {
          const medicine: Medicine = {
            id: `med${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: row['Medicine Name'] || row['name'] || '',
            genericName: row['Generic Name'] || row['genericName'] || undefined,
            category: row['Category'] || row['category'] || 'General',
            manufacturer: row['Manufacturer'] || row['manufacturer'] || '',
            batchNumber: row['Batch Number'] || row['batchNumber'] || `BATCH-${Date.now()}`,
            expiryDate: row['Expiry Date'] ? new Date(row['Expiry Date']) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            units: [{
              type: 'single' as const,
              quantity: 1,
              price: parseFloat(row['Selling Price']) || parseFloat(row['sellingPrice']) || 0,
            }],
            stockQuantity: parseInt(row['Stock Quantity']) || parseInt(row['stockQuantity']) || 0,
            reorderLevel: parseInt(row['Reorder Level']) || parseInt(row['reorderLevel']) || 50,
            supplierId: 'sup1',
            costPrice: parseFloat(row['Cost Price']) || parseFloat(row['costPrice']) || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (medicine.name) {
            addMedicine(medicine);
            importedCount++;
          }
        });

        toast({
          title: 'Import Successful',
          description: `${importedCount} medicines imported from Excel`,
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: 'Failed to parse Excel file. Please check the format.',
          variant: 'destructive',
        });
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
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/create-medicine">
              <Button variant="hero">
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
                  <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
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
                  <p className="text-sm text-muted-foreground">Stock Value</p>
                  <p className="text-2xl font-bold">KSh {totalValue.toLocaleString()}</p>
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
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                          {med.stockQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">KSh {med.costPrice}</TableCell>
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
                          <Button variant="ghost" size="sm" onClick={() => startEdit(med)}>
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name</Label>
                  <Input
                    value={editFormData.genericName}
                    onChange={(e) => setEditFormData({ ...editFormData, genericName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Number *</Label>
                  <Input
                    value={editFormData.batchNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, batchNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date *</Label>
                  <Input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={editFormData.stockQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    value={editFormData.costPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                  />
                </div>
              </div>

              {/* Unit Prices */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Pricing Units</Label>
                {editUnits.map((unit, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <Select
                        value={unit.type}
                        onValueChange={(value) => updateEditUnit(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unit type" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={unit.quantity}
                        onChange={(e) => updateEditUnit(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Quantity"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                        <Input
                          type="number"
                          value={unit.price}
                          onChange={(e) => updateEditUnit(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                          className="pl-12"
                        />
                      </div>
                    </div>
                    {editUnits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeEditUnit(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addEditUnit} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Unit
                </Button>
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditingMedicine(null)}>
                  Cancel
                </Button>
                <Button variant="hero" className="flex-1" onClick={saveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
