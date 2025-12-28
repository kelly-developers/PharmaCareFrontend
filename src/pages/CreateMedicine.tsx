// components/CreateMedicine.tsx
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar,
  Building2,
  Hash,
  Loader2,
  Calculator,
  Box,
} from 'lucide-react';
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
  const { getCategoryNames, refreshCategories } = useCategories();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [units, setUnits] = useState<UnitPrice[]>([
    { type: 'BOX', quantity: 100, price: 0 },
    { type: 'STRIP', quantity: 10, price: 0 },
    { type: 'SINGLE', quantity: 1, price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tabletsPerBox, setTabletsPerBox] = useState<number>(100);
  const [tabletsPerStrip, setTabletsPerStrip] = useState<number>(10);
  const [boxPrice, setBoxPrice] = useState<string>('0');
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
    description: '',
  });

  // Load categories from backend on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await medicineService.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        // Fallback to local categories if backend fails
        setCategories(getCategoryNames());
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories(getCategoryNames());
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Helper function to check if date is valid
  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Calculate tablet price from box price
  const calculateTabletPrice = (price: number) => {
    if (tabletsPerBox > 0) {
      const tabletPrice = price / tabletsPerBox;
      
      // Update units with calculated prices
      const updatedUnits = units.map(unit => {
        if (unit.type === 'SINGLE') {
          return { ...unit, quantity: 1, price: parseFloat(tabletPrice.toFixed(2)) };
        } else if (unit.type === 'STRIP' && tabletsPerStrip > 0) {
          const stripPrice = tabletPrice * tabletsPerStrip;
          return { ...unit, quantity: tabletsPerStrip, price: parseFloat(stripPrice.toFixed(2)) };
        } else if (unit.type === 'BOX') {
          return { ...unit, quantity: tabletsPerBox, price: parseFloat(price.toFixed(2)) };
        }
        return unit;
      });
      
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
    
    // Recalculate prices if box price is set
    const price = parseFloat(boxPrice) || 0;
    if (price > 0) {
      calculateTabletPrice(price);
    }
  };

  // Initialize units when component mounts
  useEffect(() => {
    updateUnitQuantities();
  }, [tabletsPerBox, tabletsPerStrip]);

  // Handle box price change
  useEffect(() => {
    const price = parseFloat(boxPrice) || 0;
    calculateTabletPrice(price);
  }, [boxPrice]);

  // Initialize default units
  useEffect(() => {
    const defaultUnits: UnitPrice[] = [
      { type: 'SINGLE', quantity: 1, price: 0 },
      { type: 'STRIP', quantity: tabletsPerStrip, price: 0 },
      { type: 'BOX', quantity: tabletsPerBox, price: 0 }
    ];
    setUnits(defaultUnits);
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

    // Validate box price
    const price = parseFloat(boxPrice) || 0;
    if (price <= 0) {
      toast({
        title: 'Error',
        description: 'Selling price must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare medicine data for backend
      const medicineData = {
        name: formData.name.trim(),
        genericName: formData.genericName.trim() || '',
        category: formData.category,
        manufacturer: formData.manufacturer.trim() || '',
        batchNumber: formData.batchNumber.trim(),
        expiryDate: formData.expiryDate,
        units: units.map(u => ({
          type: u.type,
          quantity: u.quantity,
          price: parseFloat(u.price.toString()),
        })),
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 50,
        costPrice: parseFloat(formData.costPrice) || 0,
        imageUrl: imagePreview || '',
        description: formData.description.trim() || ''
      };

      console.log('Sending medicine data to backend:', medicineData);

      // Call backend API
      const response = await medicineService.create(medicineData);
      
      console.log('Backend response:', response);
      
      if (response.success && response.data) {
        toast({
          title: 'Success!',
          description: `${formData.name} has been successfully added to the inventory`,
        });

        // Refresh categories
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

  // Calculate tablet price for display
  const tabletPrice = tabletsPerBox > 0 ? (parseFloat(boxPrice) || 0) / tabletsPerBox : 0;
  const stripPrice = tabletsPerStrip > 0 ? tabletPrice * tabletsPerStrip : 0;

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
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger id="category">
                      {categoriesLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading categories...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select category" />
                      )}
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
                Pricing
              </CardTitle>
              <CardDescription>Enter the selling price for the entire box</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    value={boxPrice}
                    onChange={(e) => setBoxPrice(e.target.value)}
                    placeholder="Enter selling price for entire box"
                    className="pl-12"
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
                        KSh {tabletPrice.toFixed(2)}
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
                        KSh {stripPrice.toFixed(2)}
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
                    <p className="text-lg font-bold">KSh {tabletPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Strip ({tabletsPerStrip} tablets)
                    </p>
                    <p className="text-lg font-bold">KSh {stripPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Box ({tabletsPerBox} tablets)
                    </p>
                    <p className="text-lg font-bold">KSh {parseFloat(boxPrice).toFixed(2)}</p>
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
                          const cost = parseFloat(formData.costPrice) || 0;
                          const sellingPrice = parseFloat(boxPrice) || 0;
                          if (cost === 0) return 'N/A';
                          const markup = ((sellingPrice - cost) / cost * 100).toFixed(1);
                          return `${markup}%`;
                        })()}
                      </p>
                    </div>
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