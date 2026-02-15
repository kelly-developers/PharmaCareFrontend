import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Pill,
  Store,
  ShoppingBag,
  Package,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { businessService } from '@/services/businessService';
import { Business, BusinessType, CreateBusinessRequest } from '@/types/business';
import { format } from 'date-fns';

const businessTypeIcons: Record<BusinessType, React.ReactNode> = {
  pharmacy: <Pill className="h-4 w-4" />,
  general: <Store className="h-4 w-4" />,
  supermarket: <ShoppingBag className="h-4 w-4" />,
  retail: <Package className="h-4 w-4" />,
};

const businessTypeLabels: Record<BusinessType, string> = {
  pharmacy: 'Pharmacy',
  general: 'General Store',
  supermarket: 'Supermarket',
  retail: 'Retail Shop',
};

export default function BusinessManagement() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewUsersOpen, setIsViewUsersOpen] = useState(false);
  const [businessUsers, setBusinessUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordName, setResetPasswordName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    pharmacyCount: 0,
    generalCount: 0,
  });

  // Form state for create
  const [formData, setFormData] = useState<CreateBusinessRequest>({
    name: '',
    email: '',
    phone: '',
    businessType: 'pharmacy',
    schemaName: '',
    address: '',
    city: '',
    country: 'Kenya',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Form state for edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    subscriptionPlan: 'basic' as 'free' | 'basic' | 'premium' | 'enterprise',
  });

  // Fetch businesses
  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const response = await businessService.getAll(1, 100);
      if (response.success && response.data) {
        setBusinesses(response.data.data || []);
      }
    } catch (error) {
      toast.error('Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await businessService.getStats();
      if (response.success && response.data) {
        setStats({
          totalBusinesses: response.data.totalBusinesses || 0,
          activeBusinesses: response.data.activeBusinesses || 0,
          pharmacyCount: response.data.pharmacyCount || 0,
          generalCount: response.data.generalCount || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchBusinesses();
    fetchStats();
  }, []);

  // Filter businesses
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.schemaName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || b.businessType === filterType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Auto-generate schema name from business name
  const generateSchemaName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      schemaName: generateSchemaName(name),
    });
  };

  // Create business
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await businessService.create(formData);
      if (response.success) {
        toast.success('Business created successfully!');
        setIsCreateDialogOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          businessType: 'pharmacy',
          schemaName: '',
          address: '',
          city: '',
          country: 'Kenya',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
        });
        fetchBusinesses();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to create business');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle business status
  const handleToggleStatus = async (business: Business) => {
    try {
      if (business.status === 'active') {
        await businessService.suspend(business.id);
        toast.success('Business suspended');
      } else {
        await businessService.activate(business.id);
        toast.success('Business activated');
      }
      fetchBusinesses();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Open edit dialog
  const handleOpenEdit = (business: Business) => {
    setSelectedBusiness(business);
    setEditFormData({
      name: business.name,
      email: business.email,
      phone: business.phone,
      address: business.address || '',
      city: business.city || '',
      country: business.country || 'Kenya',
      subscriptionPlan: business.subscriptionPlan || 'basic',
    });
    setIsEditDialogOpen(true);
  };

  // Update business
  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    setIsSubmitting(true);
    try {
      const response = await businessService.update(selectedBusiness.id, editFormData);
      if (response.success) {
        toast.success('Business updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedBusiness(null);
        fetchBusinesses();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to update business');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanently delete business
  const handleDeleteBusiness = async (business: Business) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE "${business.name}"?\n\nThis will delete ALL data including users, sales, inventory, etc. This action CANNOT be undone!`)) return;
    
    try {
      const response = await businessService.permanentDelete(business.id);
      if (response.success) {
        toast.success(`Business "${business.name}" permanently deleted`);
        fetchBusinesses();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete business');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // View users for a business
  const handleViewUsers = async (business: Business) => {
    setSelectedBusiness(business);
    setIsLoadingUsers(true);
    setIsViewUsersOpen(true);
    
    try {
      const token = sessionStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pharma-care-backend-hdyf.onrender.com/api';
      const res = await fetch(`${API_BASE_URL}/businesses/${business.id}/users?limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.success) {
        setBusinessUsers(data.data?.users || data.data || []);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Delete user permanently
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Permanently delete user "${userName}"? This cannot be undone!`)) return;
    
    try {
      const response = await businessService.deleteUser(userId);
      if (response.success) {
        toast.success(`User "${userName}" deleted`);
        setBusinessUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error(response.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // Reset user password
  const handleResetPassword = async () => {
    if (!resetPasswordUserId || !newPassword) return;
    
    setIsSubmitting(true);
    try {
      const response = await businessService.resetUserPassword(resetPasswordUserId, newPassword);
      if (response.success) {
        toast.success(`Password reset for "${resetPasswordName}"`);
        setIsResetPasswordOpen(false);
        setNewPassword('');
        setResetPasswordUserId(null);
      } else {
        toast.error(response.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Business Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage all registered businesses and their configurations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchBusinesses} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Business</DialogTitle>
                  <DialogDescription>
                    Add a new business to the system. A database schema will be created automatically.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBusiness} className="space-y-6">
                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Business Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="name">Business Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g., ABC Pharmacy"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessType">Business Type *</Label>
                        <Select
                          value={formData.businessType}
                          onValueChange={(value: BusinessType) =>
                            setFormData({ ...formData, businessType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pharmacy">
                              <span className="flex items-center gap-2">
                                <Pill className="h-4 w-4" /> Pharmacy
                              </span>
                            </SelectItem>
                            <SelectItem value="general">
                              <span className="flex items-center gap-2">
                                <Store className="h-4 w-4" /> General Store
                              </span>
                            </SelectItem>
                            <SelectItem value="supermarket">
                              <span className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" /> Supermarket
                              </span>
                            </SelectItem>
                            <SelectItem value="retail">
                              <span className="flex items-center gap-2">
                                <Package className="h-4 w-4" /> Retail Shop
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schemaName">
                          Database Schema Name *
                          <span className="text-xs text-muted-foreground ml-1">(auto-generated)</span>
                        </Label>
                        <Input
                          id="schemaName"
                          value={formData.schemaName}
                          onChange={(e) =>
                            setFormData({ ...formData, schemaName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                          }
                          placeholder="e.g., abc_pharmacy"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Business Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="business@example.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+254..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Nairobi"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin User */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Admin User (First User)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="adminName">Admin Name *</Label>
                        <Input
                          id="adminName"
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminEmail">Admin Email *</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          placeholder="admin@business.com"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="adminPassword">Admin Password *</Label>
                        <Input
                          id="adminPassword"
                          type="password"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          placeholder="Secure password"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Business
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Businesses</p>
                  <p className="text-2xl font-bold">{stats.totalBusinesses}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.activeBusinesses}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pharmacies</p>
                  <p className="text-2xl font-bold">{stats.pharmacyCount}</p>
                </div>
                <Pill className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">General Stores</p>
                  <p className="text-2xl font-bold">{stats.generalCount}</p>
                </div>
                <Store className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="general">General Store</SelectItem>
                  <SelectItem value="supermarket">Supermarket</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Business List */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Businesses</CardTitle>
            <CardDescription>
              {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No businesses found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schema</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusinesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              {businessTypeIcons[business.businessType]}
                            </div>
                            <div>
                              <p className="font-medium">{business.name}</p>
                              <p className="text-sm text-muted-foreground">{business.city || 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {businessTypeLabels[business.businessType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {business.schemaName}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{business.email}</p>
                            <p className="text-xs text-muted-foreground">{business.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              business.status === 'active'
                                ? 'success'
                                : business.status === 'suspended'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {business.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(business.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUsers(business)}>
                                <Users className="h-4 w-4 mr-2" />
                                View Users
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(business)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(business)}>
                                {business.status === 'active' ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBusiness(business)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
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

      {/* Edit Business Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update business information for {selectedBusiness?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBusiness} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="editName">Business Name *</Label>
                <Input
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Business Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Phone *</Label>
                <Input
                  id="editPhone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editCity">City</Label>
                <Input
                  id="editCity"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editAddress">Address</Label>
                <Input
                  id="editAddress"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="editSubscription">Subscription Plan</Label>
                <Select
                  value={editFormData.subscriptionPlan}
                  onValueChange={(value: 'free' | 'basic' | 'premium' | 'enterprise') =>
                    setEditFormData({ ...editFormData, subscriptionPlan: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Business
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Users Dialog */}
      <Dialog open={isViewUsersOpen} onOpenChange={setIsViewUsersOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Users - {selectedBusiness?.name}</DialogTitle>
            <DialogDescription>
              Manage users for this business. You can delete users or reset their passwords.
            </DialogDescription>
          </DialogHeader>
          {isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : businessUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'success' : 'destructive'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reset Password"
                          onClick={() => {
                            setResetPasswordUserId(user.id);
                            setResetPasswordName(user.name);
                            setNewPassword('');
                            setIsResetPasswordOpen(true);
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          title="Delete User"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting || newPassword.length < 6}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
