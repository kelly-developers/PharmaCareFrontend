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
      {/* Floating Cart Button - Always visible on mobile */}
      <SheetTrigger asChild>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-sm border-t-2 border-primary/20 shadow-xl">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative bg-primary/10 p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {cart.length > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive animate-pulse"
                  >
                    {cart.length}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
                </p>
                <p className="font-bold text-lg text-primary">
                  KSh {total.toLocaleString()}
                </p>
              </div>
            </div>
            <Button 
              className="h-12 px-6 text-base font-semibold shadow-lg"
              disabled={cart.length === 0}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              View Cart
            </Button>
          </div>
        </div>
      </SheetTrigger>

      {/* Full Screen Cart Sheet */}
      <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Shopping Cart
                <Badge variant="secondary" className="ml-1">{cart.length} items</Badge>
              </SheetTitle>
              {cart.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearCart}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-[60vh]">
            <div className="bg-muted/50 p-6 rounded-full mb-4">
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground mb-2">Your cart is empty</p>
            <p className="text-sm text-muted-foreground/60 text-center max-w-xs">
              Browse medicines and tap to add them to your cart
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Customer Info - Compact */}
            <div className="p-3 border-b bg-accent/30 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block font-medium">Customer</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Walk-in Customer"
                      value={customerName}
                      onChange={(e) => onCustomerNameChange(e.target.value)}
                      className="h-10 pl-9 text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block font-medium">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="0712345678"
                      value={customerPhone}
                      onChange={(e) => onCustomerPhoneChange(e.target.value)}
                      className="h-10 pl-9 text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Items - Scrollable with more height */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-2 pb-4">
                {cart.map((item, index) => (
                  <div
                    key={`${item.medicineId}-${item.unitType}`}
                    className="p-3 rounded-xl bg-card border shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm truncate">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.quantity} × {getUnitLabel(item.unitType)} @ KSh {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => onRemoveFromCart(index)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-background"
                          onClick={() => onUpdateQuantity(index, -1)}
                          disabled={isProcessing}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-background"
                          onClick={() => onUpdateQuantity(index, 1)}
                          disabled={isProcessing}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-bold text-primary text-base">
                        KSh {item.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Payment Method Selection */}
            <div className="p-3 border-t bg-accent/20 shrink-0">
              <Label className="text-xs text-muted-foreground mb-2 block font-semibold">Payment Method</Label>
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(value) => onPaymentMethodChange(value as 'cash' | 'mpesa' | 'card' | 'credit')}
                className="grid grid-cols-4 gap-2"
                disabled={isProcessing}
              >
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'cash' ? 'border-success bg-success/10 shadow-sm' : 'border-transparent bg-secondary/50 hover:bg-secondary',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('cash')}
                >
                  <RadioGroupItem value="cash" id="cash-mobile" className="sr-only" />
                  <Banknote className={cn("h-6 w-6", paymentMethod === 'cash' ? 'text-success' : 'text-muted-foreground')} />
                  <span className="text-xs font-medium">Cash</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'mpesa' ? 'border-success bg-success/10 shadow-sm' : 'border-transparent bg-secondary/50 hover:bg-secondary',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('mpesa')}
                >
                  <RadioGroupItem value="mpesa" id="mpesa-mobile" className="sr-only" />
                  <Smartphone className={cn("h-6 w-6", paymentMethod === 'mpesa' ? 'text-success' : 'text-muted-foreground')} />
                  <span className="text-xs font-medium">M-Pesa</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'card' ? 'border-info bg-info/10 shadow-sm' : 'border-transparent bg-secondary/50 hover:bg-secondary',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('card')}
                >
                  <RadioGroupItem value="card" id="card-mobile" className="sr-only" />
                  <CreditCard className={cn("h-6 w-6", paymentMethod === 'card' ? 'text-info' : 'text-muted-foreground')} />
                  <span className="text-xs font-medium">Card</span>
                </div>
                <div 
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'credit' ? 'border-warning bg-warning/10 shadow-sm' : 'border-transparent bg-secondary/50 hover:bg-secondary',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isProcessing && onPaymentMethodChange('credit')}
                >
                  <RadioGroupItem value="credit" id="credit-mobile" className="sr-only" />
                  <Receipt className={cn("h-6 w-6", paymentMethod === 'credit' ? 'text-warning' : 'text-muted-foreground')} />
                  <span className="text-xs font-medium">Credit</span>
                </div>
              </RadioGroup>
              
              {paymentMethod === 'credit' && (
                <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                  <p className="text-xs text-warning-foreground font-medium">
                    ⚠️ Credit sale requires customer details. Amount won't be added to totals until paid.
                  </p>
                </div>
              )}
            </div>

            {/* Totals & Checkout - Fixed at bottom */}
            <div className="p-4 border-t bg-gradient-to-t from-background to-accent/20 shrink-0 safe-area-bottom">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
                  <span className="font-medium">KSh {subtotal.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">KSh {total.toLocaleString()}</span>
                </div>
              </div>
              
              <Button
                className="w-full h-14 text-lg font-semibold shadow-lg"
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
                        Complete Sale - KSh {total.toLocaleString()}
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
