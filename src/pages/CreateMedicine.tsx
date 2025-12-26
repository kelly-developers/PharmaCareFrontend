import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStock } from '@/contexts/StockContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pill,
  Image as ImageIcon,
  Upload,
  Package,
  DollarSign,
  Calendar,
  Building2,
  Hash,
  X,
  Loader2,
  Calculator,
  Box,
} from 'lucide-react';
import { Medicine, MedicineUnit } from '@/types/pharmacy';
import { medicineService } from '@/services/medicineService';

const unitTypes = [
  { value: 'SINGLE', label: 'Single/Tablet' },
  { value: 'STRIP', label: 'Strip' },
  { value: 'BOX', label: 'Box' },
  { value: 'PAIR', label: 'Pair' },
  { value: 'BOTTLE', label: 'Bottle' },
];

interface UnitPrice {
  type: string;
  quantity: number;
  price: number;
}

export default function CreateMedicine() {
  const { toast } = useToast();
  const { addMedicine, refreshMedicines } = useStock();
  const { getCategoryNames, incrementMedicineCount, refreshCategories } = useCategories();
  const navigate = useNavigate();
  
  const categories = getCategoryNames();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [units, setUnits] = useState<UnitPrice[]>([
    { type: 'BOX', quantity: 100, price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [pricingMethod, setPricingMethod] = useState<'box' | 'perTablet'>('box');
  const [tabletsPerBox, setTabletsPerBox] = useState<number>(100);
  const [tabletsPerStrip, setTabletsPerStrip] = useState<number>(10);
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: '',
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    stockQuantity: '0',
    reorderLevel: '50',
    costPrice: '0',
    sellingPricePerTablet: '0',
    description: '',
  });

  // Helper function to check if date is valid
  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Calculate price per tablet from box price
  const calculatePerTabletPrice = () => {
    if (pricingMethod === 'box' && units.length > 0) {
      const boxUnit = units.find(unit => unit.type === 'BOX');
      if (boxUnit && tabletsPerBox > 0) {
        const pricePerTablet = boxUnit.price / tabletsPerBox;
        setFormData(prev => ({
          ...prev,
          sellingPricePerTablet: pricePerTablet.toFixed(2)
        }));
        
        // Also update SINGLE unit price
        const updatedUnits = [...units];
        const singleIndex = updatedUnits.findIndex(unit => unit.type === 'SINGLE');
        if (singleIndex > -1) {
          updatedUnits[singleIndex].price = parseFloat(pricePerTablet.toFixed(2));
        }
        setUnits(updatedUnits);
      }
    }
  };

  // Calculate box price from per-tablet price
  const calculateBoxPrice = () => {
    if (pricingMethod === 'perTablet' && tabletsPerBox > 0) {
      const perTabletPrice = parseFloat(formData.sellingPricePerTablet) || 0;
      const boxPrice = perTabletPrice * tabletsPerBox;
      
      // Update BOX unit price
      const updatedUnits = [...units];
      const boxIndex = updatedUnits.findIndex(unit => unit.type === 'BOX');
      if (boxIndex > -1) {
        updatedUnits[boxIndex].price = parseFloat(boxPrice.toFixed(2));
      }
      setUnits(updatedUnits);
    }
  };

  // Update units based on tablets per box and strip
  const updateUnitQuantities = () => {
    const updatedUnits = units.map(unit => {
      if (unit.type === 'BOX') {
        return { ...unit, quantity: tabletsPerBox };
      } else if (unit.type === 'STRIP') {
        return { ...unit, quantity: tabletsPerStrip };
      } else if (unit.type === 'SINGLE') {
        return { ...unit, quantity: 1 };
      }
      return unit;
    });
    setUnits(updatedUnits);
  };

  // Initialize units when component mounts
  useEffect(() => {
    updateUnitQuantities();
  }, [tabletsPerBox, tabletsPerStrip]);

  // Handle pricing method change
  useEffect(() => {
    if (pricingMethod === 'box') {
      calculatePerTabletPrice();
    } else {
      calculateBoxPrice();
    }
  }, [pricingMethod, tabletsPerBox]);

  // Add or remove units based on selection
  const initializeUnits = () => {
    const defaultUnits: UnitPrice[] = [];
    
    // Always include SINGLE and BOX
    defaultUnits.push(
      { type: 'SINGLE', quantity: 1, price: 0 },
      { type: 'BOX', quantity: tabletsPerBox, price: 0 }
    );
    
    // Include STRIP if tabletsPerStrip > 0
    if (tabletsPerStrip > 0) {
      defaultUnits.push({ type: 'STRIP', quantity: tabletsPerStrip, price: 0 });
    }
    
    setUnits(defaultUnits);
  };

  useEffect(() => {
    initializeUnits();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
    }
  };

  const removeUnit = (index: number) => {
    if (units.length > 1) {
      setUnits(units.filter((_, i) => i !== index));
    }
  };

  const updateUnit = (index: number, field: keyof UnitPrice, value: string | number) => {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    setUnits(updated);
    
    // If BOX price changes and pricing method is box, recalculate per tablet price
    if (field === 'price' && updated[index].type === 'BOX' && pricingMethod === 'box') {
      calculatePerTabletPrice();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.category || !formData.batchNumber || !formData.expiryDate) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields (Name, Category, Batch Number, Expiry Date)',
        variant: 'destructive',
      });
      return;
    }

    // Validate expiry date
    if (!isValidDate(formData.expiryDate)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid expiry date',
        variant: 'destructive',
      });
      return;
    }

    // Check if expiry date is in the future
    const expiryDate = new Date(formData.expiryDate);
    if (expiryDate <= new Date()) {
      toast({
        title: 'Error',
        description: 'Expiry date must be in the future',
        variant: 'destructive',
      });
      return;
    }

    if (units.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one pricing unit',
        variant: 'destructive',
      });
      return;
    }

    // Validate tablets per box and strip
    if (tabletsPerBox <= 0) {
      toast({
        title: 'Error',
        description: 'Tablets per box must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (tabletsPerStrip <= 0) {
      toast({
        title: 'Error',
        description: 'Tablets per strip must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare medicine data for backend
      const medicineData = {
        name: formData.name.trim(),
        genericName: formData.genericName.trim() || undefined,
        category: formData.category,
        manufacturer: formData.manufacturer.trim(),
        batchNumber: formData.batchNumber.trim(),
        expiryDate: formData.expiryDate, // Already in YYYY-MM-DD format from input type="date"
        units: units.map(u => ({
          type: u.type,
          quantity: u.quantity,
          price: parseFloat(u.price.toString()),
        })),
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 50,
        costPrice: parseFloat(formData.costPrice) || 0,
        imageUrl: imagePreview || undefined,
      };

      console.log('Sending medicine data:', medicineData);

      // Call backend API
      const response = await medicineService.create(medicineData);
      
      console.log('Backend response:', response);
      
      if (response.success && response.data) {
        const newMedicine: Medicine = {
          ...response.data,
          id: response.data.id,
          name: response.data.name,
          genericName: response.data.genericName,
          category: response.data.category,
          manufacturer: response.data.manufacturer,
          batchNumber: response.data.batchNumber,
          expiryDate: new Date(response.data.expiryDate),
          units: response.data.units || [],
          stockQuantity: response.data.stockQuantity || 0,
          reorderLevel: response.data.reorderLevel || 50,
          supplierId: response.data.supplierId || undefined, // Keep as undefined if not provided
          costPrice: response.data.costPrice || 0,
          imageUrl: response.data.imageUrl,
          createdAt: new Date(response.data.createdAt || new Date()),
          updatedAt: new Date(response.data.updatedAt || new Date()),
        };

        // Add to local context
        addMedicine(newMedicine);
        
        // Increment category medicine count
        incrementMedicineCount(formData.category);

        toast({
          title: 'Success!',
          description: `${formData.name} has been successfully added to the inventory`,
        });

        // Refresh data
        await refreshMedicines();
        await refreshCategories?.();

        // Navigate back to medicine categories
        navigate('/medicine-categories');
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create medicine. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error creating medicine:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Set minimum date to today for expiry date
  const today = new Date().toISOString().split('T')[0];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Create Medicine</h1>
          <p className="text-muted-foreground mt-1">Add a new medicine to the inventory system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Enter the medicine details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Medicine Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paracetamol 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genericName">Generic Name</Label>
                  <Input
                    id="genericName"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g., Acetaminophen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., GSK Kenya"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the medicine, usage, and dosage instructions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Medicine Image
              </CardTitle>
              <CardDescription>Upload an image of the medicine package (Optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-secondary/50">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={() => setImagePreview(null)}
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-secondary transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Upload Image</span>
                    </div>
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch & Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch & Stock Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">
                    Batch Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="batchNumber"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="e.g., PCM-2024-001"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">
                    Expiry Date <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="pl-10"
                      min={today}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tablets Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
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
                      updateUnitQuantities();
                    }}
                    placeholder="e.g., 100"
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
                      updateUnitQuantities();
                    }}
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">Tablets in one strip</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Initial Stock Quantity (Tablets)</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder Level (Tablets)</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="e.g., 100"
                  />
                  <p className="text-xs text-muted-foreground">Low stock alert threshold</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Buying Price (per Box)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      id="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="0"
                      className="pl-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Price you pay for one box</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>Set pricing method and calculate prices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Method Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Pricing Method</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={pricingMethod === 'box' ? "default" : "outline"}
                    className={`h-auto py-4 ${pricingMethod === 'box' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setPricingMethod('box')}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Box className="h-6 w-6" />
                      <span className="font-medium">Set Box Price</span>
                      <span className="text-xs opacity-80">Price per tablet calculated automatically</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={pricingMethod === 'perTablet' ? "default" : "outline"}
                    className={`h-auto py-4 ${pricingMethod === 'perTablet' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setPricingMethod('perTablet')}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Pill className="h-6 w-6" />
                      <span className="font-medium">Set Per-Tablet Price</span>
                      <span className="text-xs opacity-80">Box price calculated automatically</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Price Input based on Method */}
              <div className="space-y-4">
                {pricingMethod === 'box' ? (
                  <div className="space-y-2">
                    <Label htmlFor="boxPrice">Selling Price (per Box)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                      <Input
                        id="boxPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={units.find(u => u.type === 'BOX')?.price || 0}
                        onChange={(e) => {
                          const boxPrice = parseFloat(e.target.value) || 0;
                          const boxUnitIndex = units.findIndex(u => u.type === 'BOX');
                          if (boxUnitIndex > -1) {
                            updateUnit(boxUnitIndex, 'price', boxPrice);
                          }
                        }}
                        placeholder="Enter box selling price"
                        className="pl-12"
                      />
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Price per tablet:</span> KSh{' '}
                        <span className="text-lg font-bold text-primary">
                          {formData.sellingPricePerTablet}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated: Box Price ÷ {tabletsPerBox} tablets = KSh {formData.sellingPricePerTablet} per tablet
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="perTabletPrice">Selling Price (per Tablet)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                      <Input
                        id="perTabletPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sellingPricePerTablet}
                        onChange={(e) => {
                          setFormData({ ...formData, sellingPricePerTablet: e.target.value });
                        }}
                        placeholder="Enter price per tablet"
                        className="pl-12"
                      />
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Box price:</span> KSh{' '}
                        <span className="text-lg font-bold text-primary">
                          {(parseFloat(formData.sellingPricePerTablet) * tabletsPerBox).toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated: {formData.sellingPricePerTablet} × {tabletsPerBox} tablets = KSh {(parseFloat(formData.sellingPricePerTablet) * tabletsPerBox).toFixed(2)} per box
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Summary */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Pricing Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Single Tablet</p>
                    <p className="text-lg font-bold">KSh {units.find(u => u.type === 'SINGLE')?.price?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Strip ({tabletsPerStrip} tablets)</p>
                    <p className="text-lg font-bold">KSh {units.find(u => u.type === 'STRIP')?.price?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Box ({tabletsPerBox} tablets)</p>
                    <p className="text-lg font-bold">KSh {units.find(u => u.type === 'BOX')?.price?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Markup</p>
                    <p className="text-lg font-bold text-primary">
                      {(() => {
                        const cost = parseFloat(formData.costPrice) || 0;
                        const boxPrice = units.find(u => u.type === 'BOX')?.price || 0;
                        if (cost === 0) return 'N/A';
                        const markup = ((boxPrice - cost) / cost * 100).toFixed(1);
                        return `${markup}%`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="hero" 
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Medicine...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Medicine
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}