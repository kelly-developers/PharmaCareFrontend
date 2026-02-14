import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStock } from '@/contexts/StockContext';
import { stockService } from '@/services/stockService';
import { Package, Minus, Search, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InternalUse() {
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { medicines, refreshMedicines } = useStock();

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (m.stockQuantity || 0) > 0
  );

  const selectedMedicine = medicines.find(m => m.id === selectedMedicineId);

  const handleSubmit = async () => {
    if (!selectedMedicineId || !quantity || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Please select a medicine, enter quantity, and provide a reason',
        variant: 'destructive',
      });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid Quantity', description: 'Enter a valid quantity', variant: 'destructive' });
      return;
    }

    if (selectedMedicine && qty > (selectedMedicine.stockQuantity || 0)) {
      toast({ title: 'Insufficient Stock', description: `Only ${selectedMedicine.stockQuantity} available`, variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await stockService.recordInternalUse({
        medicineId: selectedMedicineId,
        quantity: qty,
        reason,
        notes,
      });

      if (response.success) {
        toast({
          title: 'Internal Use Recorded',
          description: response.data?.message || `${selectedMedicine?.name} x${qty} expensed for internal use`,
        });
        setSelectedMedicineId('');
        setQuantity('');
        setReason('');
        setNotes('');
        refreshMedicines();
      } else {
        throw new Error(response.error || 'Failed to record internal use');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record internal use',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Internal Pharmacy Use
          </h1>
          <p className="text-muted-foreground text-sm">
            Expense items used within the pharmacy (spirits, cotton, etc.). Items are deducted from stock and added to expenses at purchase price.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Minus className="h-5 w-5" />
              Record Internal Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Medicine Search & Select */}
            <div className="space-y-2">
              <Label>Search Medicine</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Medicine *</Label>
              <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a medicine" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMedicines.map(med => (
                    <SelectItem key={med.id} value={med.id}>
                      <div className="flex items-center gap-2">
                        <span>{med.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Stock: {med.stockQuantity || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMedicine && (
              <div className="p-3 bg-accent/30 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medicine</span>
                  <span className="font-medium">{selectedMedicine.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock</span>
                  <span>{selectedMedicine.stockQuantity || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Price</span>
                  <span>KSh {(selectedMedicine.costPrice || 0).toLocaleString()}</span>
                </div>
                {quantity && parseInt(quantity) > 0 && (
                  <div className="flex justify-between font-bold border-t pt-1 mt-1">
                    <span>Total Cost</span>
                    <span className="text-destructive">
                      KSh {((selectedMedicine.costPrice || 0) * parseInt(quantity)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                max={selectedMedicine?.stockQuantity || 999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Use *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Cleaning supplies, First aid, Patient care"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This will <strong>deduct items from stock</strong> and create an <strong>expense at purchase price</strong>. 
                The cost will be included in expenses but <strong>not</strong> added to profit calculations.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isProcessing || !selectedMedicineId || !quantity || !reason}
            >
              {isProcessing ? 'Processing...' : 'Record Internal Use & Create Expense'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
