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
import { useToast } from '@/hooks/use-toast';
import { creditService, CreditSale } from '@/services/creditService';
import { format } from 'date-fns';
import {
  Receipt,
  Search,
  CreditCard,
  Phone,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreditSales() {
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
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
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const [creditsRes, summaryRes] = await Promise.all([
        creditService.getAll(filters),
        creditService.getSummary(),
      ]);

      if (creditsRes.success && creditsRes.data) {
        setCredits(creditsRes.data);
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
        toast({
          title: 'Payment Recorded',
          description: `KSh ${amount.toLocaleString()} payment recorded successfully`,
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
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
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
                  Credit sales will appear here when created from POS
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCredits.map((credit) => (
                      <TableRow key={credit.id}>
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
                        <TableCell className="text-right">
                          {credit.status !== 'paid' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Set payment amount to full balance for "Clear" action
                                  setSelectedCredit(credit);
                                  setPaymentAmount(credit.balanceAmount.toString());
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Clear
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCredit(credit);
                                  setPaymentAmount('');
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            </div>
                          )}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
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
                  <span className="text-muted-foreground">Total Amount</span>
                  <span>KSh {selectedCredit.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-success">
                    KSh {selectedCredit.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance Due</span>
                  <span className="text-destructive">
                    KSh {selectedCredit.balanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedCredit.balanceAmount}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: KSh {selectedCredit.balanceAmount.toLocaleString()}
                  </p>
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
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isProcessing || !paymentAmount}>
              {isProcessing ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
