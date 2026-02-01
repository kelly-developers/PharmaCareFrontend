import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { creditService, CreditSale, CreditPayment } from '@/services/creditService';
import { api } from '@/services/api';
import { format } from 'date-fns';
import {
  Receipt,
  Search,
  Phone,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  Banknote,
  CreditCard,
  History,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_type: string;
  unit_label: string;
  unit_price: number;
  subtotal: number;
}

interface SaleReceipt {
  id: string;
  transaction_id?: string;
  cashier_name: string;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  items: SaleItem[];
}

export default function CreditSales() {
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('unpaid');
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<SaleReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalCredits: 0,
    pendingCount: 0,
    partialCount: 0,
    paidCount: 0,
  });
  const { toast } = useToast();

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      // For 'unpaid' filter, we want PENDING and PARTIAL status
      let apiStatus: string | undefined = undefined;
      if (statusFilter === 'unpaid') {
        // Fetch all and filter client-side for pending + partial
        apiStatus = undefined;
      } else if (statusFilter !== 'all') {
        apiStatus = statusFilter;
      }
      
      const [creditsRes, summaryRes] = await Promise.all([
        creditService.getAll(apiStatus ? { status: apiStatus } : undefined),
        creditService.getSummary(),
      ]);

      if (creditsRes.success && creditsRes.data) {
        let filteredCredits = creditsRes.data;
        
        // Filter out PAID credits if showing unpaid
        if (statusFilter === 'unpaid') {
          filteredCredits = creditsRes.data.filter(c => c.status !== 'paid');
        }
        
        setCredits(filteredCredits);
      }

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit sales',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [statusFilter]);

  // Fetch receipt/sale details
  const fetchReceipt = async (saleId: string) => {
    setIsLoadingReceipt(true);
    try {
      const response = await api.get<SaleReceipt>(`/sales/${saleId}`);
      if (response.success && response.data) {
        setReceiptData(response.data);
        setShowReceiptDialog(true);
      } else {
        throw new Error(response.error || 'Failed to load receipt');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load receipt details',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCredit || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount > selectedCredit.balanceAmount) {
      toast({
        title: 'Amount Exceeds Balance',
        description: `Maximum payment is KSh ${selectedCredit.balanceAmount.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await creditService.recordPayment({
        creditSaleId: selectedCredit.id,
        amount,
        paymentMethod,
      });

      if (response.success) {
        const isFullyPaid = amount >= selectedCredit.balanceAmount;
        
        toast({
          title: isFullyPaid ? 'Credit Cleared!' : 'Payment Recorded',
          description: isFullyPaid 
            ? `Credit of KSh ${selectedCredit.totalAmount.toLocaleString()} has been fully paid and added to profits`
            : `KSh ${amount.toLocaleString()} payment recorded. Remaining: KSh ${(selectedCredit.balanceAmount - amount).toLocaleString()}`,
        });
        
        setShowPaymentDialog(false);
        setPaymentAmount('');
        setSelectedCredit(null);
        fetchCredits();
      } else {
        throw new Error(response.error || 'Failed to record payment');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCredits = credits.filter((credit) => {
    const matchesSearch =
      credit.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.customerPhone.includes(searchQuery);
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'mpesa':
        return <Phone className="h-3 w-3" />;
      case 'card':
        return <CreditCard className="h-3 w-3" />;
      default:
        return <Banknote className="h-3 w-3" />;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Credit Sales
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage credit purchases and record payments
            </p>
          </div>
          <Button variant="outline" onClick={fetchCredits} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-destructive">
                    KSh {summary.totalOutstanding.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                  <p className="text-lg font-bold">{summary.totalCredits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-warning">{summary.pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fully Paid</p>
                  <p className="text-lg font-bold text-success">{summary.paidCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid Credits</SelectItem>
                  <SelectItem value="all">All Credits</SelectItem>
                  <SelectItem value="PENDING">Pending Only</SelectItem>
                  <SelectItem value="PARTIAL">Partial Only</SelectItem>
                  <SelectItem value="PAID">Paid Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Credits Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Credit Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCredits.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No credit sales found</p>
                <p className="text-sm text-muted-foreground/60">
                  {statusFilter === 'unpaid' 
                    ? 'All credits have been paid!' 
                    : 'Credit sales will appear here when created from POS'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Credit Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCredits.map((credit) => (
                      <TableRow 
                        key={credit.id}
                        className="cursor-pointer hover:bg-muted/80"
                        onClick={() => {
                          setSelectedCredit(credit);
                          if (credit.saleId) {
                            fetchReceipt(credit.saleId);
                          } else {
                            // Show receipt dialog even without full receipt data
                            setReceiptData(null);
                            setShowReceiptDialog(true);
                          }
                        }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {credit.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {credit.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(credit.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          KSh {credit.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          KSh {credit.paidAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          KSh {credit.balanceAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(credit.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* View Receipt Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCredit(credit);
                                if (credit.saleId) {
                                  fetchReceipt(credit.saleId);
                                } else {
                                  setReceiptData(null);
                                  setShowReceiptDialog(true);
                                }
                              }}
                              disabled={isLoadingReceipt}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            
                            {/* Pay Button - only for unpaid credits */}
                            {credit.status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCredit(credit);
                                  setPaymentAmount('');
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <Banknote className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Credit Receipt
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingReceipt ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedCredit ? (
            <div className="space-y-4">
              {/* Customer & Sale Info */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedCredit.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedCredit.customerPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>{format(new Date(receiptData?.created_at || selectedCredit.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                {receiptData?.cashier_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Served by</span>
                    <span>{receiptData.cashier_name}</span>
                  </div>
                )}
              </div>

              {/* Items - only show if receipt data is available */}
              {receiptData?.items && receiptData.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Items Purchased</h4>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {receiptData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm p-2 bg-accent/30 rounded">
                          <div>
                            <p className="font-medium">{item.medicine_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit_label || item.unit_type} × KSh {item.unit_price.toLocaleString()}
                            </p>
                          </div>
                          <p className="font-medium">KSh {item.subtotal.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                {receiptData?.total_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KSh {receiptData.total_amount.toLocaleString()}</span>
                  </div>
                )}
                {receiptData?.discount && receiptData.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-success">-KSh {receiptData.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Credit</span>
                  <span className="text-destructive">KSh {selectedCredit.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* Payment History */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <History className="h-4 w-4" />
                  Payment History
                </h4>
                {selectedCredit.payments && selectedCredit.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCredit.payments.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-success/10 rounded">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span>{format(new Date(payment.createdAt), 'dd/MM/yyyy')}</span>
                        </div>
                        <span className="font-medium text-success">+KSh {payment.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments recorded yet</p>
                )}
              </div>

              <Separator />

              {/* Balance Summary */}
              <div className="p-3 bg-accent rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Paid</span>
                  <span className="text-success font-medium">KSh {selectedCredit.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance Due</span>
                  <span className={cn(
                    selectedCredit.balanceAmount > 0 ? "text-destructive" : "text-success"
                  )}>
                    KSh {selectedCredit.balanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No credit selected</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Close
            </Button>
            {selectedCredit && selectedCredit.status !== 'paid' && (
              <Button onClick={() => {
                setShowReceiptDialog(false);
                setPaymentAmount('');
                setShowPaymentDialog(true);
              }}>
                <Banknote className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-3 bg-accent/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedCredit.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedCredit.customerPhone}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Credit</span>
                  <span>KSh {selectedCredit.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-success">
                    KSh {selectedCredit.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Balance Due</span>
                  <span className="text-destructive">
                    KSh {selectedCredit.balanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Payment Amount (KSh)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount to pay"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedCredit.balanceAmount}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      Max: KSh {selectedCredit.balanceAmount.toLocaleString()}
                    </p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => setPaymentAmount(selectedCredit.balanceAmount.toString())}
                    >
                      Pay Full Amount
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as 'cash' | 'mpesa' | 'card')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" /> Cash
                        </span>
                      </SelectItem>
                      <SelectItem value="mpesa">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4" /> M-Pesa
                        </span>
                      </SelectItem>
                      <SelectItem value="card">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Card
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview what will happen */}
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-sm">
                    <p className="font-medium text-success mb-1">After this payment:</p>
                    {parseFloat(paymentAmount) >= selectedCredit.balanceAmount ? (
                      <p>✅ Credit will be <strong>fully cleared</strong> and added to profits</p>
                    ) : (
                      <p>Remaining balance: <strong>KSh {(selectedCredit.balanceAmount - parseFloat(paymentAmount)).toLocaleString()}</strong></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
