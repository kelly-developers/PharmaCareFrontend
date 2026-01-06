// CreateMedicine.tsx - Supports all product types with proper backend integration
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/contexts/CategoriesContext';
import { ProductType } from '@/types/pharmacy';
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
  Trash2,
  RefreshCw,
  Droplets,
  Syringe,
  Box,
  ShoppingBag,
  Scale,
  CircleDot,
  AlertCircle,
  Info,
} from 'lucide-react';
import { medicineService } from '@/services/medicineService';

// Product type configurations
const PRODUCT_TYPES: { value: ProductType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'tablets', label: 'Tablets', icon: <Pill className="h-4 w-4" />, description: 'Regular tablets (single, strip, box)' },
  { value: 'tablets_pair', label: 'Tablet Pairs', icon: <CircleDot className="h-4 w-4" />, description: 'Tablets sold as pairs (e.g., Maramoja)' },
  { value: 'syrup', label: 'Syrup/Bottle', icon: <Droplets className="h-4 w-4" />, description: 'Syrups - one bottle per box' },
  { value: 'liquid_bottle', label: 'Liquid by Size', icon: <Droplets className="h-4 w-4" />, description: 'Liquids sold by bottle size (ml)' },
  { value: 'weight_based', label: 'Weight Based', icon: <Scale className="h-4 w-4" />, description: 'Items sold by weight (grams)' },
  { value: 'individual', label: 'Individual Items', icon: <ShoppingBag className="h-4 w-4" />, description: 'Single items (condoms, Eno, etc.)' },
  { value: 'service', label: 'Service', icon: <Syringe className="h-4 w-4" />, description: 'Services (injections, consultations)' },
  { value: 'box_only', label: 'Box Only', icon: <Box className="h-4 w-4" />, description: 'Sold only per box (e.g., Azithromycin)' },
  { value: 'custom', label: 'Custom', icon: <Package className="h-4 w-4" />, description: 'Define your own units' },
];

interface UnitConfig {
  id: string;
  type: string;
  label: string;
  quantity: number;
  price: number;
}

// Default unit configurations for each product type
const getDefaultUnits = (productType: ProductType): UnitConfig[] => {
  const id = () => Math.random().toString(36).substr(2, 9);
  
  switch (productType) {
    case 'tablets':
      return [
        { id: id(), type: 'TABLET', label: 'Tablet', quantity: 1, price: 0 },
        { id: id(), type: 'STRIP', label: 'Strip (10 tablets)', quantity: 10, price: 0 },
        { id: id(), type: 'BOX', label: 'Box (100 tablets)', quantity: 100, price: 0 },
      ];
    case 'tablets_pair':
      return [
        { id: id(), type: 'PAIR', label: 'Pair (2 tablets)', quantity: 2, price: 0 },
        { id: id(), type: 'STRIP', label: 'Strip (10 tablets)', quantity: 10, price: 0 },
        { id: id(), type: 'BOX', label: 'Box (100 tablets)', quantity: 100, price: 0 },
      ];
    case 'syrup':
      return [
        { id: id(), type: 'BOTTLE', label: 'Bottle (100ml)', quantity: 1, price: 0 },
        { id: id(), type: 'BOX', label: 'Box (1 bottle)', quantity: 1, price: 0 },
      ];
    case 'liquid_bottle':
      return [
        { id: id(), type: 'BOTTLE', label: '100ml Bottle', quantity: 100, price: 0 },
        { id: id(), type: 'BOTTLE', label: '200ml Bottle', quantity: 200, price: 0 },
        { id: id(), type: 'BOTTLE', label: '500ml Bottle', quantity: 500, price: 0 },
      ];
    case 'weight_based':
      return [
        { id: id(), type: 'GRAM', label: 'Per gram', quantity: 1, price: 0 },
        { id: id(), type: 'PACK', label: '50g Pack', quantity: 50, price: 0 },
        { id: id(), type: 'PACK', label: '100g Pack', quantity: 100, price: 0 },
      ];
    case 'individual':
      return [
        { id: id(), type: 'PIECE', label: 'Per piece', quantity: 1, price: 0 },
        { id: id(), type: 'PACK', label: 'Pack', quantity: 1, price: 0 },
      ];
    case 'service':
      return [
        { id: id(), type: 'SERVICE', label: 'Per service', quantity: 1, price: 0 },
      ];
    case 'box_only':
      return [
        { id: id(), type: 'BOX', label: 'Box', quantity: 1, price: 0 },
      ];
    case 'custom':
    default:
      return [
        { id: id(), type: 'UNIT', label: 'Unit', quantity: 1, price: 0 },
      ];
  }
};

