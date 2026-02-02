import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Building2,
  Bell,
  Printer,
  Shield,
  Database,
  Save,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { businessService } from '@/services/businessService';

export default function Settings() {
  const { toast } = useToast();
  const { business, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Business form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  // Load business details on mount
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        email: business.email || '',
        phone: business.phone || '',
        address: business.address || '',
        city: business.city || '',
        country: business.country || '',
      });
    }
  }, [business]);

  const handleSave = async () => {
    if (!business?.id) {
      toast({
        title: 'Error',
        description: 'No business context found',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await businessService.update(business.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        country: formData.country,
      });

      if (response.success) {
        toast({
          title: 'Settings Saved',
          description: 'Your business settings have been updated successfully.',
        });
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your business system settings</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="printing" className="gap-2">
              <Printer className="h-4 w-4" />
              Printing
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Basic details about your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input 
                          id="businessName" 
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter business name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Input 
                          id="businessType" 
                          value={business?.businessType || 'N/A'}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone" 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input 
                          id="city" 
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Enter city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input 
                          id="country" 
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          placeholder="Enter country"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input 
                          id="address" 
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Enter full address"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when items reach reorder level</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Expiry Alerts</p>
                    <p className="text-sm text-muted-foreground">Alert for products expiring within 90 days</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Sales Summary</p>
                    <p className="text-sm text-muted-foreground">Receive daily sales report via email</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Order Notifications</p>
                    <p className="text-sm text-muted-foreground">Alert when purchase orders are received</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printing">
            <Card>
              <CardHeader>
                <CardTitle>Receipt & Printing Settings</CardTitle>
                <CardDescription>Configure how receipts are printed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Receipt Header</Label>
                    <Input defaultValue={formData.name || 'Your Business'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Footer</Label>
                    <Input defaultValue="Thank you for shopping with us!" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-print Receipt</p>
                    <p className="text-sm text-muted-foreground">Automatically print after each sale</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Include Batch Numbers</p>
                    <p className="text-sm text-muted-foreground">Show batch numbers on receipts</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security and access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Login for POS</p>
                    <p className="text-sm text-muted-foreground">Users must login to access POS</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Logout</p>
                    <p className="text-sm text-muted-foreground">Logout after 30 minutes of inactivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manager Approval for Discounts</p>
                    <p className="text-sm text-muted-foreground">Require manager approval for discounts over 10%</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Backup & Data</CardTitle>
                <CardDescription>Manage your data and backups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">Automatically backup data daily</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Create Backup Now
                  </Button>
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
