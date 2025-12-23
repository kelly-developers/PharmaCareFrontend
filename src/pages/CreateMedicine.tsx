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
    { type: 'SINGLE', quantity: 1, price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
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
    sellingPrice: '0',
    description: '',
  });

  // Helper function to check if date is valid
  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Helper function to validate price units
  const validateUnits = () => {
    for (const unit of units) {
      if (unit.quantity <= 0) {
        return { valid: false, message: 'Unit quantity must be greater than 0' };
      }
      if (unit.price < 0) {
        return { valid: false, message: 'Unit price cannot be negative' };
      }
    }
    return { valid: true };
  };

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

  const addUnit = () => {
    setUnits([...units, { type: 'STRIP', quantity: 10, price: 0 }]);
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

    // Validate units
    const unitValidation = validateUnits();
    if (!unitValidation.valid) {
      toast({
        title: 'Error',
        description: unitValidation.message || 'Invalid unit data',
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
        // Do NOT send supplierId unless it's a valid UUID
        // supplierId: undefined, // Remove this line completely
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Initial Stock Quantity</Label>
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
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
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
                  <Label htmlFor="costPrice">Buying Price (per unit)</Label>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price (per unit)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      id="sellingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      placeholder="0"
                      className="pl-12"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Units
              </CardTitle>
              <CardDescription>Set prices for different selling units</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {units.map((unit, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`unit-type-${index}`} className="text-xs">Unit Type</Label>
                      <Select
                        value={unit.type}
                        onValueChange={(value) => updateUnit(index, 'type', value)}
                      >
                        <SelectTrigger id={`unit-type-${index}`}>
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
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`unit-quantity-${index}`} className="text-xs">Quantity</Label>
                      <Input
                        id={`unit-quantity-${index}`}
                        type="number"
                        min="1"
                        value={unit.quantity}
                        onChange={(e) => updateUnit(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="Quantity"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`unit-price-${index}`} className="text-xs">Price (KSh)</Label>
                      <div className="relative">
                        <Input
                          id={`unit-price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={unit.price}
                          onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                        />
                      </div>
                    </div>
                  </div>
                  {units.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => removeUnit(index)}
                      title="Remove unit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addUnit} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Unit
              </Button>
              <p className="text-xs text-muted-foreground">
                Example: A strip might contain 10 tablets. Set the quantity to 10 and price for the whole strip.
              </p>
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