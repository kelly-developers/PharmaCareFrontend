import { api, ApiResponse } from './api';

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

interface CashFlowData {
  period: string;
  startDate: string;
  endDate: string;
  operatingActivities: {
    salesCashInflow: number;
    inventoryPurchases: number;
    operatingExpenses: number;
    netOperatingCashFlow: number;
  };
  investingActivities: {
    equipmentPurchases: number;
    assetSales: number;
    netInvestingCashFlow: number;
  };
  financingActivities: {
    loansReceived: number;
    loanRepayments: number;
    netFinancingCashFlow: number;
  };
  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
}

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  inventoryValue: number;
  totalStockItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  todayExpenses: number;
  pendingOrders: number;
  pendingPrescriptions: number;
}

interface InventoryValueData {
  totalValue: number;
  categoryValues: Record<string, number>;
  itemCount: number;
  calculatedAt: string;
}

interface SalesTrendData {
  date: string;
  sales: number;
  cost: number;
  profit: number;
}

interface CategorySalesData {
  category: string;
  sales: number;
  percentage: number;
}

export const reportService = {
  // Get dashboard statistics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get<DashboardStats>('/reports/dashboard');
  },

  // Get inventory value from backend
  async getInventoryValue(): Promise<ApiResponse<InventoryValueData>> {
    return api.get<InventoryValueData>('/reports/inventory-value');
  },

  // Get income statement
  async getIncomeStatement(startDate: string, endDate: string): Promise<ApiResponse<IncomeStatementData>> {
    return api.get<IncomeStatementData>(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get balance sheet
  async getBalanceSheet(asOfDate: string): Promise<ApiResponse<BalanceSheetData>> {
    return api.get<BalanceSheetData>(`/reports/balance-sheet?asOfDate=${asOfDate}`);
  },

  // Get cash flow statement
  async getCashFlowStatement(startDate: string, endDate: string): Promise<ApiResponse<CashFlowData>> {
    return api.get<CashFlowData>(`/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get sales trend
  async getSalesTrend(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ApiResponse<SalesTrendData[]>> {
    return api.get<SalesTrendData[]>(`/reports/sales-trend?period=${period}`);
  },

  // Get sales by category
  async getSalesByCategory(startDate: string, endDate: string): Promise<ApiResponse<CategorySalesData[]>> {
    return api.get<CategorySalesData[]>(`/reports/sales-by-category?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get stock audit report
  async getStockAuditReport(): Promise<ApiResponse<{
    medicineId: string;
    medicineName: string;
    totalSold: number;
    totalLost: number;
    totalAdjusted: number;
    currentStock: number;
  }[]>> {
    return api.get('/reports/stock-audit');
  },

  // Get cashier performance report
  async getCashierReport(startDate: string, endDate: string): Promise<ApiResponse<{
    cashierId: string;
    cashierName: string;
    totalSales: number;
    transactionCount: number;
    avgTransactionValue: number;
  }[]>> {
    return api.get(`/reports/cashier-performance?startDate=${startDate}&endDate=${endDate}`);
  },

  // Export report as PDF (returns PDF URL)
  async exportPDF(reportType: 'income' | 'balance' | 'cashflow', params: Record<string, string>): Promise<ApiResponse<{ url: string }>> {
    const queryParams = new URLSearchParams(params);
    return api.get(`/reports/export/${reportType}?${queryParams.toString()}`);
  },
};