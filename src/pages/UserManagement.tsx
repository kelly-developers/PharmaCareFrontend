// app/users/page.tsx
import { useState, useEffect } from 'react';
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
  DialogFooter,
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
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { userService, type PaginatedResponse } from '@/services/userService';
import { User, UserRole } from '@/types/pharmacy';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    phone: '',
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  // Load users on component mount and search/page change
  useEffect(() => {
    loadUsers();
  }, [page, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getAll(page, limit, searchQuery);
      console.log('API Response:', response); // For debugging
      
      if (response.success && response.data) {
        // Extract users from the nested data structure
        const paginatedData = response.data as PaginatedResponse<User>;
        const usersArray = paginatedData.data || [];
        const pagination = paginatedData.pagination || { 
          page: 1, 
          total: 0, 
          pages: 1, 
          hasNext: false, 
          hasPrev: false 
        };
        
        console.log('Users loaded:', usersArray.length);
        console.log('Pagination:', pagination);
        
        setUsers(usersArray);
        setTotalPages(pagination.pages || 1);
        setTotalUsers(pagination.total || 0);
        setPage(pagination.page || 1);
      } else {
        setError(response.error || 'Failed to load users');
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError('Error loading users. Please try again.');
      console.error('Error loading users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a valid email address',
      });
      return;
    }

    // Validate password length
    if (newUser.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Password must be at least 6 characters long',
      });
      return;
    }

    try {
      const response = await userService.create(newUser);
      if (response.success && response.data) {
        toast({
          title: 'User Created',
          description: `Account for ${newUser.name} has been created successfully.`,
        });
        setShowNewUser(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'cashier',
          phone: '',
        });
        loadUsers(); // Refresh the list
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to create user',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create user. Please try again.',
      });
      console.error('Error creating user:', err);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    try {
      if (!confirm(`Reset password for ${userName} to 'default123'?`)) {
        return;
      }

      const response = await userService.update(userId, {
        password: 'default123',
      });
      
      if (response.success) {
        toast({
          title: 'Password Reset',
          description: `Password for ${userName} has been reset to 'default123'.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to reset password',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to reset password',
      });
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const action = user.isActive ? 'deactivate' : 'activate';
      if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) {
        return;
      }

      if (user.isActive) {
        await userService.delete(user.id);
        toast({
          title: 'User Deactivated',
          description: `${user.name} has been deactivated.`,
        });
      } else {
        await userService.activate(user.id);
        toast({
          title: 'User Activated',
          description: `${user.name} has been activated.`,
        });
      }
      loadUsers(); // Refresh the list
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update user status',
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roles: Record<UserRole, { className: string; label: string; icon?: React.ReactNode }> = {
      admin: {
        className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        label: "Admin",
        icon: <Shield className="h-3 w-3 mr-1" />
      },
      manager: {
        className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "Manager"
      },
      pharmacist: {
        className: "bg-green-500/10 text-green-600 border-green-500/20",
        label: "Pharmacist"
      },
      cashier: {
        className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
        label: "Cashier"
      }
    };

    const roleConfig = roles[role] || { className: "", label: role };

    return (
      <Badge className={roleConfig.className} variant="outline">
        {roleConfig.icon}
        {roleConfig.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate role counts
  const getRoleCounts = () => {
    const counts: Record<UserRole, number> = {
      admin: 0,
      manager: 0,
      pharmacist: 0,
      cashier: 0
    };
    
    users.forEach(user => {
      if (counts.hasOwnProperty(user.role)) {
        counts[user.role]++;
      }
    });
    
    return counts;
  };

  const roleCounts = getRoleCounts();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage system users and access control</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@pharmacy.ke"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
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
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Create a password (min. 6 characters)"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewUser(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleCreateUser} disabled={loading}>
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="font-semibold text-lg">Total Users: {totalUsers}</h3>
                <p className="text-sm text-muted-foreground">Showing page {page} of {totalPages}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roleCounts).map(([role, count]) => (
                  <Badge key={role} variant="outline" className="px-3 py-1">
                    {count} {role.toLowerCase()}s
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page when searching
            }}
            className="pl-10"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading skeletons
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <UserCircle className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-lg font-medium">
                            {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                          </p>
                          {!searchQuery && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowNewUser(true)}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create your first user
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-muted-foreground">{user.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.isActive ? 'success' : 'secondary'}
                            className={user.isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(user)}
                                className={user.isActive ? 'text-red-600' : 'text-green-600'}
                              >
                                {user.isActive ? 'Deactivate User' : 'Activate User'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleResetPassword(user.id, user.name)}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!loading && users.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && (
                      <span className="px-2 text-sm text-muted-foreground">...</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}