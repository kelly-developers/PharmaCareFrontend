import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses } from '@/contexts/ExpensesContext';
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
  Wallet,
  Plus,
  Calendar,
  Receipt,
} from 'lucide-react';
import { format, isToday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const expenseCategories = [
  'Transport',
  'Supplies',
  'Maintenance',
  'Food',
  'Communication',
  'Miscellaneous',
];

export default function CashierExpenses() {
  const { user } = useAuth();
  const { expenses, addExpense } = useExpenses();
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
  });
  const { toast } = useToast();

  // Filter only this cashier's expenses
  const myExpenses = expenses.filter(exp => exp.createdBy === user?.name);

  // Filter today's expenses
  const todayExpenses = myExpenses.filter(exp => isToday(new Date(exp.date)));
  const todayTotal = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Filter this month's expenses
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthExpenses = myExpenses.filter(exp => 
    isWithinInterval(new Date(exp.date), { start: monthStart, end: monthEnd })
  );
  const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleAddExpense = () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    addExpense({
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date(),
      createdBy: user?.name || 'Unknown',
      createdByRole: user?.role,
    });

    setNewExpense({ category: '', description: '', amount: '' });
    
    toast({
      title: 'Expense Recorded',
      description: `${newExpense.category} - KSh ${parseFloat(newExpense.amount).toLocaleString()}`,
    });
  };


  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Record Expenses</h1>
          <p className="text-muted-foreground mt-1">Track your daily work expenses</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Expenses</p>
                  <p className="text-2xl font-bold">KSh {todayTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{todayExpenses.length} items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Wallet className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">KSh {monthTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{monthExpenses.length} items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Add Expense Form */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Add New Expense
            </CardTitle>
            <CardDescription>
              Record expenses for transport, supplies, or other daily needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Amount (KSh) *</Label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={handleAddExpense} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="What was this expense for? (e.g., Bodaboda fare to supplier)"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Expenses Table */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Today's Expense Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (KSh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No expenses recorded today
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(expense.createdAt), 'HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          KSh {expense.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly History */}
        <Card>
          <CardHeader>
            <CardTitle>This Month's History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (KSh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No expenses this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(expense.date), 'MMM dd')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          KSh {expense.amount.toLocaleString()}
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
    </MainLayout>
  );
}
