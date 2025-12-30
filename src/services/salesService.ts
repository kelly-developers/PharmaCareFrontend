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

interface TodaySalesSummary {
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

interface SalesReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  transactionCount: number;
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  salesByCategory: { category: string; total: number }[];
}

interface PeriodTotal {
  startDate: string;
  endDate: string;
  total: number;
  count: number;
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
  // Get all sales (paginated)
  async getAll(filters?: SalesFilters): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.cashierId) queryParams.append('cashierId', filters.cashierId);
    if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    
    const query = queryParams.toString();
    return api.get<any>(`/sales${query ? `?${query}` : ''}`);
  },

  // Get sale by ID
  async getById(id: string): Promise<ApiResponse<Sale>> {
    return api.get<Sale>(`/sales/${id}`);
  },

  // Create sale
  async create(sale: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    return api.post<Sale>('/sales', sale);
  },

  // Delete sale
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/sales/${id}`);
  },

  // Get today's sales summary
  async getTodaySummary(): Promise<ApiResponse<TodaySalesSummary>> {
    return api.get<TodaySalesSummary>('/sales/today');
  },

  // Get cashier's today sales
  async getCashierTodaySales(cashierId: string): Promise<ApiResponse<TodaySalesSummary>> {
    return api.get<TodaySalesSummary>(`/sales/cashier/${cashierId}/today`);
  },

  // Get sales report (by date range)
  async getReport(startDate: string, endDate: string): Promise<ApiResponse<SalesReport>> {
    return api.get<SalesReport>(`/sales/report?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get sales by cashier
  async getByCashier(cashierId: string, page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return api.get<any>(`/sales/cashier/${cashierId}?page=${page}&limit=${limit}`);
  },

  // Get sales total for period
  async getPeriodTotal(startDate: string, endDate: string): Promise<ApiResponse<PeriodTotal>> {
    return api.get<PeriodTotal>(`/sales/period-total?startDate=${startDate}&endDate=${endDate}`);
  },

  // Convenience methods
  async getByDateRange(startDate: string, endDate: string, cashierId?: string): Promise<ApiResponse<any>> {
    let url = `/sales?startDate=${startDate}&endDate=${endDate}`;
    if (cashierId) {
      url += `&cashierId=${cashierId}`;
    }
    return api.get<any>(url);
  },

  async getDailyReport(date: string): Promise<ApiResponse<SalesReport>> {
    return api.get<SalesReport>(`/sales/report?startDate=${date}&endDate=${date}`);
  },

  async getSummary(startDate: string, endDate: string): Promise<ApiResponse<SalesReport>> {
    return api.get<SalesReport>(`/sales/report?startDate=${startDate}&endDate=${endDate}`);
  },
};
