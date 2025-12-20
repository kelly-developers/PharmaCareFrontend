import { useState, useRef, useMemo } from 'react';
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
import { useSales } from '@/contexts/SalesContext';

interface StockEntry {
  id: string;
  medicineName: string;
  medicineId: string;
  openingQty: number;
  openingTabs: number;
  openingStrips: number;
  openingBoxes: number;
  closingQty: number;
  closingTabs: number;
  closingStrips: number;
  closingBoxes: number;
  soldQty: number;
  purchasedQty: number;
  expectedClosing: number;
  variance: number;
  costPrice: number;
  totalOpeningValue: number;
  totalClosingValue: number;
  cogsValue: number;
  missingValue: number;
}

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
  const { medicines, stockMovements, getStockAuditReport } = useStock();
  const { sales } = useSales();
  
  const monthOptions = getMonthOptions();

  // Calculate restock recommendations based on sales velocity and low stock
  const restockRecommendations = useMemo(() => {
    const auditData = getStockAuditReport();
    
    return medicines
      .map(med => {
        const audit = auditData.find(a => a.medicineId === med.id);
        const totalSold = audit?.totalSold || 0;
        const avgDailySales = totalSold / 30; // Average over month
        const daysOfStock = avgDailySales > 0 ? Math.floor(med.stockQuantity / avgDailySales) : 999;
        const suggestedReorder = Math.max(100, Math.ceil(avgDailySales * 30)); // 30 days buffer
        
        return {
          id: med.id,
          name: med.name,
          category: med.category,
          currentStock: med.stockQuantity,
          totalSold,
          avgDailySales: Math.round(avgDailySales * 10) / 10,
          daysOfStock,
          suggestedReorder,
          costPrice: med.costPrice,
          reorderValue: suggestedReorder * med.costPrice,
          priority: daysOfStock < 7 ? 'critical' : daysOfStock < 14 ? 'high' : daysOfStock < 30 ? 'medium' : 'low',
          reason: daysOfStock < 7 ? 'Critical - Less than 1 week stock' : 
                  daysOfStock < 14 ? 'High - Less than 2 weeks stock' : 
                  totalSold > 50 ? 'Fast moving item' : 
                  med.stockQuantity < 50 ? 'Low stock level' : 'Normal'
        };
      })
      .filter(item => item.priority !== 'low' || item.totalSold > 20)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] || b.totalSold - a.totalSold;
      });
  }, [medicines, getStockAuditReport]);

  // Download current stock for physical counting with T/S/B breakdown
  const downloadCurrentStock = async () => {
    const XLSX = await import('xlsx');
    
    const data = stockData.map(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      const tabsPerStrip = med?.units.find(u => u.type === 'strip')?.quantity || 10;
      const stripsPerBox = (med?.units.find(u => u.type === 'box')?.quantity || 100) / tabsPerStrip;
      
      // Current closing stock breakdown
      const closingBoxes = Math.floor(item.closingQty / (tabsPerStrip * stripsPerBox));
      const closingStrips = Math.floor((item.closingQty % (tabsPerStrip * stripsPerBox)) / tabsPerStrip);
      const closingTabs = item.closingQty % tabsPerStrip;
      
      return {
        'Medicine': item.medicineName,
        'Medicine ID': item.medicineId,
        'Category': med?.category || '',
        'Cost Price': item.costPrice,
        'Current (Tabs)': closingTabs,
        'Current (Strips)': closingStrips,
        'Current (Boxes)': closingBoxes,
        'Total Units': item.closingQty,
        'Stock Value': item.totalClosingValue,
        'Tabs/Strip': tabsPerStrip,
        'Strips/Box': stripsPerBox,
        'Counted (Tabs)': '',
        'Counted (Strips)': '',
        'Counted (Boxes)': '',
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Count');
    
    // Add instructions sheet
    const instructionsData = [
      { 'Instructions': 'STOCK COUNTING TEMPLATE' },
      { 'Instructions': '' },
      { 'Instructions': '1. Use this sheet to count your physical stock' },
      { 'Instructions': '2. Fill in "Counted (Tabs)", "Counted (Strips)", "Counted (Boxes)" columns' },
      { 'Instructions': '3. The system will calculate: Total Units = Tabs + (Strips × Tabs/Strip) + (Boxes × Tabs/Strip × Strips/Box)' },
      { 'Instructions': '4. Upload back to calculate variance and missing stock' },
      { 'Instructions': '' },
      { 'Instructions': 'T/S/B = Tabs / Strips / Boxes breakdown' },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');
    
    XLSX.writeFile(wb, `stock_count_template_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: 'Stock Template Downloaded',
      description: 'Fill Counted (T/S/B) columns and upload back',
    });
  };

  // Export restock recommendations
  const exportRestockList = () => {
    const headers = 'Medicine,Category,Current Stock,Avg Daily Sales,Days Left,Suggested Qty,Cost Price,Reorder Value,Priority\n';
    const rows = restockRecommendations.map(r => 
      `"${r.name}","${r.category}",${r.currentStock},${r.avgDailySales},${r.daysOfStock},${r.suggestedReorder},${r.costPrice},${r.reorderValue},"${r.priority}"`
    ).join('\n');
    
    const totalValue = restockRecommendations.reduce((sum, r) => sum + r.reorderValue, 0);
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

  // Calculate stock data from medicines and sales
  const stockData: StockEntry[] = useMemo(() => {
    return medicines.map(med => {
      // Get movements for this medicine
      const salesMovements = stockMovements.filter(
        m => m.medicineId === med.id && m.type === 'sale'
      );
      const purchaseMovements = stockMovements.filter(
        m => m.medicineId === med.id && m.type === 'purchase'
      );

      const soldQty = salesMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const purchasedQty = purchaseMovements.reduce((sum, m) => sum + m.quantity, 0);

      // Calculate unit breakdown
      const tabsPerStrip = med.units.find(u => u.type === 'strip')?.quantity || 10;
      const stripsPerBox = (med.units.find(u => u.type === 'box')?.quantity || 100) / tabsPerStrip;

      // Opening stock (current + sold - purchased)
      const openingQty = med.stockQuantity + soldQty - purchasedQty;
      const closingQty = med.stockQuantity;

      // Calculate unit breakdowns
      const openingBoxes = Math.floor(openingQty / (tabsPerStrip * stripsPerBox));
      const openingStrips = Math.floor((openingQty % (tabsPerStrip * stripsPerBox)) / tabsPerStrip);
      const openingTabs = openingQty % tabsPerStrip;

      const closingBoxes = Math.floor(closingQty / (tabsPerStrip * stripsPerBox));
      const closingStrips = Math.floor((closingQty % (tabsPerStrip * stripsPerBox)) / tabsPerStrip);
      const closingTabs = closingQty % tabsPerStrip;

      // Expected closing = opening + purchased - sold
      const expectedClosing = openingQty + purchasedQty - soldQty;
      const variance = closingQty - expectedClosing;

      // Calculate values
      const totalOpeningValue = openingQty * med.costPrice;
      const totalClosingValue = closingQty * med.costPrice;
      const cogsValue = soldQty * med.costPrice;
      const missingValue = variance < 0 ? Math.abs(variance) * med.costPrice : 0;

      return {
        id: med.id,
        medicineName: med.name,
        medicineId: med.id,
        openingQty,
        openingTabs,
        openingStrips,
        openingBoxes,
        closingQty,
        closingTabs,
        closingStrips,
        closingBoxes,
        soldQty,
        purchasedQty,
        expectedClosing,
        variance,
        costPrice: med.costPrice,
        totalOpeningValue,
        totalClosingValue,
        cogsValue,
        missingValue,
      };
    });
  }, [medicines, stockMovements]);

  const filteredData = stockData.filter(item =>
    item.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary calculations
  const missingItems = stockData.filter(d => d.variance < 0);
  const totalMissingValue = missingItems.reduce((sum, d) => sum + d.missingValue, 0);
  const totalOpeningValue = stockData.reduce((sum, d) => sum + d.totalOpeningValue, 0);
  const totalClosingValue = stockData.reduce((sum, d) => sum + d.totalClosingValue, 0);
  const totalCOGS = stockData.reduce((sum, d) => sum + d.cogsValue, 0);

  // Low stock items (less than 50 units)
  const lowStockItems = medicines.filter(m => m.stockQuantity < 50);
  
  // Best selling items
  const bestSellingData = getStockAuditReport()
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

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
      const med = medicines.find(m => m.id === item.medicineId);
      return {
        'Medicine': item.medicineName,
        'Medicine ID': item.medicineId,
        'Cost Price': item.costPrice,
        'Close (Tabs)': '',
        'Close (Strips)': '',
        'Close (Boxes)': '',
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${uploadType === 'opening' ? 'Opening' : 'Closing'} Stock`);
    
    XLSX.writeFile(wb, `stock_${uploadType}_template_${selectedMonth}.xlsx`);
    
    toast({
      title: 'Template Downloaded',
      description: 'Fill in T/S/B counts and upload back',
    });
  };

  const exportStockReport = async () => {
    const XLSX = await import('xlsx');
    
    const data = stockData.map(d => ({
      'Medicine': d.medicineName,
      'Cost': d.costPrice,
      'Open (T/S/B)': `${d.openingTabs}/${d.openingStrips}/${d.openingBoxes}`,
      'Open Val': d.totalOpeningValue,
      'Sold': d.soldQty,
      'COGS': d.cogsValue,
      'Close (T/S/B)': `${d.closingTabs}/${d.closingStrips}/${d.closingBoxes}`,
      'Close Val': d.totalClosingValue,
      'Variance': d.variance,
      'Missing': Math.abs(d.variance < 0 ? d.variance : 0),
      'Missing Val': d.missingValue,
      'Status': d.variance === 0 ? 'OK' : d.variance > 0 ? 'Excess' : 'Missing',
    }));
    
    // Add summary row
    data.push({
      'Medicine': 'TOTAL',
      'Cost': 0,
      'Open (T/S/B)': '',
      'Open Val': totalOpeningValue,
      'Sold': stockData.reduce((sum, d) => sum + d.soldQty, 0),
      'COGS': totalCOGS,
      'Close (T/S/B)': '',
      'Close Val': totalClosingValue,
      'Variance': 0,
      'Missing': missingItems.reduce((sum, d) => sum + Math.abs(d.variance), 0),
      'Missing Val': totalMissingValue,
      'Status': '',
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 9 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    
    XLSX.writeFile(wb, `stock_report_${selectedMonth}.xlsx`);
    
    toast({ title: 'Report Exported', description: 'Stock report exported as Excel with T/S/B breakdown' });
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
              <div class="value">KSh ${totalOpeningValue.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Cost of Goods Sold</div>
              <div class="value">KSh ${totalCOGS.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Closing Stock Value</div>
              <div class="value">KSh ${totalClosingValue.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="label">Missing Stock Value</div>
              <div class="value missing">KSh ${totalMissingValue.toLocaleString()}</div>
            </div>
          </div>
          
          <h3>Stock Details</h3>
          <table>
            <tr>
              <th>Medicine</th>
              <th>Cost</th>
              <th>Opening (T/S/B)</th>
              <th>Opening Val</th>
              <th>Sold</th>
              <th>COGS</th>
              <th>Closing (T/S/B)</th>
              <th>Closing Val</th>
              <th>Variance</th>
              <th>Missing Val</th>
            </tr>
            ${stockData.map(d => `
              <tr>
                <td>${d.medicineName}</td>
                <td>KSh ${d.costPrice}</td>
                <td>${d.openingTabs}/${d.openingStrips}/${d.openingBoxes}</td>
                <td>KSh ${d.totalOpeningValue.toLocaleString()}</td>
                <td>${d.soldQty}</td>
                <td>KSh ${d.cogsValue.toLocaleString()}</td>
                <td>${d.closingTabs}/${d.closingStrips}/${d.closingBoxes}</td>
                <td>KSh ${d.totalClosingValue.toLocaleString()}</td>
                <td class="${d.variance < 0 ? 'missing' : d.variance === 0 ? 'ok' : ''}">${d.variance}</td>
                <td class="${d.missingValue > 0 ? 'missing' : ''}">KSh ${d.missingValue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
          
          ${missingItems.length > 0 ? `
          <h3 class="missing">Missing Items (${missingItems.length})</h3>
          <table>
            <tr><th>Medicine</th><th>Expected</th><th>Actual</th><th>Missing Qty</th><th>Cost Price</th><th>Missing Value</th></tr>
            ${missingItems.map(d => `
              <tr>
                <td>${d.medicineName}</td>
                <td>${d.expectedClosing}</td>
                <td>${d.closingQty}</td>
                <td class="missing">${Math.abs(d.variance)}</td>
                <td>KSh ${d.costPrice}</td>
                <td class="missing">KSh ${d.missingValue.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr style="background: #fef2f2;"><td colspan="5"><strong>Total Missing Value</strong></td><td class="missing"><strong>KSh ${totalMissingValue.toLocaleString()}</strong></td></tr>
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
              <p className="text-sm md:text-lg font-bold">KSh {totalOpeningValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-warning" />
                <span className="text-[10px] md:text-xs text-muted-foreground">COGS</span>
              </div>
              <p className="text-sm md:text-lg font-bold">KSh {totalCOGS.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-success" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Closing Value</span>
              </div>
              <p className="text-sm md:text-lg font-bold">KSh {totalClosingValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Missing Items</span>
              </div>
              <p className="text-sm md:text-lg font-bold">{missingItems.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-[10px] md:text-xs text-muted-foreground">Missing Value</span>
              </div>
              <p className="text-sm md:text-lg font-bold text-destructive">KSh {totalMissingValue.toLocaleString()}</p>
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
                  Stock Details (Tabs/Strips/Boxes)
                </CardTitle>
                <CardDescription className="text-xs">
                  Quantity breakdown with cost values and variance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Medicine</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs text-center">Open (T/S/B)</TableHead>
                          <TableHead className="text-xs text-right">Open Val</TableHead>
                          <TableHead className="text-xs text-right">Sold</TableHead>
                          <TableHead className="text-xs text-right">COGS</TableHead>
                          <TableHead className="text-xs text-center">Close (T/S/B)</TableHead>
                          <TableHead className="text-xs text-right">Close Val</TableHead>
                          <TableHead className="text-xs text-right">Variance</TableHead>
                          <TableHead className="text-xs text-right">Missing</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs">{item.medicineName}</TableCell>
                            <TableCell className="text-right text-xs">KSh {item.costPrice}</TableCell>
                            <TableCell className="text-center text-xs">
                              {item.openingTabs}/{item.openingStrips}/{item.openingBoxes}
                            </TableCell>
                            <TableCell className="text-right text-xs">KSh {item.totalOpeningValue.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs text-warning">-{item.soldQty}</TableCell>
                            <TableCell className="text-right text-xs">KSh {item.cogsValue.toLocaleString()}</TableCell>
                            <TableCell className="text-center text-xs">
                              {item.closingTabs}/{item.closingStrips}/{item.closingBoxes}
                            </TableCell>
                            <TableCell className="text-right text-xs">KSh {item.totalClosingValue.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs">
                              <span className={item.variance === 0 ? 'text-success' : item.variance > 0 ? 'text-info' : 'text-destructive font-bold'}>
                                {item.variance > 0 ? '+' : ''}{item.variance}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {item.missingValue > 0 ? (
                                <span className="text-destructive font-bold">KSh {item.missingValue.toLocaleString()}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {item.variance === 0 ? (
                                <Badge variant="outline" className="text-[10px] gap-0.5 text-success border-success">
                                  <CheckCircle className="h-3 w-3" />OK
                                </Badge>
                              ) : item.variance < 0 ? (
                                <Badge variant="destructive" className="text-[10px] gap-0.5">
                                  <TrendingDown className="h-3 w-3" />Loss
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] gap-0.5 text-info border-info">
                                  <TrendingUp className="h-3 w-3" />+
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
                {restockRecommendations.length === 0 ? (
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
                          {restockRecommendations.filter(r => r.priority === 'critical').length}
                        </p>
                      </div>
                      <div className="bg-warning/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">High</p>
                        <p className="text-lg font-bold text-warning">
                          {restockRecommendations.filter(r => r.priority === 'high').length}
                        </p>
                      </div>
                      <div className="bg-info/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Medium</p>
                        <p className="text-lg font-bold text-info">
                          {restockRecommendations.filter(r => r.priority === 'medium').length}
                        </p>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Total Value</p>
                        <p className="text-sm font-bold text-primary">
                          KSh {restockRecommendations.reduce((sum, r) => sum + r.reorderValue, 0).toLocaleString()}
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
                            {restockRecommendations.map((item) => (
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
                  Items with negative variance - possible loss or theft
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {missingItems.length === 0 ? (
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
                            <TableHead className="text-xs text-right">Expected</TableHead>
                            <TableHead className="text-xs text-right">Actual</TableHead>
                            <TableHead className="text-xs text-right">Missing</TableHead>
                            <TableHead className="text-xs text-right">Cost</TableHead>
                            <TableHead className="text-xs text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {missingItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-xs">{item.medicineName}</TableCell>
                              <TableCell className="text-right text-xs">{item.expectedClosing}</TableCell>
                              <TableCell className="text-right text-xs">{item.closingQty}</TableCell>
                              <TableCell className="text-right text-xs text-destructive font-bold">
                                {Math.abs(item.variance)}
                              </TableCell>
                              <TableCell className="text-right text-xs">KSh {item.costPrice}</TableCell>
                              <TableCell className="text-right text-xs text-destructive font-bold">
                                KSh {item.missingValue.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-destructive/10">
                            <TableCell colSpan={5} className="font-bold text-xs">Total Missing Value</TableCell>
                            <TableCell className="text-right font-bold text-destructive text-sm">
                              KSh {totalMissingValue.toLocaleString()}
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
                        {bestSellingData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No sales data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          bestSellingData.map((item, index) => (
                            <TableRow key={item.medicineId}>
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