export default function CreateMedicine() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { categories: categoryList, isLoading: categoriesLoading, refreshCategories } = useCategories();
  
  const categories = categoryList.map(cat => cat.name);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState<ProductType>('tablets');
  const [units, setUnits] = useState<UnitConfig[]>(getDefaultUnits('tablets'));
  
  // Form data with all fields
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: '',
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    stockQuantity: '0',
    reorderLevel: '10',
    costPrice: '0',
    description: '',
  });

  // Track field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Update units when product type changes
  useEffect(() => {
    setUnits(getDefaultUnits(productType));
  }, [productType]);

  const handleRefreshCategories = async () => {
    await refreshCategories();
    toast({ 
      title: 'Categories refreshed', 
      description: `Found ${categories.length} categories` 
    });
  };

  const isValidDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return true;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: 'Error', 
          description: 'Image size must be less than 5MB', 
          variant: 'destructive' 
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addUnit = () => {
    setUnits([...units, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'UNIT', 
      label: 'New Unit', 
      quantity: 1, 
      price: 0 
    }]);
  };

  const removeUnit = (id: string) => {
    if (units.length > 1) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  const updateUnit = (id: string, field: keyof UnitConfig, value: string | number) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  // Calculate prices from the largest unit
  const calculatePrices = () => {
    if (units.length === 0) return;
    
    const sortedUnits = [...units].sort((a, b) => b.quantity - a.quantity);
    const largestUnit = sortedUnits[0];
    
    if (largestUnit.price <= 0 || largestUnit.quantity <= 0) return;
    
    const pricePerSmallestUnit = largestUnit.price / largestUnit.quantity;
    
    setUnits(units.map(unit => ({
      ...unit,
      price: unit.id === largestUnit.id ? unit.price : parseFloat((pricePerSmallestUnit * unit.quantity).toFixed(2))
    })));
    
    toast({ 
      title: 'Prices calculated', 
      description: 'All unit prices have been updated based on the largest unit price' 
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    // Validate expiry date format if provided
    if (formData.expiryDate && formData.expiryDate.trim() !== '') {
      if (!isValidDate(formData.expiryDate)) {
        errors.expiryDate = 'Please enter a valid date (YYYY-MM-DD)';
      } else {
        const expiryDate = new Date(formData.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (expiryDate <= today) {
          errors.expiryDate = 'Expiry date must be in the future';
        }
      }
    }
    
    // Validate at least one unit has a price
    const hasValidPrice = units.some(u => u.price > 0);
    if (!hasValidPrice) {
      errors.units = 'At least one unit must have a price';
    }
    
    // Validate cost price
    const costPrice = parseFloat(formData.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      errors.costPrice = 'Cost price must be a valid number';
    }
    
    // Validate stock quantity
    const stockQuantity = parseInt(formData.stockQuantity);
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      errors.stockQuantity = 'Stock quantity must be a valid number';
    }
    
    // Validate reorder level
    const reorderLevel = parseInt(formData.reorderLevel);
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      errors.reorderLevel = 'Reorder level must be a valid number';
    }
    
    // Validate units have valid quantities
    units.forEach((unit, index) => {
      if (unit.quantity <= 0) {
        errors[`unit-${index}-quantity`] = 'Unit quantity must be greater than 0';
      }
      if (unit.price < 0) {
        errors[`unit-${index}-price`] = 'Unit price cannot be negative';
      }
    });
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fix the errors in the form', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare medicine data in backend format
      const medicineData = {
        name: formData.name.trim(),
        genericName: formData.genericName.trim() || undefined,
        category: formData.category,
        manufacturer: formData.manufacturer.trim() || undefined,
        batchNumber: formData.batchNumber.trim() || undefined,
        expiryDate: formData.expiryDate.trim() || undefined,
        units: units.map(u => ({
          type: u.type.toUpperCase(),
          quantity: u.quantity,
          price: parseFloat(u.price.toString()),
          label: u.label || u.type
        })),
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 10,
        costPrice: parseFloat(formData.costPrice) || 0,
        imageUrl: imagePreview || undefined,
        description: formData.description.trim() || undefined,
        productType: productType,
      };

      console.log('📤 Sending medicine data to backend:', medicineData);
      
      const response = await medicineService.create(medicineData);
      
      if (response.success && response.data) {
        toast({ 
          title: 'Success!', 
          description: `${formData.name} has been added to inventory` 
        });
        
        // Clear form
        setFormData({
          name: '',
          genericName: '',
          category: '',
          manufacturer: '',
          batchNumber: '',
          expiryDate: '',
          stockQuantity: '0',
          reorderLevel: '10',
          costPrice: '0',
          description: '',
        });
        setUnits(getDefaultUnits(productType));
        setImagePreview(null);
        
        // Navigate after a short delay
        setTimeout(() => navigate('/inventory'), 1000);
      } else {
        toast({ 
          title: 'Error', 
          description: response.error || 'Failed to create medicine', 
          variant: 'destructive' 
        });
        console.error('Backend error:', response.error);
      }
    } catch (error: any) {
      console.error('Error creating medicine:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'An unexpected error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Add New Product</h1>
            <p className="text-muted-foreground mt-1">
              Add any product or service to inventory. Fields marked with * are required.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/inventory')} 
              variant="outline" 
              size="sm"
            >
              View Inventory
            </Button>
            <Button 
              onClick={handleRefreshCategories} 
              variant="outline" 
              size="sm" 
              disabled={categoriesLoading}
            >
              {categoriesLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Categories
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Type
              </CardTitle>
              <CardDescription>Select the type of product to configure units automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {PRODUCT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setProductType(type.value);
                      setUnits(getDefaultUnits(type.value));
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      productType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {type.icon}
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Current type:</strong> {PRODUCT_TYPES.find(t => t.value === productType)?.label}. 
                    This will auto-configure the unit options below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Required fields are marked with *</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (fieldErrors.name) setFieldErrors({...fieldErrors, name: ''});
                    }}
                    placeholder="e.g., Paracetamol 500mg, Spirit 500ml, Cotton Wool 100g"
                    className={fieldErrors.name ? 'border-destructive' : ''}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genericName">Generic Name / Description</Label>
                  <Input
                    id="genericName"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g., Acetaminophen, Hydrogen Peroxide"
                  />
                  <p className="text-xs text-muted-foreground">Optional - for identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value });
                      if (fieldErrors.category) setFieldErrors({...fieldErrors, category: ''});
                    }}
                    disabled={categoriesLoading}
                    required
                  >
                    <SelectTrigger className={fieldErrors.category ? 'border-destructive' : ''}>
                      {categoriesLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading categories...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select category" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      {categories.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">No categories found</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={handleRefreshCategories}
                            className="mt-1"
                          >
                            Refresh
                          </Button>
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.category && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.category}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer / Brand</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., GSK, Johnson & Johnson, Generic"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional Notes</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any additional information about this product (storage instructions, warnings, etc.)"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Product Image
              </CardTitle>
              <CardDescription>Optional - Upload an image of the product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-secondary/50">
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
                  {imagePreview && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setImagePreview(null)} 
                      className="text-destructive hover:text-destructive"
                    >
                      Remove Image
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
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
              <CardDescription>
                Required for tracking inventory. Leave blank for services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="batchNumber"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="e.g., BATCH-2024-001, LOT-12345"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Optional but recommended</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => {
                        setFormData({ ...formData, expiryDate: e.target.value });
                        if (fieldErrors.expiryDate) setFieldErrors({...fieldErrors, expiryDate: ''});
                      }}
                      className={`pl-10 ${fieldErrors.expiryDate ? 'border-destructive' : ''}`}
                      min={tomorrowStr}
                    />
                  </div>
                  {fieldErrors.expiryDate ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.expiryDate}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Optional - Required for perishable items</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Initial Stock Quantity</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stockQuantity}
                    onChange={(e) => {
                      setFormData({ ...formData, stockQuantity: e.target.value });
                      if (fieldErrors.stockQuantity) setFieldErrors({...fieldErrors, stockQuantity: ''});
                    }}
                    placeholder="0"
                    className={fieldErrors.stockQuantity ? 'border-destructive' : ''}
                  />
                  {fieldErrors.stockQuantity ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.stockQuantity}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">In smallest unit (tablets, ml, grams)</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.reorderLevel}
                    onChange={(e) => {
                      setFormData({ ...formData, reorderLevel: e.target.value });
                      if (fieldErrors.reorderLevel) setFieldErrors({...fieldErrors, reorderLevel: ''});
                    }}
                    placeholder="10"
                    className={fieldErrors.reorderLevel ? 'border-destructive' : ''}
                  />
                  {fieldErrors.reorderLevel ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.reorderLevel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Low stock alert threshold</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price (KSh)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      id="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => {
                        setFormData({ ...formData, costPrice: e.target.value });
                        if (fieldErrors.costPrice) setFieldErrors({...fieldErrors, costPrice: ''});
                      }}
                      placeholder="0.00"
                      className={`pl-12 ${fieldErrors.costPrice ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {fieldErrors.costPrice ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.costPrice}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Your buying price per smallest unit</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Stock Information</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Current product:</strong> {formData.name || 'Not set'} | 
                      <strong> Stock:</strong> {formData.stockQuantity} units | 
                      <strong> Cost:</strong> KSh {parseFloat(formData.costPrice).toFixed(2)} per unit
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit & Pricing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Units & Pricing <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>Configure how this product is sold to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldErrors.units && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {fieldErrors.units}
                  </p>
                </div>
              )}

              {/* Units List */}
              <div className="space-y-3">
                {units.map((unit, index) => (
                  <div key={unit.id} className="flex items-end gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Unit Type</Label>
                        <Select value={unit.type} onValueChange={(v) => updateUnit(unit.id, 'type', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border">
                            <SelectItem value="TABLET">Tablet</SelectItem>
                            <SelectItem value="PAIR">Pair</SelectItem>
                            <SelectItem value="STRIP">Strip</SelectItem>
                            <SelectItem value="BOX">Box</SelectItem>
                            <SelectItem value="PACK">Pack</SelectItem>
                            <SelectItem value="BOTTLE">Bottle</SelectItem>
                            <SelectItem value="GRAM">Gram</SelectItem>
                            <SelectItem value="PIECE">Piece</SelectItem>
                            <SelectItem value="SERVICE">Service</SelectItem>
                            <SelectItem value="INJECTION">Injection</SelectItem>
                            <SelectItem value="UNIT">Unit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={unit.label}
                          onChange={(e) => updateUnit(unit.id, 'label', e.target.value)}
                          placeholder="e.g., 500ml Bottle, 50g Pack"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={unit.quantity}
                          onChange={(e) => updateUnit(unit.id, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="1"
                          className={`h-9 ${fieldErrors[`unit-${index}-quantity`] ? 'border-destructive' : ''}`}
                        />
                        {fieldErrors[`unit-${index}-quantity`] && (
                          <p className="text-xs text-destructive">{fieldErrors[`unit-${index}-quantity`]}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price (KSh)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unit.price}
                          onChange={(e) => {
                            updateUnit(unit.id, 'price', parseFloat(e.target.value) || 0);
                            if (fieldErrors.units || fieldErrors[`unit-${index}-price`]) {
                              const newErrors = {...fieldErrors};
                              delete newErrors.units;
                              delete newErrors[`unit-${index}-price`];
                              setFieldErrors(newErrors);
                            }
                          }}
                          placeholder="0.00"
                          className={`h-9 ${fieldErrors[`unit-${index}-price`] ? 'border-destructive' : ''}`}
                        />
                        {fieldErrors[`unit-${index}-price`] && (
                          <p className="text-xs text-destructive">{fieldErrors[`unit-${index}-price`]}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => removeUnit(unit.id)}
                      disabled={units.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" size="sm" onClick={addUnit}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={calculatePrices}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Auto-Calculate Prices
                </Button>
              </div>

              {/* Pricing Preview */}
              {units.some(u => u.price > 0) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium mb-3">Pricing Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {units.filter(u => u.price > 0).map((unit) => (
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
            </CardContent>
          </Card>

          {/* Submit Buttons */}
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
              className="flex-1" 
              disabled={loading || categoriesLoading || categories.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product to Inventory
                </>
              )}
            </Button>
          </div>

          {/* Status Information */}
          {!categoriesLoading && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Categories Status</p>
                <Badge variant={categories.length > 0 ? "default" : "destructive"}>
                  {categories.length} found
                </Badge>
              </div>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Available categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium">
                    No categories available. Please:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Refresh categories using the button above</li>
                    <li>Ensure backend is running</li>
                    <li>Check if categories exist in the database</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </MainLayout>
  );
}