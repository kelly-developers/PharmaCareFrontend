import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useSales } from '@/contexts/SalesContext';
import { useStock } from '@/contexts/StockContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet,
  Plus,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Receipt,
  FileText,
  Trash2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

const expenseCategories = [
  'Rent',
  'Utilities',
  'Salaries',
  'Supplies',
  'Transport',
  'Maintenance',
  'Marketing',
  'Insurance',
  'Licenses',
  'Miscellaneous',
];

// Safe date formatter
const safeFormat = (date: Date | string, formatStr: string): string => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

// Get today's date in YYYY-MM-DD format safely
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Expenses() {
  const { expenses, addExpense, deleteExpense, getExpensesByRole, getTotalExpenses, isLoading } = useExpenses();
  const { sales, isLoading: salesLoading } = useSales();
  const { medicines, isLoading: stockLoading } = useStock();
  const { user, canViewProfit } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
    date: getTodayDateString(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize with today's date
  useEffect(() => {
    if (!showAddDialog) {
      setNewExpense({
        category: '',
        description: '',
        amount: '',
        date: getTodayDateString(),
      });
    }
  }, [showAddDialog]);

  // Calculate financials
  const totalExpenses = getTotalExpenses();
  const cashierExpenses = getExpensesByRole('cashier');
  const cashierExpensesTotal = cashierExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Calculate total sales
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  
  // Calculate COGS from actual sales data
  const totalCOGS = sales.reduce((sum, sale) => {
    return sum + (sale.items?.reduce((itemSum, item) => {
      const medicine = medicines.find(m => m.id === item.medicineId);
      const unit = medicine?.units?.find(u => u.type === item.unitType);
      const costPerUnit = medicine ? medicine.costPrice * (unit?.quantity || 1) : 0;
      return itemSum + (costPerUnit * (item.quantity || 0));
    }, 0) || 0);
  }, 0);
  
  const grossProfit = totalSales - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Expenses by category
  const expensesByCategory = expenses.reduce((acc, exp) => {
    const category = exp.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + (exp.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Expenses by cashier
  const expensesByCashier = cashierExpenses.reduce((acc, exp) => {
    const cashier = exp.createdBy || 'Unknown';
    if (!acc[cashier]) {
      acc[cashier] = { total: 0, count: 0 };
    }
    acc[cashier].total += (exp.amount || 0);
    acc[cashier].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid positive amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        category: newExpense.category,
        description: newExpense.description,
        amount: amount,
        date: new Date(newExpense.date),
        createdBy: user?.name || 'Admin',
        createdByRole: user?.role as any,
      });

      setShowAddDialog(false);
      setNewExpense({ category: '', description: '', amount: '', date: getTodayDateString() });
      
      toast({
        title: 'Expense Added',
        description: `${newExpense.category} - KSh ${amount.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to add expense. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const success = await deleteExpense(id);
      if (success) {
        toast({
          title: 'Expense Deleted',
          description: 'The expense has been removed',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete expense',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic date validation
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setNewExpense({ ...newExpense, date: value });
    } else {
      setNewExpense({ ...newExpense, date: '' });
    }
  };

  if (isLoading || salesLoading || stockLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading expenses...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Expenses & Profits</h1>
            <p className="text-muted-foreground mt-1">Track expenses and view profit analysis</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Enter expense description (e.g., Monthly electricity bill for shop)"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (KSh) *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={handleDateChange}
                        max={getTodayDateString()}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExpense} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Expense
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Financial Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Sales"
            value={`KSh ${totalSales.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            iconClassName="bg-success/10 text-success"
          />
          {canViewProfit() && (
            <>
              <StatCard
                title="Cost of Goods"
                value={`KSh ${totalCOGS.toLocaleString()}`}
                icon={<Package className="h-6 w-6" />}
                iconClassName="bg-warning/10 text-warning"
              />
              <StatCard
                title="Gross Profit"
                value={`KSh ${grossProfit.toLocaleString()}`}
                icon={<TrendingUp className="h-6 w-6" />}
                iconClassName="bg-info/10 text-info"
              />
            </>
          )}
          <StatCard
            title="Total Expenses"
            value={`KSh ${totalExpenses.toLocaleString()}`}
            icon={<Wallet className="h-6 w-6" />}
            iconClassName="bg-destructive/10 text-destructive"
          />
          {canViewProfit() && (
            <StatCard
              title="Net Profit"
              value={`KSh ${netProfit.toLocaleString()}`}
              icon={netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              iconClassName={netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
            />
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="cashier">Cashier Expenses</TabsTrigger>
            <TabsTrigger value="summary">P&L Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Quick Add & Category Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-8 rounded-full bg-primary" />
                          <span className="font-medium">{category}</span>
                        </div>
                        <Badge variant="outline" className="font-semibold">
                          KSh {amount.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                    {Object.keys(expensesByCategory).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No expenses recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Expense Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Recorded By</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No expenses recorded yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses.slice(0, 10).map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell className="text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {safeFormat(expense.date, 'MMM dd')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{expense.category}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {expense.description}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{expense.createdBy}</span>
                                  {expense.createdByRole === 'cashier' && (
                                    <Badge variant="outline" className="text-xs">Cashier</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-destructive">
                                KSh {(expense.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  title="Delete expense"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cashier" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cashier Expenses Summary
                </CardTitle>
                <CardDescription>
                  Expenses recorded by cashiers - included in profit calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(expensesByCashier).map(([cashier, data]) => (
                    <Card key={cashier} variant="stat">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{cashier}</p>
                            <p className="text-lg font-bold text-destructive">KSh {(data.total || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{data.count} expense(s)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {Object.keys(expensesByCashier).length === 0 && (
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      No cashier expenses recorded
                    </div>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashierExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No cashier expenses recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashierExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-muted-foreground">
                            {safeFormat(expense.date, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{expense.createdBy}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            KSh {(expense.amount || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {canViewProfit() ? (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Profit & Loss Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-lg bg-success/10 border border-success/20">
                      <span className="font-medium">Total Sales Revenue</span>
                      <span className="text-xl font-bold text-success">KSh {totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <span className="font-medium">Less: Cost of Goods Sold (COGS)</span>
                      <span className="text-xl font-bold text-warning">- KSh {totalCOGS.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-lg bg-info/10 border-2 border-info">
                      <span className="font-bold text-lg">Gross Profit</span>
                      <span className="text-2xl font-bold text-info">KSh {grossProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div>
                        <span className="font-medium">Less: Operating Expenses</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Includes KSh {cashierExpensesTotal.toLocaleString()} from cashier expenses
                        </p>
                      </div>
                      <span className="text-xl font-bold text-destructive">- KSh {totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${netProfit >= 0 ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive'}`}>
                      <span className="font-bold text-lg">Net Profit / (Loss)</span>
                      <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        KSh {netProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    You don't have permission to view profit data.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}