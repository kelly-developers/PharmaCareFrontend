import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStock } from '@/contexts/StockContext';
import { usePrescriptions } from '@/contexts/PrescriptionsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  FileBox,
  User,
  Pill,
  Search,
  Eye,
  Printer,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface PrescriptionItemForm {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const frequencies = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'As needed',
];

const durations = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  'Until finished',
  'Ongoing',
];

export default function Prescriptions() {
  const { prescriptions, addPrescription, updatePrescriptionStatus } = usePrescriptions();
  const { user } = useAuth(); // Get current user for display
  const { medicines } = useStock();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemForm[]>([
    { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    diagnosis: '',
    notes: '',
  });
  const { toast } = useToast();

  // Get medicine names from stock
  const availableMedicines = medicines.filter(m => m.stockQuantity > 0).map(m => m.name);

  const filteredPrescriptions = prescriptions.filter(rx =>
    rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rx.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addPrescriptionItem = () => {
    setPrescriptionItems([...prescriptionItems, { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removePrescriptionItem = (index: number) => {
    if (prescriptionItems.length > 1) {
      setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
    }
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItemForm, value: string) => {
    const updated = [...prescriptionItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionItems(updated);
  };

  const handleCreatePrescription = async () => {
    if (!formData.patientName || !formData.diagnosis || !prescriptionItems[0].medicine) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Don't send createdBy - backend will get it from authentication
      const prescription = {
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        diagnosis: formData.diagnosis,
        items: prescriptionItems.filter(item => item.medicine),
        notes: formData.notes,
      };

      const result = await addPrescription(prescription);
      
      if (result) {
        setShowAddDialog(false);
        setFormData({ patientName: '', patientPhone: '', diagnosis: '', notes: '' });
        setPrescriptionItems([{ medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
        
        toast({
          title: 'Prescription Created',
          description: `Prescription for ${prescription.patientName} has been created`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create prescription',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create prescription',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'DISPENSED':
        return <Badge variant="success">Dispensed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleUpdateStatus = async (id: string, status: 'PENDING' | 'DISPENSED' | 'CANCELLED') => {
    try {
      if (status === 'DISPENSED') {
        // For dispensed status, you might want to pass the current user's ID
        // This depends on your backend implementation
        await updatePrescriptionStatus(id, status, user?.id);
      } else {
        await updatePrescriptionStatus(id, status);
      }
      
      toast({
        title: 'Status Updated',
        description: `Prescription status updated to ${status.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
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
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Prescriptions</h1>
            <p className="text-muted-foreground mt-1">Create and manage patient prescriptions</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Prescription</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* Patient Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Patient Name *</Label>
                      <Input
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={formData.patientPhone}
                        onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                        placeholder="07xxxxxxxx"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Diagnosis *</Label>
                    <Input
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                      placeholder="e.g., Upper Respiratory Tract Infection"
                    />
                  </div>
                </div>

                {/* Medicines */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Prescribed Medicines
                  </h3>
                  {prescriptionItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Medicine {index + 1}</Badge>
                          {prescriptionItems.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removePrescriptionItem(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={item.medicine}
                            onValueChange={(value) => updatePrescriptionItem(index, 'medicine', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select medicine" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMedicines.map((med) => (
                                <SelectItem key={med} value={med}>{med}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={item.dosage}
                            onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                            placeholder="Dosage (e.g., 1 tablet)"
                          />
                          <Select
                            value={item.frequency}
                            onValueChange={(value) => updatePrescriptionItem(index, 'frequency', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencies.map((freq) => (
                                <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={item.duration}
                            onValueChange={(value) => updatePrescriptionItem(index, 'duration', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {durations.map((dur) => (
                                <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          value={item.instructions}
                          onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                          placeholder="Special instructions (e.g., Take after meals)"
                        />
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="outline" onClick={addPrescriptionItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Medicine
                  </Button>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional instructions for the patient"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleCreatePrescription} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prescription
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileBox className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Prescriptions</p>
                  <p className="text-2xl font-bold">{prescriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <FileBox className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    {prescriptions.filter(rx => rx.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat" className="border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dispensed</p>
                  <p className="text-2xl font-bold">
                    {prescriptions.filter(rx => rx.status === 'DISPENSED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Prescription Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Medicines</TableHead>
                    <TableHead>Prescribed By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell className="font-mono font-medium">{rx.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rx.patientName}</p>
                          {rx.patientPhone && (
                            <p className="text-xs text-muted-foreground">{rx.patientPhone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{rx.diagnosis}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rx.items.length} medicine(s)</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{rx.createdByName || 'Unknown'}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rx.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(rx.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPrescription(rx)}
                          className="mr-2"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {rx.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(rx.id, 'DISPENSED')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Dispense
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Prescription Dialog */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription Details</span>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-4 pt-4">
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-lg">PharmaPOS Kenya</h2>
                <p className="text-xs text-muted-foreground">Prescription</p>
                <p className="text-sm font-mono mt-2">{selectedPrescription.id}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-medium">{selectedPrescription.patientName}</span>
                </div>
                {selectedPrescription.patientPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedPrescription.patientPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diagnosis:</span>
                  <span className="font-medium">{selectedPrescription.diagnosis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(selectedPrescription.createdAt), 'PPP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedPrescription.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prescribed by:</span>
                  <span>{selectedPrescription.createdByName || 'Unknown'}</span>
                </div>
                {selectedPrescription.dispensedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispensed:</span>
                    <span>{format(new Date(selectedPrescription.dispensedAt), 'PPP')} by {selectedPrescription.dispensedByName || 'Unknown'}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Prescribed Medicines:</h4>
                <div className="space-y-3">
                  {selectedPrescription.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-secondary/50">
                      <p className="font-medium">{idx + 1}. {item.medicine}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.dosage} • {item.frequency} • {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Instructions: {item.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedPrescription.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {selectedPrescription.notes}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground text-center">
                <p>Prescribed by: {selectedPrescription.createdByName || 'Unknown'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}