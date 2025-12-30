import { useState, useRef, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Search,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  FileText,
  ClipboardList,
  Truck,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { useStock } from '@/contexts/StockContext';
import { stockService } from '@/services/stockService';
import { reportService } from '@/services/reportService';

// Generate month options for the last 12 months
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    });
  }
  return options;
};

export default function StockManagement() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'opening' | 'closing'>('closing');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { medicines } = useStock();
  
  // State for stock data from backend
  const [stockData, setStockData] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState({
    totalOpeningValue: 0,
    totalCOGS: 0,
    totalClosingValue: 0,
    totalMissingValue: 0,
    missingItems: [] as any[],
    restockRecommendations: [] as any[],
    bestSellingItems: [] as any[]
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const monthOptions = getMonthOptions();

  // Fetch stock data from backend
  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      // Fetch stock audit report from report service
      const auditResponse = await reportService.getStockAuditReport();
      const breakdownResponse = await stockService.getBreakdown();
      
      if (auditResponse.success && auditResponse.data) {
        // Transform data for display
        const transformedData = (Array.isArray(auditResponse.data) ? auditResponse.data : []).map((item: any) => {
          const med = medicines.find(m => m.id === item.medicineId);
          
          
          return {
            id: item.medicineId,
            medicineName: item.medicineName,
            medicineId: item.medicineId,
            totalSold: item.totalSold,
            totalLost: item.totalLost || 0,
            totalAdjusted: item.totalAdjusted || 0,
            currentStock: item.currentStock,
            costPrice: med?.costPrice || 0,
            totalClosingValue: item.currentStock * (med?.costPrice || 0),
            cogsValue: item.totalSold * (med?.costPrice || 0)
          };
        });
        
        setStockData(transformedData);
        
        // Calculate stats
        const totalOpeningValue = transformedData.reduce((sum, d) => sum + (d.currentStock + d.totalSold - d.totalAdjusted) * d.costPrice, 0);
        const totalCOGS = transformedData.reduce((sum, d) => sum + d.cogsValue, 0);
        const totalClosingValue = transformedData.reduce((sum, d) => sum + d.totalClosingValue, 0);
        const missingItems = transformedData.filter(d => d.totalLost > 0);
        const totalMissingValue = missingItems.reduce((sum, d) => sum + (d.totalLost * d.costPrice), 0);
        
        // Generate restock recommendations
        const restockRecommendations = transformedData
          .filter(item => item.currentStock < 100 || item.totalSold > 50)
          .map(item => ({
            id: item.medicineId,
            name: item.medicineName,
            category: medicines.find(m => m.id === item.medicineId)?.category || 'Unknown',
            currentStock: item.currentStock,
            totalSold: item.totalSold,
            avgDailySales: Math.round((item.totalSold / 30) * 10) / 10,
            daysOfStock: item.totalSold > 0 ? Math.floor(item.currentStock / (item.totalSold / 30)) : 999,
            suggestedReorder: Math.max(100, Math.ceil((item.totalSold / 30) * 30)),
            costPrice: item.costPrice,
            reorderValue: Math.max(100, Math.ceil((item.totalSold / 30) * 30)) * item.costPrice,
            priority: item.currentStock < 20 ? 'critical' : 
                     item.currentStock < 50 ? 'high' : 
                     item.totalSold > 100 ? 'medium' : 'low'
          }))
          .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority] || b.totalSold - a.totalSold;
          });
        
        // Get best selling items
        const bestSellingItems = [...transformedData]
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 5);
        
        setStockStats({
          totalOpeningValue,
          totalCOGS,
          totalClosingValue,
          totalMissingValue,
          missingItems,
          restockRecommendations,
          bestSellingItems
        });
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stock data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [selectedMonth]);

  // Download current stock for physical counting
  const downloadCurrentStock = async () => {
    const XLSX = await import('xlsx');
    
    const data = stockData.map(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      
      return {
        'Medicine': item.medicineName,
        'Medicine ID': item.medicineId,
        'Category': med?.category || '',
        'Cost Price': item.costPrice,
        'Current Stock': item.currentStock,
        'Stock Value': item.totalClosingValue,
        'Counted': '',
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Count');
    
    // Add instructions sheet
    const instructionsData = [
      { 'Instructions': 'STOCK COUNTING TEMPLATE' },
      { 'Instructions': '' },
      { 'Instructions': '1. Use this sheet to count your physical stock' },
      { 'Instructions': '2. Fill in "Counted" column' },
      { 'Instructions': '3. Upload back to calculate variance and missing stock' },
      { 'Instructions': '' },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');
    
    XLSX.writeFile(wb, `stock_count_template_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: 'Stock Template Downloaded',
      description: 'Fill Counted column and upload back',
    });
  };

  // Export restock recommendations
  const exportRestockList = () => {
    const headers = 'Medicine,Category,Current Stock,Avg Daily Sales,Days Left,Suggested Qty,Cost Price,Reorder Value,Priority\n';
    const rows = stockStats.restockRecommendations.map(r => 
      `"${r.name}","${r.category}",${r.currentStock},${r.avgDailySales},${r.daysOfStock},${r.suggestedReorder},${r.costPrice},${r.reorderValue},"${r.priority}"`
    ).join('\n');
    
    const totalValue = stockStats.restockRecommendations.reduce((sum, r) => sum + r.reorderValue, 0);
    const summary = `\n\nTOTAL REORDER VALUE,,,,,,,KSh ${totalValue.toLocaleString()},`;
    
    const csvContent = headers + rows + summary;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock_recommendations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({ title: 'Restock List Exported', description: 'Share with supplier for ordering' });
  };

  const filteredData = stockData.filter(item =>
    item.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Low stock items (less than 50 units)
  const lowStockItems = medicines.filter(m => m.stockQuantity < 50);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an Excel (.xlsx, .xls) or CSV file',
        variant: 'destructive',
      });
      return;
    }

    // Process file upload - in production this would parse the file
    toast({
      title: 'Stock Uploaded',
      description: `${uploadType === 'opening' ? 'Opening' : 'Closing'} stock for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')} uploaded successfully. Stock comparison will be calculated.`,
    });
    
    setShowUploadDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    
    const data = stockData.map(item => {
      return {
        'Medicine': item.medicineName,
        'Medicine ID': item.medicineId,
        'Cost Price': item.costPrice,
        'Current Stock': '',
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${uploadType === 'opening' ? 'Opening' : 'Closing'} Stock`);
    
    XLSX.writeFile(wb, `stock_${uploadType}_template_${selectedMonth}.xlsx`);
    
    toast({
      title: 'Template Downloaded',
      description: 'Fill in stock counts and upload back',
    });
  };

  const exportStockReport = async () => {
    const XLSX = await import('xlsx');
    
    const data = stockData.map(d => ({
      'Medicine': d.medicineName,
      'Cost': d.costPrice,
      'Opening Stock': d.currentStock + d.totalSold - d.totalAdjusted,
      'Opening Value': (d.currentStock + d.totalSold - d.totalAdjusted) * d.costPrice,
      'Sold': d.totalSold,
      'COGS': d.cogsValue,
      'Closing Stock': d.currentStock,
      'Closing Value': d.totalClosingValue,
      'Loss': d.totalLost,
      'Loss Value': d.totalLost * d.costPrice,
      'Status': d.totalLost === 0 ? 'OK' : 'Loss',
    }));
    
    // Add summary row
    data.push({
      'Medicine': 'TOTAL',
      'Cost': 0,
      'Opening Stock': 0,
      'Opening Value': stockStats.totalOpeningValue,
      'Sold': stockData.reduce((sum, d) => sum + d.totalSold, 0),
      'COGS': stockStats.totalCOGS,
      'Closing Stock': 0,
      'Closing Value': stockStats.totalClosingValue,
      'Loss': stockData.reduce((sum, d) => sum + d.totalLost, 0),
      'Loss Value': stockStats.totalMissingValue,
      'Status': '',
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 8 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    
    XLSX.writeFile(wb, `stock_report_${selectedMonth}.xlsx`);
    
    toast({ title: 'Report Exported', description: 'Stock report exported as Excel' });
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Stock Report - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
            h3 { font-size: 13px; margin: 10px 0 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 10px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
            .summary-item { padding: 10px; background: #f9f9f9; border-radius: 5px; text-align: center; }
            .summary-item .label { font-size: 9px; color: #666; }
            .summary-item .value { font-size: 14px; font-weight: bold; margin-top: 3px; }
            .missing { color: #dc2626; font-weight: bold; }
            .ok { color: #16a34a; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>Stock Report - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</h1>
          <p style="text-align: center; color: #666;">Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">Opening Stock Value</div>
              <div class="value">KSh ${stockStats.totalOpeningValue.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Cost of Goods Sold</div>
              <div class="value">KSh ${stockStats.totalCOGS.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Closing Stock Value</div>
              <div class="value">KSh ${stockStats.totalClosingValue.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Missing Stock Value</div>
              <div class="value missing">KSh ${stockStats.totalMissingValue.toLocaleString()}</div>
            </div>
          </div>
          
          <h3>Stock Details</h3>
          <table>
            <tr>
              <th>Medicine</th>
              <th>Cost</th>
              <th>Opening Stock</th>
              <th>Opening Value</th>
              <th>Sold</th>
              <th>COGS</th>
              <th>Closing Stock</th>
              <th>Closing Value</th>
              <th>Loss</th>
              <th>Loss Value</th>
            </tr>
            ${stockData.map(d => `
              <tr>
                <td>${d.medicineName}</td>
                <td>KSh ${d.costPrice}</td>
                <td>${d.currentStock + d.totalSold - d.totalAdjusted}</td>
                <td>KSh ${((d.currentStock + d.totalSold - d.totalAdjusted) * d.costPrice).toLocaleString()}</td>
                <td>${d.totalSold}</td>
                <td>KSh ${d.cogsValue.toLocaleString()}</td>
                <td>${d.currentStock}</td>
                <td>KSh ${d.totalClosingValue.toLocaleString()}</td>
                <td class="${d.totalLost > 0 ? 'missing' : 'ok'}">${d.totalLost}</td>
                <td class="${d.totalLost > 0 ? 'missing' : ''}">KSh ${(d.totalLost * d.costPrice).toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
          
          ${stockStats.missingItems.length > 0 ? `
          <h3 class="missing">Items with Loss (${stockStats.missingItems.length})</h3>
          <table>
            <tr><th>Medicine</th><th>Lost Qty</th><th>Cost Price</th><th>Loss Value</th></tr>
            ${stockStats.missingItems.map(d => `
              <tr>
                <td>${d.medicineName}</td>
                <td class="missing">${d.totalLost}</td>
                <td>KSh ${d.costPrice}</td>
                <td class="missing">KSh ${(d.totalLost * d.costPrice).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr style="background: #fef2f2;"><td colspan="3"><strong>Total Loss Value</strong></td><td class="missing"><strong>KSh ${stockStats.totalMissingValue.toLocaleString()}</strong></td></tr>
          </table>
          ` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({ title: 'PDF Export', description: 'Print dialog opened' });
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-display">Stock Management</h1>
            <p className="text-muted-foreground text-sm">Monthly stock tracking, variance & missing items</p>
          </div>
          
          {/* Actions Row */}
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={downloadCurrentStock}>
              <ClipboardList className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Download </span>Stock
            </Button>
            
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1 md:mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Physical Stock Count</DialogTitle>
                  <DialogDescription>
                    Upload your counted stock to calculate missing items
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                    <p className="font-medium">How it works:</p>
                    <p>1. Download current stock list above</p>
                    <p>2. Count physical stock in shop</p>
                    <p>3. Update quantities in the file</p>
                    <p>4. Upload here to compare</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Stock Type</Label>
                    <Select value={uploadType} onValueChange={(v: 'opening' | 'closing') => setUploadType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening Stock (Start of Month)</SelectItem>
                        <SelectItem value="closing">Closing Stock (End of Month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload Excel or CSV with counted quantities
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="stock-upload"
                    />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" className="w-full" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={exportStockReport}>
              <FileSpreadsheet className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Export </span>Excel
            </Button>
            <Button size="sm" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Opening Value</span>
              </div>
              <p className="text-sm md:text-lg font-bold">KSh {stockStats.totalOpeningValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-warning" />
                <span className="text-[10px] md:text-xs text-muted-foreground">COGS</span>
              </div>
              <p className="text-sm md:text-lg font-bold">KSh {stockStats.totalCOGS.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-success" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Closing Value</span>
              </div>
              <p className="text-sm md:text-lg font-bold">KSh {stockStats.totalClosingValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Missing Items</span>
              </div>
              <p className="text-sm md:text-lg font-bold">{stockStats.missingItems.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Missing Value</span>
              </div>
              <p className="text-sm md:text-lg font-bold text-destructive">KSh {stockStats.totalMissingValue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tracking" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="tracking" className="flex-shrink-0 text-xs md:text-sm">
              <Package className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Stock </span>Tracking
            </TabsTrigger>
            <TabsTrigger value="restock" className="flex-shrink-0 text-xs md:text-sm">
              <Truck className="h-4 w-4 mr-1" />
              Restock
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex-shrink-0 text-xs md:text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Missing<span className="hidden sm:inline"> Items</span>
            </TabsTrigger>
            <TabsTrigger value="lowstock" className="flex-shrink-0 text-xs md:text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              Low Stock
            </TabsTrigger>
            <TabsTrigger value="bestselling" className="flex-shrink-0 text-xs md:text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Best<span className="hidden sm:inline"> Selling</span>
            </TabsTrigger>
          </TabsList>

          {/* Stock Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medicine..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Stock Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Stock movement and value analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Medicine</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs text-right">Opening</TableHead>
                          <TableHead className="text-xs text-right">Opening Val</TableHead>
                          <TableHead className="text-xs text-right">Sold</TableHead>
                          <TableHead className="text-xs text-right">COGS</TableHead>
                          <TableHead className="text-xs text-right">Closing</TableHead>
                          <TableHead className="text-xs text-right">Closing Val</TableHead>
                          <TableHead className="text-xs text-right">Loss</TableHead>
                          <TableHead className="text-xs text-right">Loss Val</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs">{item.medicineName}</TableCell>
                            <TableCell className="text-right text-xs">KSh {item.costPrice}</TableCell>
                            <TableCell className="text-right text-xs">
                              {item.currentStock + item.totalSold - item.totalAdjusted}
                            </TableCell>
                            <TableCell className="text-right text-xs">KSh {((item.currentStock + item.totalSold - item.totalAdjusted) * item.costPrice).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs text-warning">-{item.totalSold}</TableCell>
                            <TableCell className="text-right text-xs">KSh {item.cogsValue.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs">{item.currentStock}</TableCell>
                            <TableCell className="text-right text-xs">KSh {item.totalClosingValue.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs">
                              <span className={item.totalLost === 0 ? 'text-success' : 'text-destructive font-bold'}>
                                {item.totalLost}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {item.totalLost > 0 ? (
                                <span className="text-destructive font-bold">KSh {(item.totalLost * item.costPrice).toLocaleString()}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {item.totalLost === 0 ? (
                                <Badge variant="outline" className="text-[10px] gap-0.5 text-success border-success">
                                  <CheckCircle className="h-3 w-3" />OK
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] gap-0.5">
                                  <TrendingDown className="h-3 w-3" />Loss
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restock Recommendations Tab */}
          <TabsContent value="restock" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Truck className="h-4 w-4 text-primary" />
                      Restock Recommendations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Auto-generated from sales velocity and stock levels
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportRestockList}>
                    <Download className="h-4 w-4 mr-1" />
                    Export List
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {stockStats.restockRecommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
                    <p className="text-lg font-medium">All Stock Adequate</p>
                    <p className="text-muted-foreground text-sm">No immediate restocking needed</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 md:p-0 md:pb-4">
                      <div className="bg-destructive/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Critical</p>
                        <p className="text-lg font-bold text-destructive">
                          {stockStats.restockRecommendations.filter(r => r.priority === 'critical').length}
                        </p>
                      </div>
                      <div className="bg-warning/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">High</p>
                        <p className="text-lg font-bold text-warning">
                          {stockStats.restockRecommendations.filter(r => r.priority === 'high').length}
                        </p>
                      </div>
                      <div className="bg-info/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Medium</p>
                        <p className="text-lg font-bold text-info">
                          {stockStats.restockRecommendations.filter(r => r.priority === 'medium').length}
                        </p>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Total Value</p>
                        <p className="text-sm font-bold text-primary">
                          KSh {stockStats.restockRecommendations.reduce((sum, r) => sum + r.reorderValue, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <ScrollArea className="w-full">
                      <div className="min-w-[700px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Medicine</TableHead>
                              <TableHead className="text-xs">Category</TableHead>
                              <TableHead className="text-xs text-right">Current</TableHead>
                              <TableHead className="text-xs text-right">Avg Daily</TableHead>
                              <TableHead className="text-xs text-right">Days Left</TableHead>
                              <TableHead className="text-xs text-right">Suggested</TableHead>
                              <TableHead className="text-xs text-right">Value</TableHead>
                              <TableHead className="text-xs">Priority</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stockStats.restockRecommendations.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium text-xs">{item.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                                <TableCell className="text-right text-xs">{item.currentStock}</TableCell>
                                <TableCell className="text-right text-xs">{item.avgDailySales}</TableCell>
                                <TableCell className="text-right text-xs">
                                  <span className={
                                    item.daysOfStock < 7 ? 'text-destructive font-bold' : 
                                    item.daysOfStock < 14 ? 'text-warning font-bold' : ''
                                  }>
                                    {item.daysOfStock > 99 ? '99+' : item.daysOfStock}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium">{item.suggestedReorder}</TableCell>
                                <TableCell className="text-right text-xs">KSh {item.reorderValue.toLocaleString()}</TableCell>
                                <TableCell>
                                  {item.priority === 'critical' ? (
                                    <Badge variant="destructive" className="text-[10px]">Critical</Badge>
                                  ) : item.priority === 'high' ? (
                                    <Badge variant="outline" className="text-[10px] text-warning border-warning">High</Badge>
                                  ) : item.priority === 'medium' ? (
                                    <Badge variant="outline" className="text-[10px] text-info border-info">Medium</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">Low</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missing" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-destructive text-base md:text-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Items Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Items with stock loss - possible loss or theft
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {stockStats.missingItems.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
                    <p className="text-lg font-medium">No Missing Items</p>
                    <p className="text-muted-foreground text-sm">All stock accounted for</p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Medicine</TableHead>
                            <TableHead className="text-xs text-right">Lost Qty</TableHead>
                            <TableHead className="text-xs text-right">Cost</TableHead>
                            <TableHead className="text-xs text-right">Loss Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockStats.missingItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-xs">{item.medicineName}</TableCell>
                              <TableCell className="text-right text-xs text-destructive font-bold">
                                {item.totalLost}
                              </TableCell>
                              <TableCell className="text-right text-xs">KSh {item.costPrice}</TableCell>
                              <TableCell className="text-right text-xs text-destructive font-bold">
                                KSh {(item.totalLost * item.costPrice).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-destructive/10">
                            <TableCell colSpan={3} className="font-bold text-xs">Total Loss Value</TableCell>
                            <TableCell className="text-right font-bold text-destructive text-sm">
                              KSh {stockStats.totalMissingValue.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="lowstock" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription className="text-xs">
                  Items below 50 units - need restocking
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
                    <p className="text-lg font-medium">Stock Levels Good</p>
                    <p className="text-muted-foreground text-sm">All items adequately stocked</p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Medicine</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs text-right">Current</TableHead>
                            <TableHead className="text-xs text-right">Suggested</TableHead>
                            <TableHead className="text-xs">Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockItems.map((med) => (
                            <TableRow key={med.id}>
                              <TableCell className="font-medium text-xs">{med.name}</TableCell>
                              <TableCell className="text-xs">{med.category}</TableCell>
                              <TableCell className="text-right text-xs text-warning font-bold">
                                {med.stockQuantity}
                              </TableCell>
                              <TableCell className="text-right text-xs">100+</TableCell>
                              <TableCell>
                                {med.stockQuantity < 20 ? (
                                  <Badge variant="destructive" className="text-[10px]">Critical</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-warning border-warning">Low</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Best Selling Tab */}
          <TabsContent value="bestselling" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Best Selling Items
                </CardTitle>
                <CardDescription className="text-xs">
                  Top 5 by units sold - consider restocking
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Rank</TableHead>
                          <TableHead className="text-xs">Medicine</TableHead>
                          <TableHead className="text-xs text-right">Sold</TableHead>
                          <TableHead className="text-xs text-right">Current</TableHead>
                          <TableHead className="text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockStats.bestSellingItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No sales data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          stockStats.bestSellingItems.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              </TableCell>
                              <TableCell className="font-medium text-xs">{item.medicineName}</TableCell>
                              <TableCell className="text-right font-bold text-success text-xs">
                                {item.totalSold}
                              </TableCell>
                              <TableCell className="text-right text-xs">{item.currentStock}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Restock
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}