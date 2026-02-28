import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/contexts/AuthContext';
import { getTerminology } from '@/types/business';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, Package, AlertTriangle, BarChart3, 
  ShoppingCart, DollarSign, RefreshCw, Archive, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#d946ef', '#0891b2', '#dc2626', '#ca8a04', '#059669', '#7c3aed'];

interface AnalysisItem {
  rank: number;
  medicineId: string;
  name: string;
  category: string;
  totalSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  revenueShare: number;
  profitShare: number;
  transactionCount: number;
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  monthlyRate: number;
  recommendedStock: number;
  stockDeficit: number;
  monthsOfStock: number;
  stockAdvice: string;
}

interface DeadStockItem {
  medicineId: string;
  name: string;
  category: string;
  currentStock: number;
  tiedUpCapital: number;
  advice: string;
}

interface CategoryAnalysis {
  category: string;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  itemCount: number;
}

export default function StockAnalysis() {
  const { businessType } = useAuth();
  const terms = getTerminology(businessType);
  const [months, setMonths] = useState('1');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await reportService.getStockAnalysis(parseInt(months));
      if (response.data) {
        setData(response.data);
      }
    } catch (error) {
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, [months]);

  const formatCurrency = (val: number) => `KSh ${val.toLocaleString()}`;

  const getStockBadge = (advice: string) => {
    if (advice.startsWith('OUT OF STOCK')) return <Badge variant="destructive">Out of Stock</Badge>;
    if (advice.startsWith('CRITICAL')) return <Badge variant="destructive">Critical</Badge>;
    if (advice.startsWith('LOW')) return <Badge className="bg-orange-500 text-white">Low</Badge>;
    if (advice.startsWith('OVERSTOCKED')) return <Badge className="bg-blue-500 text-white">Overstocked</Badge>;
    return <Badge className="bg-green-600 text-white">OK</Badge>;
  };

  const topSellers: AnalysisItem[] = data?.topSellers || [];
  const bottomSellers: AnalysisItem[] = data?.bottomSellers || [];
  const restockNeeded: AnalysisItem[] = data?.restockNeeded || [];
  const deadStock: DeadStockItem[] = data?.deadStock || [];
  const categoryAnalysis: CategoryAnalysis[] = data?.categoryAnalysis || [];
  const summary = data?.summary || {};

  const topChartData = topSellers.slice(0, 10).map(i => ({
    name: i.name.length > 20 ? i.name.substring(0, 20) + '...' : i.name,
    sold: i.totalSold,
    profit: i.totalProfit,
    revenue: i.totalRevenue,
  }));

  const categoryChartData = categoryAnalysis.slice(0, 8).map((c, i) => ({
    name: c.category,
    value: c.totalRevenue,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stock Analysis & Intelligence</h1>
            <p className="text-muted-foreground">Identify top sellers, profit drivers, and restocking needs</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 1 Month</SelectItem>
                <SelectItem value="2">Last 2 Months</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAnalysis} disabled={loading} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><ShoppingCart className="h-4 w-4" /> Units Sold</div>
              <p className="text-2xl font-bold mt-1">{(summary.totalItemsSold || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> Revenue</div>
              <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalRevenue || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Profit</div>
              <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(summary.totalProfit || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="h-4 w-4" /> Need Restock</div>
              <p className="text-2xl font-bold mt-1 text-orange-600">{summary.itemsNeedingRestock || 0}</p>
              <p className="text-xs text-muted-foreground">{summary.deadStockItems || 0} dead stock items</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 10 by Units Sold</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="top-sellers">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="top-sellers"><ArrowUpRight className="h-4 w-4 mr-1" /> Top Sellers</TabsTrigger>
            <TabsTrigger value="bottom-sellers"><ArrowDownRight className="h-4 w-4 mr-1" /> Lowest Sellers</TabsTrigger>
            <TabsTrigger value="restock"><AlertTriangle className="h-4 w-4 mr-1" /> Restock Advice</TabsTrigger>
            <TabsTrigger value="dead-stock"><Archive className="h-4 w-4 mr-1" /> Dead Stock</TabsTrigger>
            <TabsTrigger value="categories"><BarChart3 className="h-4 w-4 mr-1" /> Categories</TabsTrigger>
          </TabsList>

          {/* Top Sellers */}
          <TabsContent value="top-sellers">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling {terms.items}</CardTitle>
                <CardDescription>Ranked by quantity sold in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Revenue %</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSellers.map(item => (
                        <TableRow key={item.medicineId}>
                          <TableCell className="font-bold">{item.rank}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.name}</TableCell>
                          <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{item.totalSold.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(item.totalProfit)}</TableCell>
                          <TableCell className="text-right">{item.profitMargin.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{item.revenueShare.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{item.currentStock}</TableCell>
                          <TableCell>{getStockBadge(item.stockAdvice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bottom Sellers */}
          <TabsContent value="bottom-sellers">
            <Card>
              <CardHeader>
                <CardTitle>Lowest Selling {terms.items}</CardTitle>
                <CardDescription>Items with the fewest sales — consider reducing stock or running promotions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead>Advice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bottomSellers.map(item => (
                        <TableRow key={item.medicineId}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                          <TableCell className="text-right">{item.totalSold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalProfit)}</TableCell>
                          <TableCell className="text-right">{item.currentStock}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[250px]">{item.stockAdvice}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restock Advice */}
          <TabsContent value="restock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Restocking Recommendations
                </CardTitle>
                <CardDescription>Based on {months}-month sales rate with 20% safety buffer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Monthly Rate</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Recommended</TableHead>
                        <TableHead className="text-right">Order Qty</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                        <TableHead className="text-right">Days Left</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restockNeeded.map(item => (
                        <TableRow key={item.medicineId}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.monthlyRate}/mo</TableCell>
                          <TableCell className="text-right">{item.currentStock}</TableCell>
                          <TableCell className="text-right font-semibold">{item.recommendedStock}</TableCell>
                          <TableCell className="text-right text-orange-600 font-bold">{item.stockDeficit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.stockDeficit * item.costPrice)}</TableCell>
                          <TableCell className="text-right">{Math.round(item.monthsOfStock * 30)}</TableCell>
                          <TableCell>{getStockBadge(item.stockAdvice)}</TableCell>
                        </TableRow>
                      ))}
                      {restockNeeded.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">All items are well stocked! 🎉</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {restockNeeded.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-muted">
                    <p className="font-semibold">Total Restock Investment Needed:</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(restockNeeded.reduce((s, i) => s + (i.stockDeficit * i.costPrice), 0))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dead Stock */}
          <TabsContent value="dead-stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  Dead Stock ({deadStock.length} items)
                </CardTitle>
                <CardDescription>Items with no sales in the analyzed period — capital is tied up</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Tied Up Capital</TableHead>
                        <TableHead>Advice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deadStock.map(item => (
                        <TableRow key={item.medicineId}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                          <TableCell className="text-right">{item.currentStock}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">{formatCurrency(item.tiedUpCapital)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px]">{item.advice}</TableCell>
                        </TableRow>
                      ))}
                      {deadStock.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No dead stock found!</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {deadStock.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10">
                    <p className="font-semibold text-destructive">Total Capital Tied in Dead Stock:</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(deadStock.reduce((s, i) => s + i.tiedUpCapital, 0))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryAnalysis.map(cat => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right">{cat.itemCount}</TableCell>
                          <TableCell className="text-right">{cat.totalSold.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cat.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(cat.totalProfit)}</TableCell>
                          <TableCell className="text-right">{cat.totalRevenue > 0 ? ((cat.totalProfit / cat.totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}