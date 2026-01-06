import { api, ApiResponse } from './api';
import { Sale, SaleItem } from '@/types/pharmacy';

interface CreateSaleRequest {
  items: Array<{
    medicineId: string;
    medicineName: string;
    unitType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice: number;
  }>;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  customerName?: string;
  customerPhone?: string;
  discount?: number;
  notes?: string;
}

interface TodaySalesSummary {
  date: string;
  transactionCount: number;
  totalSales: number;
  totalProfit: number;
  sales: Sale[];
}

export const salesService = {
  // Get all sales (paginated)
  async getAll(filters?: any): Promise<ApiResponse<any>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.cashierId) queryParams.append('cashierId', filters.cashierId);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      if (filters?.page !== undefined) queryParams.append('page', filters.page.toString());
      if (filters?.size !== undefined) queryParams.append('size', filters.size.toString());
      
      const query = queryParams.toString();
      const response = await api.get<any>(`/sales${query ? `?${query}` : ''}`);
      
      console.log('📊 getAll sales response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      throw error;
    }
  },

  // Get sale by ID
  async getById(id: string): Promise<ApiResponse<Sale>> {
    return api.get<Sale>(`/sales/${id}`);
  },

  // Create sale - FIXED: Match backend expectations
  async create(saleData: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    try {
      console.log('📤 Creating sale:', saleData);
      
      // Transform frontend data to match backend expectations
      const backendSaleData = {
        items: saleData.items.map(item => ({
          medicine_id: item.medicineId, // Use snake_case for backend
          medicine_name: item.medicineName,
          unit_type: item.unitType,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cost_price: item.costPrice
        })),
        payment_method: saleData.paymentMethod, // snake_case
        customer_name: saleData.customerName,
        customer_phone: saleData.customerPhone,
        discount: saleData.discount || 0,
        notes: saleData.notes || ''
      };
      
      console.log('📤 Sending to backend:', backendSaleData);
      const response = await api.post<Sale>('/sales', backendSaleData);
      console.log('✅ Create sale response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating sale:', error);
      throw error;
    }
  },

  // Delete sale
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/sales/${id}`);
  },

  // Get today's sales summary
  async getTodaySummary(): Promise<ApiResponse<TodaySalesSummary>> {
    return api.get<TodaySalesSummary>('/sales/today');
  },

  // Get cashier's today sales - FIXED: Transform backend response
  async getCashierTodaySales(cashierId: string): Promise<ApiResponse<TodaySalesSummary>> {
    try {
      const response = await api.get<any>(`/sales/cashier/${cashierId}/today`);
      console.log('👤 Cashier today sales raw response:', response);
      
      if (response.success && response.data) {
        // Transform snake_case to camelCase for frontend
        const transformedData = {
          date: response.data.date,
          transactionCount: response.data.transactionCount || response.data.transaction_count || 0,
          totalSales: response.data.totalSales || response.data.total_sales || 0,
          totalProfit: response.data.totalProfit || response.data.total_profit || 0,
          sales: (response.data.sales || []).map((sale: any) => ({
            id: sale.id,
            cashierId: sale.cashier_id,
            cashierName: sale.cashier_name,
            totalAmount: sale.total_amount || 0,
            discount: sale.discount || 0,
            finalAmount: sale.final_amount || 0,
            profit: sale.profit || 0,
            paymentMethod: sale.payment_method?.toLowerCase() || 'cash',
            customerName: sale.customer_name,
            customerPhone: sale.customer_phone,
            notes: sale.notes,
            createdAt: sale.created_at,
            items: (sale.items || []).map((item: any) => ({
              id: item.id,
              medicineId: item.medicine_id,
              medicineName: item.medicine_name,
              quantity: item.quantity,
              unitType: item.unit_type,
              unitLabel: item.unit_label,
              unitPrice: item.unit_price,
              costPrice: item.cost_price,
              subtotal: item.subtotal,
              profit: item.profit,
              totalPrice: item.subtotal // Use subtotal as totalPrice for frontend
            }))
          }))
        };
        
        return {
          success: true,
          data: transformedData
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching cashier today sales:', error);
      throw error;
    }
  },

  // Get sales report
  async getReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/sales/report?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get sales by cashier
  async getByCashier(cashierId: string, page: number = 0, size: number = 20): Promise<ApiResponse<any>> {
    return api.get<any>(`/sales/cashier/${cashierId}?page=${page}&size=${size}`);
  },

  // Get sales total for period
  async getPeriodTotal(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/sales/period-total?startDate=${startDate}&endDate=${endDate}`);
  },
};