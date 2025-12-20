import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Users,
  Phone,
  Mail,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

// Demo employees
const employees = [
  {
    id: '1',
    name: 'John Kamau',
    email: 'john.kamau@pharmacy.ke',
    phone: '+254 722 111 222',
    role: 'admin',
    salary: 85000,
    startDate: new Date('2022-03-15'),
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Wanjiku',
    email: 'jane.wanjiku@pharmacy.ke',
    phone: '+254 733 333 444',
    role: 'manager',
    salary: 65000,
    startDate: new Date('2022-06-01'),
    status: 'active',
  },
  {
    id: '3',
    name: 'Peter Omondi',
    email: 'peter.omondi@pharmacy.ke',
    phone: '+254 711 555 666',
    role: 'pharmacist',
    salary: 55000,
    startDate: new Date('2023-01-10'),
    status: 'active',
  },
  {
    id: '4',
    name: 'Mary Akinyi',
    email: 'mary.akinyi@pharmacy.ke',
    phone: '+254 700 777 888',
    role: 'cashier',
    salary: 35000,
    startDate: new Date('2023-04-20'),
    status: 'active',
  },
  {
    id: '5',
    name: 'David Kiprop',
    email: 'david.kiprop@pharmacy.ke',
    phone: '+254 720 999 000',
    role: 'cashier',
    salary: 32000,
    startDate: new Date('2023-08-15'),
    status: 'active',
  },
];

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);

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
          <Button variant="hero">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
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
                  <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</p>
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
                        KSh {employee.salary.toLocaleString()}
                      </TableCell>
                      <TableCell>{format(employee.startDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'success' : 'secondary'}>
                          {employee.status}
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
                            <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
