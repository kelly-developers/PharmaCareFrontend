import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { employeeService, payrollService } from '@/services/employeeService';
import { Employee, PayrollEntry } from '@/types/pharmacy';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Download,
  Send,
  Eye,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportTableToPDF } from '@/utils/pdfExport';

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch payroll data
  const fetchPayrollData = async () => {
    setIsLoading(true);
    try {
      // Fetch all employees first
      const empResponse = await employeeService.getActive();
      if (empResponse.success && empResponse.data) {
        setEmployees(Array.isArray(empResponse.data) ? empResponse.data : []);
      }

      // Fetch payroll for month
      const payrollResponse = await payrollService.getAll(selectedMonth);
      if (payrollResponse.success && payrollResponse.data) {
        const data = payrollResponse.data;
        if (Array.isArray(data)) {
          setPayrollData(data);
        } else if ((data as any).content) {
          setPayrollData((data as any).content);
        } else {
          setPayrollData([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payroll data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payroll data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth]);

  const totalPayroll = payrollData.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const paidCount = payrollData.filter((p) => p.status === 'paid').length;
  const pendingCount = payrollData.filter((p) => p.status === 'pending').length;
  const pendingAmount = payrollData
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.netPay || 0), 0);

  const processPayment = async (id: string) => {
    try {
      const response = await payrollService.markAsPaid(id);
      if (response.success) {
        toast({
          title: 'Payment Processed',
          description: 'Employee payment has been marked as paid.',
        });
        fetchPayrollData();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to process payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment',
        variant: 'destructive',
      });
    }
  };

  const processAllPending = async () => {
    try {
      const pendingPayrolls = payrollData.filter(p => p.status === 'pending');
      await Promise.all(pendingPayrolls.map(p => payrollService.markAsPaid(p.id)));
      toast({
        title: 'Bulk Payment Processed',
        description: `${pendingCount} payments totaling KSh ${pendingAmount.toLocaleString()} processed.`,
      });
      fetchPayrollData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process some payments',
        variant: 'destructive',
      });
    }
  };

  const generatePayrollForMonth = async () => {
    try {
      const response = await payrollService.generateForMonth(selectedMonth);
      if (response.success) {
        toast({
          title: 'Payroll Generated',
          description: 'Payroll entries have been generated for the month.',
        });
        fetchPayrollData();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to generate payroll',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate payroll',
        variant: 'destructive',
      });
    }
  };

  const handleViewEntry = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setViewDialogOpen(true);
  };

  const handleExportPDF = () => {
    const headers = ['Employee', 'Role', 'Base Salary', 'Deductions', 'Bonuses', 'Net Pay', 'Status'];
    const rows = payrollData.map(entry => [
      entry.employeeName || 'Unknown',
      (entry as any).role || '-',
      `KSh ${(entry.baseSalary || 0).toLocaleString()}`,
      `KSh ${(entry.deductions || 0).toLocaleString()}`,
      `KSh ${(entry.bonuses || 0).toLocaleString()}`,
      `KSh ${(entry.netPay || 0).toLocaleString()}`,
      entry.status === 'paid' ? 'Paid' : 'Pending',
    ]);
    
    // Add totals row
    rows.push([
      'TOTAL',
      '',
      `KSh ${payrollData.reduce((sum, p) => sum + (p.baseSalary || 0), 0).toLocaleString()}`,
      `KSh ${payrollData.reduce((sum, p) => sum + (p.deductions || 0), 0).toLocaleString()}`,
      `KSh ${payrollData.reduce((sum, p) => sum + (p.bonuses || 0), 0).toLocaleString()}`,
      `KSh ${totalPayroll.toLocaleString()}`,
      '',
    ]);

    exportTableToPDF(
      `Payroll Report - ${selectedMonth}`,
      headers,
      rows,
      `payroll-${selectedMonth}`
    );
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
  };

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return format(date, 'yyyy-MM');
  });

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Payroll</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage employee salaries and payments</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(month => (
                  <SelectItem key={month} value={month}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchPayrollData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {payrollData.length === 0 && (
              <Button variant="hero" onClick={generatePayrollForMonth}>
                Generate Payroll
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Total Payroll"
            value={`KSh ${totalPayroll.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatCard
            title="Employees"
            value={payrollData.length}
            icon={<Users className="h-5 w-5 md:h-6 md:w-6" />}
            iconClassName="bg-info/10 text-info"
          />
          <StatCard
            title="Paid"
            value={paidCount}
            icon={<CheckCircle className="h-5 w-5 md:h-6 md:w-6" />}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Pending"
            value={`${pendingCount}`}
            subtitle={`KSh ${(pendingAmount / 1000).toFixed(0)}K`}
            icon={<Clock className="h-5 w-5 md:h-6 md:w-6" />}
            iconClassName="bg-warning/10 text-warning"
          />
        </div>

        {/* Bulk Action */}
        {pendingCount > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm md:text-base">Pending Payments</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {pendingCount} employees awaiting payment totaling KSh {pendingAmount.toLocaleString()}
                </p>
              </div>
              <Button variant="warning" size="sm" onClick={processAllPending}>
                <Send className="h-4 w-4 mr-2" />
                Process All
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payroll Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">{getMonthName(selectedMonth)} Payroll</CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : payrollData.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No payroll data for this month</p>
                <p className="text-sm text-muted-foreground">Click "Generate Payroll" to create entries</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-right text-xs">Base</TableHead>
                        <TableHead className="text-right text-xs">Deduct</TableHead>
                        <TableHead className="text-right text-xs">Bonus</TableHead>
                        <TableHead className="text-right text-xs">Net Pay</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-right text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="py-2">
                            <div>
                              <p className="font-medium text-sm">{entry.employeeName || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{(entry as any).role || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {((entry.baseSalary || 0) / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-destructive">
                            -{((entry.deductions || 0) / 1000).toFixed(1)}K
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-success">
                            +{((entry.bonuses || 0) / 1000).toFixed(1)}K
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold font-mono">
                            {((entry.netPay || 0) / 1000).toFixed(1)}K
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.status === 'paid' ? 'success' : 'warning'}
                              className="text-xs"
                            >
                              {entry.status === 'paid' ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewEntry(entry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {entry.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => processPayment(entry.id)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
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
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Payslip Details</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewDialogOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                {/* Employee Info */}
                <div className="text-center border-b pb-4">
                  <h3 className="font-bold text-lg">{selectedEntry.employeeName || 'Unknown'}</h3>
                  <p className="text-muted-foreground">{(selectedEntry as any).role || '-'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getMonthName(selectedEntry.month)}
                  </p>
                </div>

                {/* Salary Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-mono font-medium">KSh {(selectedEntry.baseSalary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Bonuses</span>
                    <span className="font-mono text-success">+KSh {(selectedEntry.bonuses || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-mono text-destructive">-KSh {(selectedEntry.deductions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-primary/10 px-3 rounded-lg">
                    <span className="font-bold">Net Pay</span>
                    <span className="font-mono font-bold text-lg">KSh {(selectedEntry.netPay || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedEntry.status === 'paid' ? 'success' : 'warning'}>
                    {selectedEntry.status === 'paid' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid on {selectedEntry.paidAt ? format(new Date(selectedEntry.paidAt), 'MMM d, yyyy') : '-'}
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>

                {/* Actions */}
                {selectedEntry.status === 'pending' && (
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      processPayment(selectedEntry.id);
                      setViewDialogOpen(false);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
