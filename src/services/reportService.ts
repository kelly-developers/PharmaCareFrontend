import { api, ApiResponse } from './api';

// Define interfaces based on your actual data structure
interface SaleTransaction {
  id: string;
  cashier_id: string;
  cashier_name: string;
  total_amount: string;
  discount: string;
  final_amount: string;
  profit: number;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  created_at: string;
  cost_of_goods_sold: number | null;
  tax: number | null;
  items: Array<{
    id: string;
    medicine_id: string;
    medicine_name: string;
    quantity: number;
    unit_type: string;
    unit_label: string;
    unit_price: number;
    cost_price: number;
    subtotal: number;
    profit: number;
  }>;
}

interface SalesResponse {
  content: SaleTransaction[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

interface InventoryValueData {
  costValue: number;
  retailValue: number;
  totalUnits: number;
  potentialProfit: number;
}

interface MonthlyStockMovement {
  year: number;
  month: number;
  totalAdditions: number;
  totalSales: number;
  netChange: number;
}

interface AnnualSummary {
  year: number;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  monthlyBreakdown: Array<{
    month: number;
    revenue: number;
    profit: number;
    transactions: number;
  }>;
}

interface IncomeStatementData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    grossSales: number;
    discounts: number;
    netSales: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: {
    breakdown: Array<{ category: string; amount: number }>;
    total: number;
  };
  netIncome: number;
}

export const reportService = {
  // Get sales transactions
  async getSalesTransactions(startDate?: string, endDate?: string): Promise<ApiResponse<SalesResponse>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    
    const response = await api.get<SalesResponse>(`/sales${query ? `?${query}` : ''}`);
    
    // Handle response structure
    if (response.data && typeof response.data === 'object' && 'content' in response.data) {
      return response;
    }
    
    // If response is nested under data property
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get sales summary (alias for getSalesTransactions)
  async getSalesSummary(startDate?: string, endDate?: string): Promise<ApiResponse<SalesResponse>> {
    return this.getSalesTransactions(startDate, endDate);
  },

  // Get inventory value
  async getInventoryValue(): Promise<ApiResponse<InventoryValueData>> {
    const response = await api.get<InventoryValueData>('/inventory/value');
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get monthly stock movement
  async getMonthlyBreakdown(): Promise<ApiResponse<MonthlyStockMovement>> {
    const response = await api.get<MonthlyStockMovement>('/stock/monthly-movement');
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get income statement
  async getIncomeStatement(startDate: string, endDate: string): Promise<ApiResponse<IncomeStatementData>> {
    const response = await api.get<IncomeStatementData>(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get annual summary
  async getAnnualSummary(year?: number): Promise<ApiResponse<AnnualSummary>> {
    const query = year ? `?year=${year}` : '';
    const response = await api.get<AnnualSummary>(`/reports/annual-summary${query}`);
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get sales trend (for charts)
  async getSalesTrend(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ApiResponse<any>> {
    const response = await api.get(`/reports/sales-trend?period=${period}`);
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Get sales by category
  async getSalesByCategory(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    const response = await api.get(`/reports/sales-by-category?startDate=${startDate}&endDate=${endDate}`);
    
    if (response.data && response.data.data) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  },

  // Dashboard Summary
  async getDashboardStats(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/dashboard');
  },

  // Other methods for backward compatibility
  async getStockSummary(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/stock-summary');
  },

  async getBalanceSheet(asOfDate?: string): Promise<ApiResponse<any>> {
    const query = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return api.get<any>(`/reports/balance-sheet${query}`);
  },

  async getStockBreakdown(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/stock-breakdown');
  },

  async getInventoryBreakdown(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/inventory-breakdown');
  },

  async getMedicineValues(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/medicine-values');
  },

  async getMonthlyProfit(yearMonth: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/reports/profit/monthly/${yearMonth}`);
  },

  async getDailyProfit(date?: string): Promise<ApiResponse<any>> {
    const query = date ? `?date=${date}` : '';
    return api.get<any>(`/reports/profit/daily${query}`);
  },

  async getProfitRange(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/reports/profit/range?startDate=${startDate}&endDate=${endDate}`);
  },

  async getProfitSummary(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/profit/summary');
  },

  async getCashFlowStatement(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`);
  },

  async getStockAuditReport(): Promise<ApiResponse<any>> {
    return api.get<any>('/reports/stock-audit');
  },

  async getCashierReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/reports/cashier-performance?startDate=${startDate}&endDate=${endDate}`);
  },

  async exportPDF(reportType: 'income' | 'balance' | 'cashflow', params: Record<string, string>): Promise<ApiResponse<{ url: string }>> {
    const queryParams = new URLSearchParams(params);
    return api.get<{ url: string }>(`/reports/export/${reportType}?${queryParams.toString()}`);
  },

  async getSellerPayments(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return api.get<any>(`/reports/seller-payments${query ? `?${query}` : ''}`);
  },
};