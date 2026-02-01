import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SaleItem } from '@/types/pharmacy';
import { getUnitLabel } from '@/types/pharmacy';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  User,
  Phone,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
  Package,
} from 'lucide-react';

interface MobileCartDrawerProps {
  cart: SaleItem[];
  customerName: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'credit';
  isProcessing: boolean;
  subtotal: number;
  total: number;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onPaymentMethodChange: (method: 'cash' | 'mpesa' | 'card' | 'credit') => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveFromCart: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export function MobileCartDrawer({
  cart,
  customerName,
  customerPhone,
  paymentMethod,
  isProcessing,
  subtotal,
  total,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onPaymentMethodChange,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCheckout,
}: MobileCartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCheckout = () => {
    onCheckout();
    // Don't close immediately - let the checkout process complete
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-background border-t shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {cart.length > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive"
                  >
                    {cart.length}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </p>
                <p className="font-bold text-sm text-primary">
                  KSh {total.toLocaleString()}
                </p>
              </div>
            </div>
            <Button 
              className="flex-1 max-w-[200px] h-10"
              disabled={cart.length === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Cart
            </Button>
          </div>
        </div>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart
              <Badge variant="secondary">{cart.length}</Badge>
            </SheetTitle>
            {cart.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearCart}
                className="text-destructive hover:text-destructive"
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
            <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">Cart is empty</p>
            <p className="text-sm text-muted-foreground/60">Add medicines to begin</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Customer Info */}
            <div className="p-3 border-b bg-accent/30">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Customer Name</Label>
                  <div className="relative">
                    <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Walk-in"
                      value={customerName}
                      onChange={(e) => onCustomerNameChange(e.target.value)}
                      className="h-9 pl-8 text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="07xxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => onCustomerPhoneChange(e.target.value)}
                      className="h-9 pl-8 text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 max-h-[30vh]">
              <div className="p-3 space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={`${item.medicineId}-${item.unitType}`}
                    className="p-3 rounded-lg bg-secondary/50 border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {getUnitLabel(item.unitType)}(s) @ KSh {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0"
                        onClick={() => onRemoveFromCart(index)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onUpdateQuantity(index, -1)}
                          disabled={isProcessing}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onUpdateQuantity(index, 1)}
                          disabled={isProcessing}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-bold text-primary">
                        KSh {item.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Payment Method Selection */}
            <div className="p-3 border-t bg-accent/20">
              <Label className="text-xs text-muted-foreground mb-2 block font-medium">Payment Method</Label>
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(value) => onPaymentMethodChange(value as 'cash' | 'mpesa' | 'card' | 'credit')}
                className="grid grid-cols-4 gap-2"
                disabled={isProcessing}
              >
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'hover:bg-accent',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('cash')}
                >
                  <RadioGroupItem value="cash" id="cash-mobile" className="sr-only" />
                  <Banknote className="h-5 w-5 text-success" />
                  <span className="text-[10px] font-medium">Cash</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === 'mpesa' ? 'border-primary bg-primary/10' : 'hover:bg-accent',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('mpesa')}
                >
                  <RadioGroupItem value="mpesa" id="mpesa-mobile" className="sr-only" />
                  <Smartphone className="h-5 w-5 text-success" />
                  <span className="text-[10px] font-medium">M-Pesa</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'hover:bg-accent',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('card')}
                >
                  <RadioGroupItem value="card" id="card-mobile" className="sr-only" />
                  <CreditCard className="h-5 w-5 text-info" />
                  <span className="text-[10px] font-medium">Card</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === 'credit' ? 'border-warning bg-warning/10' : 'hover:bg-accent',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('credit')}
                >
                  <RadioGroupItem value="credit" id="credit-mobile" className="sr-only" />
                  <Receipt className="h-5 w-5 text-warning" />
                  <span className="text-[10px] font-medium">Credit</span>
                </div>
              </RadioGroup>
              
              {paymentMethod === 'credit' && (
                <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning-foreground">
                    ⚠️ Credit sale - Customer name & phone required. Amount will not be added to total sales until paid.
                  </p>
                </div>
              )}
            </div>

            {/* Totals & Checkout */}
            <div className="p-3 border-t bg-accent/30 pb-6">
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">KSh {total.toLocaleString()}</span>
                </div>
              </div>
              
              <Button
                className="w-full h-12 text-base"
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0 || (paymentMethod === 'credit' && (!customerName || !customerPhone))}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'credit' ? (
                      <>
                        <Receipt className="h-5 w-5 mr-2" />
                        Create Credit Sale
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
