import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportTableToPDF } from '@/utils/pdfExport';

// Demo payroll data
const payrollData = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'John Kamau',
    role: 'Admin',
    month: '2024-01',
    baseSalary: 85000,
    deductions: 8500,
    bonuses: 5000,
    netPay: 81500,
    status: 'paid',
    paidAt: new Date('2024-01-28'),
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Jane Wanjiku',
    role: 'Manager',
    month: '2024-01',
    baseSalary: 65000,
    deductions: 6500,
    bonuses: 3000,
    netPay: 61500,
    status: 'paid',
    paidAt: new Date('2024-01-28'),
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Peter Omondi',
    role: 'Pharmacist',
    month: '2024-01',
    baseSalary: 55000,
    deductions: 5500,
    bonuses: 2000,
    netPay: 51500,
    status: 'pending',
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Mary Akinyi',
    role: 'Cashier',
    month: '2024-01',
    baseSalary: 35000,
    deductions: 3500,
    bonuses: 1500,
    netPay: 33000,
    status: 'pending',
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'David Kiprop',
    role: 'Cashier',
    month: '2024-01',
    baseSalary: 32000,
    deductions: 3200,
    bonuses: 1000,
    netPay: 29800,
    status: 'pending',
  },
];

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netPay: number;
  status: string;
  paidAt?: Date;
}

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState('2024-01');
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const totalPayroll = payrollData.reduce((sum, p) => sum + p.netPay, 0);
  const paidCount = payrollData.filter((p) => p.status === 'paid').length;
  const pendingCount = payrollData.filter((p) => p.status === 'pending').length;
  const pendingAmount = payrollData
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPay, 0);

  const processPayment = (id: string) => {
    toast({
      title: 'Payment Processed',
      description: 'Employee payment has been marked as paid.',
    });
  };

  const processAllPending = () => {
    toast({
      title: 'Bulk Payment Processed',
      description: `${pendingCount} payments totaling KSh ${pendingAmount.toLocaleString()} processed.`,
    });
  };

  const handleViewEntry = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setViewDialogOpen(true);
  };

  const handleExportPDF = () => {
    const headers = ['Employee', 'Role', 'Base Salary', 'Deductions', 'Bonuses', 'Net Pay', 'Status'];
    const rows = payrollData.map(entry => [
      entry.employeeName,
      entry.role,
      `KSh ${entry.baseSalary.toLocaleString()}`,
      `KSh ${entry.deductions.toLocaleString()}`,
      `KSh ${entry.bonuses.toLocaleString()}`,
      `KSh ${entry.netPay.toLocaleString()}`,
      entry.status === 'paid' ? 'Paid' : 'Pending',
    ]);
    
    // Add totals row
    rows.push([
      'TOTAL',
      '',
      `KSh ${payrollData.reduce((sum, p) => sum + p.baseSalary, 0).toLocaleString()}`,
      `KSh ${payrollData.reduce((sum, p) => sum + p.deductions, 0).toLocaleString()}`,
      `KSh ${payrollData.reduce((sum, p) => sum + p.bonuses, 0).toLocaleString()}`,
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
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2023-12">December 2023</SelectItem>
                <SelectItem value="2023-11">November 2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
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
                            <p className="font-medium text-sm">{entry.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{entry.role}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {(entry.baseSalary / 1000).toFixed(0)}K
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-destructive">
                          -{(entry.deductions / 1000).toFixed(1)}K
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-success">
                          +{(entry.bonuses / 1000).toFixed(1)}K
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold font-mono">
                          {(entry.netPay / 1000).toFixed(1)}K
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
                  <h3 className="font-bold text-lg">{selectedEntry.employeeName}</h3>
                  <p className="text-muted-foreground">{selectedEntry.role}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getMonthName(selectedEntry.month)}
                  </p>
                </div>

                {/* Salary Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-mono font-medium">KSh {selectedEntry.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Bonuses</span>
                    <span className="font-mono text-success">+KSh {selectedEntry.bonuses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-mono text-destructive">-KSh {selectedEntry.deductions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-primary/10 px-3 rounded-lg">
                    <span className="font-bold">Net Pay</span>
                    <span className="font-mono font-bold text-lg">KSh {selectedEntry.netPay.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedEntry.status === 'paid' ? 'success' : 'warning'}>
                    {selectedEntry.status === 'paid' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid on {selectedEntry.paidAt ? format(selectedEntry.paidAt, 'MMM d, yyyy') : '-'}
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
