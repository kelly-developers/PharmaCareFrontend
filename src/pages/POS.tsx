import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SaleItem, UnitType, Sale } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStock } from '@/contexts/StockContext';
import { useSales } from '@/contexts/SalesContext';
import { usePrescriptions, Prescription } from '@/contexts/PrescriptionsContext';
import { useCategories } from '@/contexts/CategoriesContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
  Printer,
  Image as ImageIcon,
  User,
  Phone,
  Filter,
  Clock,
  X,
  FileText,
  CheckCircle,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { getUnitLabel } from '@/types/pharmacy';

// Store carts per cashier in memory
const cashierCarts: Record<string, SaleItem[]> = {};

export default function POS() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const { toast } = useToast();
  const { user } = useAuth();
  const { medicines, deductStock } = useStock();
  const { addSale } = useSales();
  const { getPendingPrescriptions, updatePrescriptionStatus } = usePrescriptions();
  const { categories: categoryList } = useCategories();
  
  // Get category names from context
  const categories = categoryList.map(cat => cat.name);
  
  const pendingPrescriptions = getPendingPrescriptions();
  const [activeTab, setActiveTab] = useState<'products' | 'prescriptions'>('products');
  const [loadedPrescriptionId, setLoadedPrescriptionId] = useState<string | null>(null);
  
  // Get cart for current cashier
  const cashierId = user?.id || 'guest';
  const [cart, setCart] = useState<SaleItem[]>(() => {
    return cashierCarts[cashierId] || [];
  });

  // Sync cart with cashier-specific storage
  useEffect(() => {
    cashierCarts[cashierId] = cart;
  }, [cart, cashierId]);

  // Load cashier's cart on mount or user change
  useEffect(() => {
    setCart(cashierCarts[cashierId] || []);
  }, [cashierId]);

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || med.category === selectedCategory;
    const inStock = med.stockQuantity > 0;
    return matchesSearch && matchesCategory && inStock;
  });

  const addToCart = (medicineId: string, unitType: UnitType) => {
    const medicine = medicines.find((m) => m.id === medicineId);
    if (!medicine) return;

    const unit = medicine.units.find((u) => u.type === unitType);
    if (!unit) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.medicineId === medicineId && item.unitType === unitType
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].totalPrice = updated[existingIndex].quantity * unit.price;
        return updated;
      }

      return [
        ...prev,
        {
          medicineId,
          medicineName: medicine.name,
          unitType,
          quantity: 1,
          unitPrice: unit.price,
          totalPrice: unit.price,
          costPrice: medicine.costPrice * unit.quantity,
        },
      ];
    });

    toast({
      title: 'Added to cart',
      description: `${medicine.name} (${getUnitLabel(unitType)})`,
      duration: 1500,
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      updated[index].totalPrice = newQty * updated[index].unitPrice;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    setCart((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: 'Removed from cart',
      description: `${item.medicineName} (${getUnitLabel(item.unitType)})`,
      duration: 1500,
    });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setLoadedPrescriptionId(null);
    toast({
      title: 'Cart cleared',
      description: 'All items have been removed',
      duration: 1500,
    });
  };

  // Parse dosage to extract quantity (e.g., "2 abletss" -> 2, "1 tablet" -> 1)
  const parseDosageQuantity = (dosage: string): number => {
    const match = dosage.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Parse frequency to get times per day (e.g., "Three times daily" -> 3, "Twice daily" -> 2)
  const parseFrequency = (frequency: string): number => {
    const lower = frequency.toLowerCase();
    if (lower.includes('once') || lower.includes('1 time') || lower.includes('daily')) {
      if (lower.includes('twice') || lower.includes('two times') || lower.includes('2 times')) return 2;
      if (lower.includes('three times') || lower.includes('3 times') || lower.includes('thrice')) return 3;
      if (lower.includes('four times') || lower.includes('4 times')) return 4;
      return 1;
    }
    if (lower.includes('twice') || lower.includes('two times') || lower.includes('2 times') || lower.includes('bd') || lower.includes('b.d')) return 2;
    if (lower.includes('three times') || lower.includes('3 times') || lower.includes('thrice') || lower.includes('tds') || lower.includes('t.d.s')) return 3;
    if (lower.includes('four times') || lower.includes('4 times') || lower.includes('qds') || lower.includes('q.d.s')) return 4;
    if (lower.includes('every 6 hours') || lower.includes('6 hourly')) return 4;
    if (lower.includes('every 8 hours') || lower.includes('8 hourly')) return 3;
    if (lower.includes('every 12 hours') || lower.includes('12 hourly')) return 2;
    const match = frequency.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Parse duration to get number of days (e.g., "7 days" -> 7, "2 weeks" -> 14)
  const parseDuration = (duration: string): number => {
    const lower = duration.toLowerCase();
    const match = duration.match(/(\d+)/);
    const num = match ? parseInt(match[1], 10) : 1;
    if (lower.includes('week')) return num * 7;
    if (lower.includes('month')) return num * 30;
    return num; // assume days
  };

  // Load prescription items to cart with calculated quantities
  const loadPrescriptionToCart = (prescription: Prescription) => {
    // Set customer info from prescription
    setCustomerName(prescription.patientName);
    setCustomerPhone(prescription.patientPhone);
    setLoadedPrescriptionId(prescription.id);
    
    // Try to match prescription items with available medicines
    const newCartItems: SaleItem[] = [];
    
    prescription.items.forEach(item => {
      // Find matching medicine by name (case-insensitive partial match)
      const medicine = medicines.find(med => 
        med.name.toLowerCase().includes(item.medicine.toLowerCase()) ||
        item.medicine.toLowerCase().includes(med.name.toLowerCase())
      );
      
      if (medicine && medicine.stockQuantity > 0) {
        // Calculate total quantity from prescription details
        const dosageQty = parseDosageQuantity(item.dosage);
        const frequencyPerDay = parseFrequency(item.frequency);
        const durationDays = parseDuration(item.duration);
        const totalQuantity = dosageQty * frequencyPerDay * durationDays;
        
        const unit = medicine.units[0]; // Use default unit
        const quantity = Math.min(totalQuantity, medicine.stockQuantity); // Don't exceed stock
        
        newCartItems.push({
          medicineId: medicine.id,
          medicineName: medicine.name,
          unitType: unit.type,
          quantity,
          unitPrice: unit.price,
          totalPrice: unit.price * quantity,
          costPrice: medicine.costPrice * unit.quantity,
        });
      }
    });
    
    if (newCartItems.length > 0) {
      setCart(newCartItems);
      toast({
        title: 'Prescription loaded',
        description: `${newCartItems.length} item(s) added to cart for ${prescription.patientName}`,
      });
    } else {
      toast({
        title: 'No matching medicines',
        description: 'Could not find matching medicines in stock for this prescription',
        variant: 'destructive',
      });
    }
    
    setActiveTab('products');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = 0;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    const sale: Sale = {
      id: `INV-${Date.now()}`,
      items: cart,
      subtotal,
      discount: 0,
      tax,
      total,
      paymentMethod,
      cashierId: user?.id || '',
      cashierName: user?.name || '',
      customerName: customerName || 'Walk-in',
      customerPhone: customerPhone || undefined,
      createdAt: new Date(),
    };
    
    setLastSale(sale);
    
    // Deduct stock for each item sold with tracking
    cart.forEach(item => {
      deductStock(
        item.medicineId, 
        item.quantity, 
        item.unitType,
        sale.id,
        user?.name || 'Unknown',
        user?.role || 'cashier'
      );
    });
    
    // Store sale in SalesContext
    addSale(sale);
    
    // Mark prescription as dispensed if loaded from prescription
    if (loadedPrescriptionId) {
      updatePrescriptionStatus(loadedPrescriptionId, 'DISPENSED', user?.name);
      setLoadedPrescriptionId(null);
    }
    
    toast({
      title: 'Sale Complete!',
      description: `Payment of KSh ${total.toLocaleString()} received via ${paymentMethod.toUpperCase()}`,
    });
    
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setShowReceipt(true);
    
    // Auto print receipt
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-6rem)] flex flex-col gap-3 p-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Point of Sale</h1>
            <p className="text-xs lg:text-sm text-muted-foreground">Fast and efficient checkout</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {format(new Date(), 'HH:mm')}
            </Badge>
            <Badge className="bg-primary/10 text-primary text-xs">
              {user?.name || 'Cashier'}
            </Badge>
          </div>
        </div>

        {/* Mobile Cart Summary */}
        <div className="lg:hidden">
          {cart.length > 0 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{cart.length} item(s)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">KSh {total.toLocaleString()}</span>
                  <Button 
                    size="sm" 
                    variant="default"
                    className="h-8"
                    onClick={handleCheckout}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 overflow-hidden">
          {/* Products/Prescriptions Section */}
          <div className="lg:col-span-2 flex flex-col min-h-0 bg-card rounded-lg border overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('products')}
                className={cn(
                  "flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                  activeTab === 'products' 
                    ? "bg-primary/10 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Package className="h-4 w-4" />
                Products
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={cn(
                  "flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative",
                  activeTab === 'prescriptions' 
                    ? "bg-primary/10 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Prescriptions
                {pendingPrescriptions.length > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-destructive">
                    {pendingPrescriptions.length}
                  </Badge>
                )}
              </button>
            </div>

            {activeTab === 'products' ? (
              <>
                {/* Search & Filters */}
                <div className="p-3 space-y-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medicines by name or generic..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Categories:</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant={selectedCategory === null ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedCategory(null)}
                      >
                        All
                      </Button>
                      {categories.map((cat) => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Products Grid */}
                <ScrollArea className="flex-1 p-2">
                  {filteredMedicines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <Package className="h-16 w-16 text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">No medicines found</p>
                      <p className="text-sm text-muted-foreground/60">Try a different search</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-4">
                      {filteredMedicines.map((medicine) => (
                        <div
                          key={medicine.id}
                          className="group relative rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => addToCart(medicine.id, medicine.units[0].type)}
                        >
                          <div className="p-2">
                            {/* Stock Indicator */}
                            <div className="absolute top-2 right-2">
                              <Badge 
                                className="text-[10px] px-1.5 py-0.5 h-4 bg-destructive text-destructive-foreground font-bold"
                              >
                                {medicine.stockQuantity}
                              </Badge>
                            </div>
                            
                            {/* Image */}
                            <div className="w-full h-14 mb-2 rounded bg-secondary/50 flex items-center justify-center overflow-hidden">
                              {medicine.imageUrl ? (
                                <img 
                                  src={medicine.imageUrl} 
                                  alt={medicine.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                              )}
                            </div>
                            
                            {/* Details */}
                            <div className="space-y-0.5">
                              <h3 className="font-medium text-xs leading-tight line-clamp-1">
                                {medicine.name}
                              </h3>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {medicine.genericName || medicine.category}
                              </p>
                              
                              {/* Unit Prices */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {medicine.units.slice(0, 2).map((unit) => (
                                  <Button
                                    key={unit.type}
                                    variant="outline"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(medicine.id, unit.type);
                                    }}
                                  >
                                    <Plus className="h-2 w-2 mr-0.5" />
                                    {getUnitLabel(unit.type)} {unit.price}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              /* Prescriptions Tab */
              <ScrollArea className="flex-1 p-3">
                {pendingPrescriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <FileText className="h-16 w-16 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">No pending prescriptions</p>
                    <p className="text-sm text-muted-foreground/60">All prescriptions have been dispensed</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPrescriptions.map((prescription) => {
                      // Calculate quantities for each item
                      const itemsWithQuantities = prescription.items.map(item => {
                        const dosageQty = parseDosageQuantity(item.dosage);
                        const frequencyPerDay = parseFrequency(item.frequency);
                        const durationDays = parseDuration(item.duration);
                        const totalQuantity = dosageQty * frequencyPerDay * durationDays;
                        
                        // Find matching medicine for price
                        const medicine = medicines.find(med => 
                          med.name.toLowerCase().includes(item.medicine.toLowerCase()) ||
                          item.medicine.toLowerCase().includes(med.name.toLowerCase())
                        );
                        const unitPrice = medicine?.units[0]?.price || 0;
                        const inStock = medicine ? medicine.stockQuantity >= totalQuantity : false;
                        const availableStock = medicine?.stockQuantity || 0;
                        
                        return {
                          ...item,
                          dosageQty,
                          frequencyPerDay,
                          durationDays,
                          totalQuantity,
                          unitPrice,
                          totalPrice: unitPrice * totalQuantity,
                          inStock,
                          availableStock,
                          medicineName: medicine?.name || item.medicine,
                        };
                      });
                      
                      const totalAmount = itemsWithQuantities.reduce((sum, item) => sum + item.totalPrice, 0);
                      
                      return (
                        <Card key={prescription.id} className="border-l-4 border-l-warning">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {prescription.id}
                                  </Badge>
                                  <Badge className="bg-warning/20 text-warning-foreground text-xs">
                                    Pending
                                  </Badge>
                                </div>
                                <h3 className="font-semibold">{prescription.patientName}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {prescription.patientPhone}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{format(new Date(prescription.createdAt), 'dd/MM/yyyy')}</p>
                                <p>{format(new Date(prescription.createdAt), 'HH:mm')}</p>
                              </div>
                            </div>
                            
                            <div className="mb-3 p-2 bg-accent/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Diagnosis:</p>
                              <p className="text-sm font-medium">{prescription.diagnosis}</p>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-2 font-medium">Prescribed Items:</p>
                              <div className="space-y-2">
                                {itemsWithQuantities.map((item, idx) => (
                                  <div key={idx} className="bg-accent/50 rounded-lg p-3 border">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="font-semibold text-sm">{item.medicineName}</p>
                                        <p className="text-xs text-muted-foreground">{item.instructions}</p>
                                      </div>
                                      {!item.inStock && (
                                        <Badge variant="destructive" className="text-[10px]">
                                          Low Stock ({item.availableStock})
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                      <div className="bg-background/50 rounded p-1.5 text-center">
                                        <p className="text-muted-foreground">Dosage</p>
                                        <p className="font-medium">{item.dosage}</p>
                                      </div>
                                      <div className="bg-background/50 rounded p-1.5 text-center">
                                        <p className="text-muted-foreground">Frequency</p>
                                        <p className="font-medium">{item.frequency}</p>
                                      </div>
                                      <div className="bg-background/50 rounded p-1.5 text-center">
                                        <p className="text-muted-foreground">Duration</p>
                                        <p className="font-medium">{item.duration}</p>
                                      </div>
                                    </div>
                                    
                                    <Separator className="my-2" />
                                    
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-4">
                                        <span className="text-muted-foreground">
                                          Calculation: {item.dosageQty} × {item.frequencyPerDay}/day × {item.durationDays} days
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="font-mono">
                                          {item.totalQuantity} tabs
                                        </Badge>
                                        {item.unitPrice > 0 && (
                                          <>
                                            <span className="text-muted-foreground">@ KSh {item.unitPrice}</span>
                                            <span className="font-bold text-primary">
                                              = KSh {item.totalPrice.toLocaleString()}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {prescription.notes && (
                              <div className="mb-3 p-2 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                                <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                                <p className="text-sm italic">{prescription.notes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Prescribed by: <span className="font-medium">{prescription.createdBy}</span>
                                </p>
                                {totalAmount > 0 && (
                                  <p className="text-sm font-bold text-primary mt-1">
                                    Total: KSh {totalAmount.toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => loadPrescriptionToCart(prescription)}
                                className="gap-2"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Load to Cart
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          {/* Cart Section */}
          <div className="hidden lg:flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col h-full border-2 border-primary/10">
              <CardHeader className="pb-2 pt-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Cart</span>
                    <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px]">
                      {cart.length}
                    </Badge>
                  </CardTitle>
                  {cart.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearCart}
                      className="h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Cart is empty</p>
                    <p className="text-xs text-muted-foreground/60">Add medicines to begin</p>
                  </div>
                ) : (
                  <>
                    {/* Customer Info */}
                    <div className="p-3 border-b bg-accent/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                          <div className="relative">
                            <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              placeholder="Customer"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="h-7 pl-7 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
                          <div className="relative">
                            <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              placeholder="07xxxxxxxx"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="h-7 pl-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {cart.map((item, index) => (
                          <div
                            key={`${item.medicineId}-${item.unitType}`}
                            className="p-2 rounded-lg bg-secondary/50"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.medicineName}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                onClick={() => removeFromCart(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{item.quantity} {getUnitLabel(item.unitType)}(s) @ KSh {item.unitPrice} each</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => updateQuantity(index, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs font-medium w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => updateQuantity(index, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs font-bold text-primary">
                                KSh {item.totalPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Payment Method Selection */}
                    <div className="p-3 border-t bg-accent/20">
                      <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
                      <RadioGroup 
                        value={paymentMethod} 
                        onValueChange={(value) => setPaymentMethod(value as 'cash' | 'mpesa' | 'card')}
                        className="flex gap-2"
                      >
                        <div className={cn(
                          "flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                        )}>
                          <RadioGroupItem value="cash" id="cash" className="sr-only" />
                          <label htmlFor="cash" className="flex items-center gap-1.5 cursor-pointer w-full">
                            <Banknote className="h-4 w-4 text-success" />
                            <span className="text-xs font-medium">Cash</span>
                          </label>
                        </div>
                        <div className={cn(
                          "flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          paymentMethod === 'mpesa' ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                        )}>
                          <RadioGroupItem value="mpesa" id="mpesa" className="sr-only" />
                          <label htmlFor="mpesa" className="flex items-center gap-1.5 cursor-pointer w-full">
                            <Smartphone className="h-4 w-4 text-success" />
                            <span className="text-xs font-medium">M-Pesa</span>
                          </label>
                        </div>
                        <div className={cn(
                          "flex-1 flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                        )}>
                          <RadioGroupItem value="card" id="card" className="sr-only" />
                          <label htmlFor="card" className="flex items-center gap-1.5 cursor-pointer w-full">
                            <CreditCard className="h-4 w-4 text-info" />
                            <span className="text-xs font-medium">Card</span>
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Totals & Checkout */}
                    <div className="p-3 border-t bg-accent/30">
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>KSh {subtotal.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="text-primary">KSh {total.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full h-10"
                        onClick={handleCheckout}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Complete Sale
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Professional Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-sm p-0 print:max-w-full print:border-none print:shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="bg-white text-black p-4 font-mono text-xs" id="receipt">
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-gray-400">
                <h2 className="text-base font-bold tracking-tight">PHARMACY NAME</h2>
                <p className="text-[10px]">123 Main Street, Nairobi</p>
                <p className="text-[10px]">Tel: 0712 345 678</p>
                <p className="text-[10px]">PIN: P051234567A</p>
              </div>
              
              {/* Invoice Details */}
              <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span className="font-bold">{lastSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{format(new Date(lastSale.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{lastSale.cashierName}</span>
                </div>
                {lastSale.customerName !== 'Walk-in' && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{lastSale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items Header */}
              <div className="py-1 border-b border-gray-300 flex text-[10px] font-bold uppercase">
                <span className="flex-1">Item</span>
                <span className="w-12 text-center">Qty</span>
                <span className="w-14 text-right">Price</span>
                <span className="w-16 text-right">Total</span>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-gray-400 space-y-1.5">
                {lastSale.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-medium text-[11px] truncate">{item.medicineName}</div>
                    <div className="flex text-[10px]">
                      <span className="flex-1 text-gray-600">
                        @KSh {item.unitPrice.toLocaleString()}/{getUnitLabel(item.unitType)}
                      </span>
                      <span className="w-12 text-center">{item.quantity} {getUnitLabel(item.unitType)}</span>
                      <span className="w-14 text-right">KSh {item.unitPrice.toLocaleString()}</span>
                      <span className="w-16 text-right font-medium">KSh {item.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal ({lastSale.items.length} items)</span>
                  <span>KSh {lastSale.subtotal.toLocaleString()}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span>Discount</span>
                    <span>-KSh {lastSale.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>TOTAL</span>
                  <span>KSh {lastSale.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="py-2 border-b border-dashed border-gray-400">
                <div className="flex justify-between text-[11px]">
                  <span>Payment:</span>
                  <span className="font-medium uppercase">{lastSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Tendered:</span>
                  <span>KSh {lastSale.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Change:</span>
                  <span>KSh 0</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 space-y-1">
                <p className="font-medium text-[11px]">Thank you for your purchase!</p>
                <p className="text-[10px] text-gray-500">Get well soon</p>
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-[9px] text-gray-400">Served by: {lastSale.cashierName}</p>
                  <p className="text-[9px] text-gray-400">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 print:hidden">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowReceipt(false)}>
                  Close
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={printReceipt}>
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
