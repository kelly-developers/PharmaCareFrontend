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

  // Get today's sales for a specific cashier
  async getTodaySales(cashierId: string): Promise<ApiResponse<DailySalesReport>> {
    return api.get<DailySalesReport>(`/sales/today/${cashierId}`);
  },

  // Get sales by cashier
  async getByCashier(cashierId: string): Promise<ApiResponse<Sale[]>> {
    return api.get<Sale[]>(`/sales/cashier/${cashierId}`);
  },

  // Get daily sales report
  async getDailyReport(date: string): Promise<ApiResponse<DailySalesReport>> {
    return api.get<DailySalesReport>(`/sales/report/daily?date=${date}`);
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
    return api.get(`/sales/summary?startDate=${startDate}&endDate=${endDate}`);
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
    return api.get(`/sales/performance/${cashierId}?period=${period}`);
  },

  // Reset daily sales (for end of day)
  async resetDailySales(cashierId: string): Promise<ApiResponse<void>> {
    return api.post<void>(`/sales/reset-daily/${cashierId}`);
  },
};
