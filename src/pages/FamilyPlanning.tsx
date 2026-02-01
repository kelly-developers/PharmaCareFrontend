import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { familyPlanningService, FamilyPlanningRecord, FamilyPlanningSummary, FP_METHODS } from '@/services/familyPlanningService';
import { format, differenceInDays } from 'date-fns';
import {
  Calendar,
  User,
  Phone,
  Syringe,
  Pill,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Users,
  CalendarCheck,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FamilyPlanning() {
  const [records, setRecords] = useState<FamilyPlanningRecord[]>([]);
  const [summary, setSummary] = useState<FamilyPlanningSummary>({
    totalClients: 0,
    activeClients: 0,
    overdueCount: 0,
    upcomingCount: 0,
    depoCount: 0,
    herbalCount: 0,
    femiPlanCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdministerDialog, setShowAdministerDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FamilyPlanningRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newRecord, setNewRecord] = useState({
    clientName: '',
    clientPhone: '',
    method: '' as 'DEPO' | 'HERBAL' | 'FEMI_PLAN' | '',
    lastAdministeredDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  const [administerData, setAdministerData] = useState({
    administeredDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const { toast } = useToast();

  // Transform backend data to frontend format
  const transformRecord = (data: any): FamilyPlanningRecord => {
    return {
      id: data.id,
      clientName: data.client_name || data.clientName || 'Unknown',
      clientPhone: data.client_phone || data.clientPhone || '',
      method: data.method || 'DEPO',
      methodName: FP_METHODS[data.method as keyof typeof FP_METHODS]?.name || data.method,
      lastAdministeredDate: data.last_administered_date || data.lastAdministeredDate || '',
      nextDueDate: data.next_due_date || data.nextDueDate || '',
      cycleDays: data.cycle_days || data.cycleDays || 28,
      notes: data.notes || '',
      status: (data.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'COMPLETED',
      dueStatus: data.due_status || data.dueStatus || 'scheduled',
      daysUntilDue: data.days_until_due || data.daysUntilDue,
      daysOverdue: data.days_overdue || data.daysOverdue,
      createdBy: data.created_by || data.createdBy,
      createdByName: data.created_by_name || data.createdByName,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const filters: { status?: string; method?: string } = {};
      if (activeTab !== 'all') filters.status = activeTab;
      if (methodFilter !== 'all') filters.method = methodFilter;
      
      const [recordsRes, summaryRes] = await Promise.all([
        familyPlanningService.getAll(filters),
        familyPlanningService.getSummary(),
      ]);

      if (recordsRes.success && recordsRes.data) {
        const data = Array.isArray(recordsRes.data) ? recordsRes.data : 
          (recordsRes.data as any).data || (recordsRes.data as any).content || [];
        setRecords(data.map(transformRecord));
      }

      if (summaryRes.success && summaryRes.data) {
        const sumData = (summaryRes.data as any).data || summaryRes.data;
        setSummary({
          totalClients: sumData.totalClients || sumData.total_clients || 0,
          activeClients: sumData.activeClients || sumData.active_clients || 0,
          overdueCount: sumData.overdueCount || sumData.overdue_count || 0,
          upcomingCount: sumData.upcomingCount || sumData.upcoming_count || 0,
          depoCount: sumData.depoCount || sumData.depo_count || 0,
          herbalCount: sumData.herbalCount || sumData.herbal_count || 0,
          femiPlanCount: sumData.femiPlanCount || sumData.femi_plan_count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching family planning records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load family planning records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeTab, methodFilter]);

  const handleAddRecord = async () => {
    if (!newRecord.clientName || !newRecord.clientPhone || !newRecord.method || !newRecord.lastAdministeredDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await familyPlanningService.create({
        clientName: newRecord.clientName,
        clientPhone: newRecord.clientPhone,
        method: newRecord.method,
        lastAdministeredDate: newRecord.lastAdministeredDate,
        notes: newRecord.notes,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Family planning record created for ${newRecord.clientName}`,
        });
        setShowAddDialog(false);
        setNewRecord({
          clientName: '',
          clientPhone: '',
          method: '',
          lastAdministeredDate: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
        });
        fetchRecords();
      } else {
        throw new Error(response.error || 'Failed to create record');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create record',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminister = async () => {
    if (!selectedRecord || !administerData.administeredDate) return;

    setIsProcessing(true);
    try {
      const response = await familyPlanningService.administer(
        selectedRecord.id,
        administerData.administeredDate,
        administerData.notes
      );

      if (response.success) {
        toast({
          title: 'Success',
          description: `Next appointment scheduled for ${selectedRecord.clientName}`,
        });
        setShowAdministerDialog(false);
        setSelectedRecord(null);
        setAdministerData({
          administeredDate: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
        });
        fetchRecords();
      } else {
        throw new Error(response.error || 'Failed to record administration');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record administration',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'DEPO':
        return <Syringe className="h-4 w-4" />;
      default:
        return <Pill className="h-4 w-4" />;
    }
  };

  const getMethodBadge = (method: string) => {
    const methodInfo = FP_METHODS[method as keyof typeof FP_METHODS];
    const colors = {
      DEPO: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      HERBAL: 'bg-green-500/10 text-green-600 border-green-500/20',
      FEMI_PLAN: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    };
    
    return (
      <Badge variant="outline" className={cn(colors[method as keyof typeof colors] || 'bg-muted')}>
        {getMethodIcon(method)}
        <span className="ml-1">{methodInfo?.name || method}</span>
      </Badge>
    );
  };

  const getDueStatusBadge = (record: FamilyPlanningRecord) => {
    const nextDue = new Date(record.nextDueDate);
    const today = new Date();
    const daysUntil = differenceInDays(nextDue, today);
    
    if (daysUntil < 0) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          {Math.abs(daysUntil)} days overdue
        </Badge>
      );
    } else if (daysUntil <= 7) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          {daysUntil} days
        </Badge>
      );
    }
  };

  // Sort records - overdue first, then upcoming, then scheduled
  const sortedRecords = [...records].sort((a, b) => {
    const aDue = new Date(a.nextDueDate).getTime();
    const bDue = new Date(b.nextDueDate).getTime();
    return aDue - bDue;
  });

  // Filter by search query
  const filteredRecords = sortedRecords.filter(record => 
    record.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.clientPhone.includes(searchQuery)
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Family Planning
            </h1>
            <p className="text-muted-foreground text-sm">
              Track Depo, Herbal, and Femi Plan appointments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRecords} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{summary.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-lg font-bold text-success">{summary.activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="text-lg font-bold text-destructive">{summary.overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                  <p className="text-lg font-bold text-warning">{summary.upcomingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Syringe className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Depo</p>
                  <p className="text-lg font-bold">{summary.depoCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Pill className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Herbal</p>
                  <p className="text-lg font-bold">{summary.herbalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Pill className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Femi Plan</p>
                  <p className="text-lg font-bold">{summary.femiPlanCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3"
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="DEPO">Depo Injection</SelectItem>
                  <SelectItem value="HERBAL">Herbal</SelectItem>
                  <SelectItem value="FEMI_PLAN">Femi Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="all">All Clients</TabsTrigger>
            <TabsTrigger value="overdue" className="text-destructive">Overdue</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-warning">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Client Records
                </CardTitle>
                <CardDescription>
                  Clients sorted by next due date (soonest first)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">No records found</p>
                    <p className="text-sm text-muted-foreground/60">
                      Add your first family planning client to get started
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Last Date</TableHead>
                          <TableHead>Next Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {record.clientName}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {record.clientPhone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{getMethodBadge(record.method)}</TableCell>
                            <TableCell className="text-sm">
                              {record.lastAdministeredDate ? format(new Date(record.lastAdministeredDate), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {record.nextDueDate ? format(new Date(record.nextDueDate), 'MMM dd, yyyy') : '-'}
                              </div>
                            </TableCell>
                            <TableCell>{getDueStatusBadge(record)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setAdministerData({
                                    administeredDate: format(new Date(), 'yyyy-MM-dd'),
                                    notes: '',
                                  });
                                  setShowAdministerDialog(true);
                                }}
                              >
                                <Syringe className="h-4 w-4 mr-1" />
                                Administer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Planning Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input
                placeholder="Enter client name"
                value={newRecord.clientName}
                onChange={(e) => setNewRecord({ ...newRecord, clientName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="e.g., 0712345678"
                value={newRecord.clientPhone}
                onChange={(e) => setNewRecord({ ...newRecord, clientPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select
                value={newRecord.method}
                onValueChange={(v) => setNewRecord({ ...newRecord, method: v as 'DEPO' | 'HERBAL' | 'FEMI_PLAN' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPO">
                    <div className="flex items-center gap-2">
                      <Syringe className="h-4 w-4" />
                      Depo Injection (84 days / 3 months)
                    </div>
                  </SelectItem>
                  <SelectItem value="HERBAL">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Herbal (28 days)
                    </div>
                  </SelectItem>
                  <SelectItem value="FEMI_PLAN">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Femi Plan (28 days)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Administered *</Label>
              <Input
                type="date"
                value={newRecord.lastAdministeredDate}
                onChange={(e) => setNewRecord({ ...newRecord, lastAdministeredDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecord} disabled={isProcessing}>
              {isProcessing ? 'Creating...' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Administer Dialog */}
      <Dialog open={showAdministerDialog} onOpenChange={setShowAdministerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Administration</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-accent/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selectedRecord.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedRecord.clientPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  {getMethodBadge(selectedRecord.method)}
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Previous Date</span>
                  <span>{selectedRecord.lastAdministeredDate ? format(new Date(selectedRecord.lastAdministeredDate), 'MMM dd, yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cycle</span>
                  <span>{selectedRecord.cycleDays} days</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Administration Date *</Label>
                  <Input
                    type="date"
                    value={administerData.administeredDate}
                    onChange={(e) => setAdministerData({ ...administerData, administeredDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Optional notes..."
                    value={administerData.notes}
                    onChange={(e) => setAdministerData({ ...administerData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-sm text-success-foreground font-medium">
                  ℹ️ Next appointment will be scheduled {selectedRecord.cycleDays} days from the administration date
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdministerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdminister} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Record & Schedule Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
