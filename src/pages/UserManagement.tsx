import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  UserCircle,
  Shield,
  MoreVertical,
  Key,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Demo users
const users = [
  {
    id: '1',
    name: 'John Kamau',
    email: 'admin@pharmacy.ke',
    role: 'admin',
    status: 'active',
    lastLogin: new Date('2024-01-20T08:30:00'),
    createdAt: new Date('2022-03-15'),
  },
  {
    id: '2',
    name: 'Jane Wanjiku',
    email: 'manager@pharmacy.ke',
    role: 'manager',
    status: 'active',
    lastLogin: new Date('2024-01-20T09:15:00'),
    createdAt: new Date('2022-06-01'),
  },
  {
    id: '3',
    name: 'Peter Omondi',
    email: 'pharmacist@pharmacy.ke',
    role: 'pharmacist',
    status: 'active',
    lastLogin: new Date('2024-01-19T14:00:00'),
    createdAt: new Date('2023-01-10'),
  },
  {
    id: '4',
    name: 'Mary Akinyi',
    email: 'cashier@pharmacy.ke',
    role: 'cashier',
    status: 'active',
    lastLogin: new Date('2024-01-20T07:45:00'),
    createdAt: new Date('2023-04-20'),
  },
];

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'cashier', password: '' });
  const { toast } = useToast();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
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

  const handleCreateUser = () => {
    toast({
      title: 'User Created',
      description: `Account for ${newUser.name} has been created successfully.`,
    });
    setShowNewUser(false);
    setNewUser({ name: '', email: '', role: 'cashier', password: '' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@pharmacy.ke"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
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
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Create a temporary password"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowNewUser(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleCreateUser}>
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium text-muted-foreground">Roles:</span>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {getRoleBadge('admin')}
                  <span className="text-muted-foreground">Full system access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getRoleBadge('manager')}
                  <span className="text-muted-foreground">Reports & inventory</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getRoleBadge('pharmacist')}
                  <span className="text-muted-foreground">POS & orders</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getRoleBadge('cashier')}
                  <span className="text-muted-foreground">POS only</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(user.lastLogin, 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(user.createdAt, 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <UserCircle className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Deactivate
                            </DropdownMenuItem>
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
