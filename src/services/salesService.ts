import { api, ApiResponse } from './api';
import { Sale, SaleItem } from '@/types/pharmacy';

interface CreateSaleRequest {
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  cashierId: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
}

interface DailySalesReport {
  date: string;
  totalSales: number;
  totalCash: number;
  totalMpesa: number;
  totalCard: number;
  transactionCount: number;
  cashTransactions: number;
  mpesaTransactions: number;
  cardTransactions: number;
  sales: Sale[];
}

interface SalesFilters {
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  paymentMethod?: 'cash' | 'mpesa' | 'card';
  page?: number;
  limit?: number;
}

export const salesService = {
  // Get all sales with optional filters
  async getAll(filters?: SalesFilters): Promise<ApiResponse<Sale[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.cashierId) queryParams.append('cashierId', filters.cashierId);
    if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    
    const query = queryParams.toString();
    return api.get<Sale[]>(`/sales${query ? `?${query}` : ''}`);
  },

  // Get sale by ID
  async getById(id: string): Promise<ApiResponse<Sale>> {
    return api.get<Sale>(`/sales/${id}`);
  },

  // Create new sale
  async create(sale: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    return api.post<Sale>('/sales', sale);
  },

  // Get today's sales for a specific cashier - CRITICAL ENDPOINT
  async getCashierTodaySales(cashierId: string): Promise<ApiResponse<Sale[]>> {
    return api.get<Sale[]>(`/sales/cashier/${cashierId}/today`);
  },

  // Get today's sales summary for all cashiers
  async getTodaySalesSummary(cashierId?: string): Promise<ApiResponse<DailySalesReport>> {
    const url = cashierId ? `/sales/today?cashierId=${cashierId}` : '/sales/today';
    return api.get<DailySalesReport>(url);
  },

  // Get sales by cashier
  async getByCashier(cashierId: string): Promise<ApiResponse<Sale[]>> {
    return api.get<Sale[]>(`/sales/cashier/${cashierId}`);
  },

  // Get sales by date range
  async getByDateRange(startDate: string, endDate: string, cashierId?: string): Promise<ApiResponse<Sale[]>> {
    let url = `/sales?startDate=${startDate}&endDate=${endDate}`;
    if (cashierId) {
      url += `&cashierId=${cashierId}`;
    }
    return api.get<Sale[]>(url);
  },

  // Get daily sales report
  async getDailyReport(date: string): Promise<ApiResponse<DailySalesReport>> {
    return api.get<DailySalesReport>(`/sales/report?startDate=${date}&endDate=${date}&groupBy=day`);
  },

  // Get sales summary for period
  async getSummary(startDate: string, endDate: string): Promise<ApiResponse<{
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    transactionCount: number;
    salesByPaymentMethod: { method: string; total: number; count: number }[];
    salesByCategory: { category: string; total: number }[];
  }>> {
    return api.get(`/sales/report?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get cashier performance report
  async getCashierPerformance(cashierId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<ApiResponse<{
    cashierId: string;
    cashierName: string;
    period: string;
    totalSales: number;
    totalCash: number;
    totalMpesa: number;
    totalCard: number;
    transactionCount: number;
    sales: Sale[];
  }>> {
    // You might need to implement this endpoint on backend
    return api.get(`/sales/performance/${cashierId}?period=${period}`);
  },

  // Reset daily sales - for testing purposes only
  async resetDailySales(cashierId: string): Promise<ApiResponse<{ message: string; resetTime: string }>> {
    // This endpoint would need to be implemented on backend
    return api.post<{ message: string; resetTime: string }>(`/sales/reset-daily/${cashierId}`, {});
  },

  // Get sales statistics
  async getStatistics(cashierId?: string): Promise<ApiResponse<{
    today: {
      total: number;
      count: number;
      cash: number;
      mpesa: number;
      card: number;
    };
    week: {
      total: number;
      count: number;
    };
    month: {
      total: number;
      count: number;
    };
  }>> {
    const url = cashierId ? `/sales/statistics?cashierId=${cashierId}` : '/sales/statistics';
    return api.get(url);
  },
};