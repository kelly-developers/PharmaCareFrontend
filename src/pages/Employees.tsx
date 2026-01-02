import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { employeeService } from '@/services/employeeService';
import { Employee, UserRole } from '@/types/pharmacy';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Users,
  Phone,
  MoreVertical,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ activeEmployees: 0, totalPayroll: 0 });
  const { toast } = useToast();

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier' as UserRole,
    salary: '',
    bankAccount: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch employees from backend
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await employeeService.getAll();
      if (response.success && response.data) {
        const data = response.data;
        if (Array.isArray(data)) {
          setEmployees(data);
        } else if ((data as any).content && Array.isArray((data as any).content)) {
          setEmployees((data as any).content);
        } else {
          setEmployees([]);
        }
      }
      
      // Fetch stats
      const statsResponse = await employeeService.getStats();
      if (statsResponse.success && statsResponse.data) {
        setStats({
          activeEmployees: (statsResponse.data as any).activeEmployees || 0,
          totalPayroll: employees.reduce((sum, emp) => sum + (emp.salary || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Calculate total salary
  const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Name, Email, Phone)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await employeeService.create({
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: newEmployee.role,
        salary: parseFloat(newEmployee.salary) || 0,
        bankAccount: newEmployee.bankAccount,
        startDate: newEmployee.startDate,
      });

      if (response.success && response.data) {
        setEmployees(prev => [...prev, response.data!]);
        setShowAddDialog(false);
        setNewEmployee({
          name: '',
          email: '',
          phone: '',
          role: 'cashier',
          salary: '',
          bankAccount: '',
          startDate: format(new Date(), 'yyyy-MM-dd'),
        });
        toast({
          title: 'Employee Added',
          description: `${newEmployee.name} has been added successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to add employee',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to add employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to add employee',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateEmployee = async (id: string) => {
    try {
      const response = await employeeService.delete(id);
      if (response.success) {
        setEmployees(prev => prev.filter(e => e.id !== id));
        toast({
          title: 'Employee Deactivated',
          description: 'The employee has been deactivated',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to deactivate employee',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate employee',
        variant: 'destructive',
      });
    }
  };

  const handleActivateEmployee = async (id: string) => {
    try {
      const response = await employeeService.activate(id);
      if (response.success) {
        fetchEmployees(); // Refresh list
        toast({
          title: 'Employee Activated',
          description: 'The employee has been activated',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to activate employee',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to activate employee',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Admin</Badge>;
      case 'manager':
        return <Badge variant="info">Manager</Badge>;
      case 'pharmacist':
        return <Badge variant="success">Pharmacist</Badge>;
      case 'cashier':
        return <Badge variant="secondary">Cashier</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Employees</h1>
            <p className="text-muted-foreground mt-1">Manage your pharmacy staff</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchEmployees} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      placeholder="e.g., John Kamau"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        placeholder="john@pharmacy.ke"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                        placeholder="+254 712 345 678"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select
                        value={newEmployee.role}
                        onValueChange={(value: UserRole) => setNewEmployee({ ...newEmployee, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="pharmacist">Pharmacist</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary (KSh)</Label>
                      <Input
                        type="number"
                        value={newEmployee.salary}
                        onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                        placeholder="e.g., 50000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={newEmployee.startDate}
                        onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Account</Label>
                      <Input
                        value={newEmployee.bankAccount}
                        onChange={(e) => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })}
                        placeholder="Account number"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="hero"
                      onClick={handleAddEmployee}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Employee
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {employees.filter(e => e.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-warning">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-2xl font-bold">KSh {totalSalary.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employees Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No employees found</p>
                <p className="text-sm text-muted-foreground">Add your first employee to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(employee.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {employee.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          KSh {(employee.salary || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {employee.startDate 
                            ? format(new Date(employee.startDate), 'MMM dd, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'active' ? 'success' : 'secondary'}>
                            {employee.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Process Payroll</DropdownMenuItem>
                              {employee.status === 'active' ? (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeactivateEmployee(employee.id)}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-success"
                                  onClick={() => handleActivateEmployee(employee.id)}
                                >
                                  Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </MainLayout>
  );
}
