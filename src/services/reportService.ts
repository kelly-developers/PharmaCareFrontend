import { api, ApiResponse } from './api';

// Dashboard Summary - UPDATED with monthly profit fields
interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  thisMonthProfit: number;
  lastMonthProfit: number;
  inventoryValue: number;
  stockValue: number; // selling price value
  totalStockItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiringCount?: number; // For backward compatibility
  todayExpenses: number;
  pendingOrders: number;
  pendingExpenses: number;
  pendingPrescriptions: number;
}

// Sales Summary
interface SalesSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  transactionCount: number;
  averageTransactionValue: number;
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  salesByCategory: { category: string; total: number }[];
}

// Stock Summary
interface StockSummary {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  categoryBreakdown: { category: string; count: number; value: number }[];
}

// Balance Sheet
interface BalanceSheetData {
  asOfDate: string;
  assets: {
    cashBalance: number;
    accountsReceivable: number;
    inventoryValue: number;
    totalCurrentAssets: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    totalCurrentLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

// Income Statement
interface IncomeStatementData {
  period: string;
  startDate: string;
  endDate: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  expenses: { category: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

// Inventory Value
interface InventoryValueData {
  totalValue: number;
  categoryValues: Record<string, number>;
  itemCount: number;
  calculatedAt: string;
}

// Stock Breakdown
interface StockBreakdown {
  medicineId: string;
  medicineName: string;
  category: string;
  boxes: number;
  strips: number;
  tablets: number;
  totalTablets: number;
  costPrice: number;
  sellingPrice: number;
  value: number;
}

// Medicine Values
interface MedicineValue {
  medicineId: string;
  medicineName: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalCostValue: number;
  totalSellingValue: number;
}

// Profit Reports
interface MonthlyProfitReport {
  yearMonth: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  dailyBreakdown: { date: string; revenue: number; cost: number; profit: number }[];
}

interface DailyProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  transactionCount: number;
}

interface ProfitRangeResult {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

interface ProfitSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  avgDailyProfit: number;
  avgMonthlyProfit: number;
}

export const reportService = {
  // Dashboard Summary
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get<DashboardStats>('/reports/dashboard');
  },

  // Sales Summary
  async getSalesSummary(startDate?: string, endDate?: string): Promise<ApiResponse<SalesSummary>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return api.get<SalesSummary>(`/reports/sales-summary${query ? `?${query}` : ''}`);
  },

  // Stock Summary
  async getStockSummary(): Promise<ApiResponse<StockSummary>> {
    return api.get<StockSummary>('/reports/stock-summary');
  },

  // Balance Sheet
  async getBalanceSheet(asOfDate?: string): Promise<ApiResponse<BalanceSheetData>> {
    const query = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return api.get<BalanceSheetData>(`/reports/balance-sheet${query}`);
  },

  // Income Statement
  async getIncomeStatement(startDate: string, endDate: string): Promise<ApiResponse<IncomeStatementData>> {
    return api.get<IncomeStatementData>(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
  },

  // Inventory Value
  async getInventoryValue(): Promise<ApiResponse<InventoryValueData>> {
    return api.get<InventoryValueData>('/reports/inventory-value');
  },

  // Stock Breakdown
  async getStockBreakdown(): Promise<ApiResponse<StockBreakdown[]>> {
    return api.get<StockBreakdown[]>('/reports/stock-breakdown');
  },

  // Inventory Breakdown (detailed)
  async getInventoryBreakdown(): Promise<ApiResponse<any>> {
    return api.get('/reports/inventory-breakdown');
  },

  // Individual Medicine Values
  async getMedicineValues(): Promise<ApiResponse<MedicineValue[]>> {
    return api.get<MedicineValue[]>('/reports/medicine-values');
  },

  // Profit Reports
  async getMonthlyProfit(yearMonth: string): Promise<ApiResponse<MonthlyProfitReport>> {
    return api.get<MonthlyProfitReport>(`/reports/profit/monthly/${yearMonth}`);
  },

  async getDailyProfit(date?: string): Promise<ApiResponse<DailyProfit>> {
    const query = date ? `?date=${date}` : '';
    return api.get<DailyProfit>(`/reports/profit/daily${query}`);
  },

  async getProfitRange(startDate: string, endDate: string): Promise<ApiResponse<ProfitRangeResult>> {
    return api.get<ProfitRangeResult>(`/reports/profit/range?startDate=${startDate}&endDate=${endDate}`);
  },

  async getProfitSummary(): Promise<ApiResponse<ProfitSummary>> {
    return api.get<ProfitSummary>('/reports/profit/summary');
  },

  // Legacy methods for backward compatibility
  async getCashFlowStatement(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get(`/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`);
  },

  async getSalesTrend(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ApiResponse<any>> {
    return api.get(`/reports/sales-trend?period=${period}`);
  },

  async getSalesByCategory(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get(`/reports/sales-by-category?startDate=${startDate}&endDate=${endDate}`);
  },

  async getStockAuditReport(): Promise<ApiResponse<any>> {
    return api.get('/reports/stock-audit');
  },

  async getCashierReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get(`/reports/cashier-performance?startDate=${startDate}&endDate=${endDate}`);
  },

  async exportPDF(reportType: 'income' | 'balance' | 'cashflow', params: Record<string, string>): Promise<ApiResponse<{ url: string }>> {
    const queryParams = new URLSearchParams(params);
    return api.get(`/reports/export/${reportType}?${queryParams.toString()}`);
  },

  // Annual Summary for dashboard
  async getAnnualSummary(year?: number): Promise<ApiResponse<{
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    sellerPayments: number;
    monthlyData: { month: string; revenue: number; profit: number; orders: number }[];
  }>> {
    const query = year ? `?year=${year}` : '';
    return api.get(`/reports/annual-summary${query}`);
  },

  // Monthly breakdown for year
  async getMonthlyBreakdown(year?: number): Promise<ApiResponse<{
    month: string;
    revenue: number;
    profit: number;
    expenses: number;
    orders: number;
    sellerPayments: number;
  }[]>> {
    const query = year ? `?year=${year}` : '';
    return api.get(`/reports/monthly-breakdown${query}`);
  },

  // Seller payments report
  async getSellerPayments(startDate?: string, endDate?: string): Promise<ApiResponse<{
    sellerId: string;
    sellerName: string;
    totalSales: number;
    commission: number;
    paid: number;
    pending: number;
  }[]>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return api.get(`/reports/seller-payments${query ? `?${query}` : ''}`);
  },
};