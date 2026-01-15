import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supplierService } from '@/services/supplierService';
import { Supplier } from '@/types/pharmacy';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Truck,
  FileText,
  MoreVertical,
  Loader2,
  RefreshCw,
  User,
  Building,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const [editSupplier, setEditSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  // FIXED: Fetch suppliers from backend with correct pagination
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use page=0 (not 1) to match backend pagination
      const response = await supplierService.getAll(0, 1000);
      console.log('Suppliers API response:', response);
      
      if (response.success && response.data) {
        const data = response.data;
        let suppliersList: Supplier[] = [];
        
        // Handle various response formats from API
        if (data.content && Array.isArray(data.content)) {
          suppliersList = data.content;
        } else if (Array.isArray(data)) {
          suppliersList = data;
        } else if (data.data && Array.isArray(data.data)) {
          suppliersList = data.data;
        } else if (data.suppliers && Array.isArray(data.suppliers)) {
          suppliersList = data.suppliers;
        }
        
        // Transform backend fields to frontend format
        const transformedSuppliers = suppliersList.map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person || supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          notes: supplier.notes,
          isActive: supplier.is_active !== false && supplier.active !== false,
          createdAt: supplier.created_at || supplier.createdAt,
          updatedAt: supplier.updated_at || supplier.updatedAt
        }));
        
        console.log('Processed suppliers:', transformedSuppliers);
        setSuppliers(transformedSuppliers);
      } else {
        console.error('Failed to fetch suppliers:', response.error);
        toast({
          title: 'Warning',
          description: response.error || 'No suppliers data received',
          variant: 'destructive',
        });
        setSuppliers([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch suppliers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load suppliers',
        variant: 'destructive',
      });
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = suppliers.filter(
    (sup) =>
      sup.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup.phone?.includes(searchQuery)
  );

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Name and Phone)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await supplierService.create(newSupplier);
      console.log('Create supplier response:', response);
      
      if (response.success) {
        setShowAddDialog(false);
        setNewSupplier({
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          city: '',
        });
        toast({
          title: 'Supplier Added',
          description: `${newSupplier.name} has been added successfully`,
        });
        // Refetch all suppliers to ensure data consistency
        await fetchSuppliers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to add supplier',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to add supplier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add supplier',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!selectedSupplier) return;

    if (!editSupplier.name || !editSupplier.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Name and Phone)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await supplierService.update(selectedSupplier.id, editSupplier);
      
      if (response.success) {
        setShowEditDialog(false);
        toast({
          title: 'Supplier Updated',
          description: `${editSupplier.name} has been updated successfully`,
        });
        await fetchSuppliers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update supplier',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to update supplier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update supplier',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;

    try {
      const response = await supplierService.delete(selectedSupplier.id);
      if (response.success) {
        toast({
          title: 'Supplier Deleted',
          description: 'The supplier has been removed',
        });
        setShowDeleteDialog(false);
        setSelectedSupplier(null);
        await fetchSuppliers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete supplier',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete supplier',
        variant: 'destructive',
      });
    }
  };

  const handleActivateSupplier = async (id: string) => {
    try {
      const response = await supplierService.activate(id);
      if (response.success) {
        toast({
          title: 'Supplier Activated',
          description: 'The supplier has been activated',
        });
        await fetchSuppliers();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate supplier',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditSupplier({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteDialog(true);
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => {
    return isActive ? (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    ) : (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Suppliers</h1>
            <p className="text-muted-foreground mt-1">Manage your medicine suppliers</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-sm">
                Total: {suppliers.length}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Active: {suppliers.filter(s => s.isActive).length}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSuppliers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Supplier
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Supplier Name *</Label>
                    <Input
                      id="name"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      placeholder="e.g., PharmaCorp Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        placeholder="e.g., +254 712 345 678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                        placeholder="e.g., contact@supplier.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      placeholder="e.g., 123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newSupplier.city}
                      onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                      placeholder="e.g., Nairobi"
                    />
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
                      onClick={handleAddSupplier} 
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
                          Add Supplier
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name, contact, city, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchQuery('')}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Suppliers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading suppliers...</span>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? 'No matching suppliers found' : 'No suppliers found'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Add your first supplier to get started'}
            </p>
            {!searchQuery && (
              <Button variant="hero" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} variant="elevated" className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{supplier.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge isActive={supplier.isActive !== false} />
                          {supplier.contactPerson && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {supplier.contactPerson}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Supplier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Orders
                        </DropdownMenuItem>
                        {!supplier.isActive && (
                          <DropdownMenuItem onClick={() => handleActivateSupplier(supplier.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => openDeleteDialog(supplier)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={supplier.phone ? '' : 'text-muted-foreground italic'}>
                      {supplier.phone || 'No phone'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={`truncate ${supplier.email ? '' : 'text-muted-foreground italic'}`}>
                      {supplier.email || 'No email'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      {supplier.address ? (
                        <>
                          <span>{supplier.address}</span>
                          {supplier.city && (
                            <span className="text-muted-foreground">, {supplier.city}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">No address</span>
                      )}
                    </div>
                  </div>
                  {supplier.notes && (
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      <p className="line-clamp-2">{supplier.notes}</p>
                    </div>
                  )}
                  <div className="pt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-1" />
                      New Order
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Supplier
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Supplier Name *</Label>
                <Input
                  id="edit-name"
                  value={editSupplier.name}
                  onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })}
                  placeholder="e.g., PharmaCorp Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactPerson">Contact Person</Label>
                <Input
                  id="edit-contactPerson"
                  value={editSupplier.contactPerson}
                  onChange={(e) => setEditSupplier({ ...editSupplier, contactPerson: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={editSupplier.phone}
                    onChange={(e) => setEditSupplier({ ...editSupplier, phone: e.target.value })}
                    placeholder="e.g., +254 712 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editSupplier.email}
                    onChange={(e) => setEditSupplier({ ...editSupplier, email: e.target.value })}
                    placeholder="e.g., contact@supplier.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editSupplier.address}
                  onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editSupplier.city}
                  onChange={(e) => setEditSupplier({ ...editSupplier, city: e.target.value })}
                  placeholder="e.g., Nairobi"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)} 
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleEditSupplier} 
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
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the supplier "{selectedSupplier?.name}". 
                This action cannot be undone. The supplier can be reactivated later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedSupplier(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteSupplier}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Supplier
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}