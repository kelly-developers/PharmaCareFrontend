import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  // Fetch suppliers from backend
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await supplierService.getAll(1, 1000); // Get all suppliers without pagination limit
      console.log('Suppliers API response:', response);
      
      if (response.success && response.data) {
        const data = response.data;
        let suppliersList: Supplier[] = [];
        
        // Handle various response formats from API
        if (Array.isArray(data)) {
          suppliersList = data;
        } else if (data.content && Array.isArray(data.content)) {
          suppliersList = data.content;
        } else if (data.data && Array.isArray(data.data)) {
          suppliersList = data.data;
        } else if (data.suppliers && Array.isArray(data.suppliers)) {
          suppliersList = data.suppliers;
        }
        
        console.log('Processed suppliers:', suppliersList);
        setSuppliers(suppliersList);
      } else {
        console.error('Failed to fetch suppliers:', response.error);
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers',
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
      sup.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.contactPerson || !newSupplier.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Name, Contact Person, Phone)',
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
    } catch (error) {
      console.error('Failed to add supplier:', error);
      toast({
        title: 'Error',
        description: 'Failed to add supplier',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const response = await supplierService.delete(id);
      if (response.success) {
        toast({
          title: 'Supplier Deleted',
          description: 'The supplier has been removed',
        });
        // Refetch to ensure data consistency
        await fetchSuppliers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete supplier',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete supplier',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Suppliers</h1>
            <p className="text-muted-foreground mt-1">Manage your medicine suppliers</p>
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
                  <DialogTitle>Add New Supplier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Supplier Name *</Label>
                    <Input
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      placeholder="e.g., PharmaCorp Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person *</Label>
                    <Input
                      value={newSupplier.contactPerson}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        placeholder="e.g., +254 712 345 678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                        placeholder="e.g., contact@supplier.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      placeholder="e.g., 123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
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
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Suppliers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No suppliers found</p>
            <p className="text-sm text-muted-foreground">Add your first supplier to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} variant="elevated" className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <Truck className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{supplier.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Supplier</DropdownMenuItem>
                        <DropdownMenuItem>View Orders</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{supplier.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{supplier.address || 'N/A'}{supplier.city ? `, ${supplier.city}` : ''}</span>
                  </div>
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
      </div>
    </MainLayout>
  );
}
