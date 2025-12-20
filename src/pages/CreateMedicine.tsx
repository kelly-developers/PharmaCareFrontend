import { useState } from 'react';
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
} from 'lucide-react';
import { Medicine, MedicineUnit } from '@/types/pharmacy';

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

export default function CreateMedicine() {
  const { toast } = useToast();
  const { addMedicine } = useStock();
  const { getCategoryNames, incrementMedicineCount } = useCategories();
  const navigate = useNavigate();
  
  const categories = getCategoryNames();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitPrice[]>([
    { type: 'single', quantity: 1, price: 0 },
  ]);
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: '',
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    stockQuantity: '',
    reorderLevel: '',
    costPrice: '',
    sellingPrice: '',
    description: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addUnit = () => {
    setUnits([...units, { type: 'strip', quantity: 10, price: 0 }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.category || !formData.batchNumber || !formData.expiryDate) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Create medicine object
    const medicine: Medicine = {
      id: `med${Date.now()}`,
      name: formData.name,
      genericName: formData.genericName || undefined,
      category: formData.category,
      manufacturer: formData.manufacturer,
      batchNumber: formData.batchNumber,
      expiryDate: new Date(formData.expiryDate),
      units: units.map(u => ({
        type: u.type as MedicineUnit['type'],
        quantity: u.quantity,
        price: u.price,
      })),
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      reorderLevel: parseInt(formData.reorderLevel) || 50,
      supplierId: 'sup1',
      costPrice: parseFloat(formData.costPrice) || 0,
      imageUrl: imagePreview || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to stock context
    addMedicine(medicine);
    
    // Increment category medicine count
    incrementMedicineCount(formData.category);

    toast({
      title: 'Medicine Created',
      description: `${formData.name} has been added to the inventory`,
    });

    // Navigate back to medicine categories (pharmacist's area)
    navigate('/medicine-categories');
  };

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
                  <Label>Medicine Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paracetamol 500mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name</Label>
                  <Input
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g., Acetaminophen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Manufacturer</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., GSK Kenya"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
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
              <CardDescription>Upload an image of the medicine package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-secondary/50">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
                  <Label>Batch Number *</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="e.g., PCM-2024-001"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Initial Stock Quantity</Label>
                  <Input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buying Price (per unit)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="0"
                      className="pl-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (per unit)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                    <Input
                      type="number"
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
                    <Select
                      value={unit.type}
                      onValueChange={(value) => updateUnit(index, 'type', value)}
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
                      onChange={(e) => updateUnit(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Quantity"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span>
                      <Input
                        type="number"
                        value={unit.price}
                        onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="pl-12"
                      />
                    </div>
                  </div>
                  {units.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeUnit(index)}
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
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create Medicine
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}