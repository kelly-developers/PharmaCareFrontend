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

// Helper function to transform sale data from backend to frontend format
const transformSale = (sale: any): Sale => {
  if (!sale) {
    return {
      id: '',
      cashierId: '',
      cashierName: '',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paymentMethod: 'cash',
      customerName: 'Walk-in',
      customerPhone: '',
      notes: '',
      createdAt: new Date(),
      items: []
    };
  }
  
  // Handle null/undefined values safely
  const subtotal = parseFloat(sale.total_amount || sale.subtotal || 0) || 0;
  const discount = parseFloat(sale.discount || 0) || 0;
  const total = parseFloat(sale.final_amount || sale.total || 0) || 0;
  
  return {
    id: sale.id || `sale-${Date.now()}`,
    cashierId: sale.cashier_id || sale.cashierId || '',
    cashierName: sale.cashier_name || sale.cashierName || 'Unknown',
    subtotal: subtotal,
    discount: discount,
    tax: 0,
    total: total,
    paymentMethod: (sale.payment_method || sale.paymentMethod || 'CASH').toLowerCase() as 'cash' | 'mpesa' | 'card',
    customerName: sale.customer_name || sale.customerName || 'Walk-in',
    customerPhone: sale.customer_phone || sale.customerPhone || '',
    notes: sale.notes || '',
    createdAt: new Date(sale.created_at || sale.createdAt || new Date()),
    items: (sale.items || []).map((item: any) => ({
      medicineId: item.medicine_id || item.medicineId || '',
      medicineName: item.medicine_name || item.medicineName || '',
      unitType: item.unit_type || item.unitType || '',
      quantity: item.quantity || 0,
      unitPrice: item.unit_price || item.unitPrice || 0,
      totalPrice: item.subtotal || item.totalPrice || 0,
      costPrice: item.cost_price || item.costPrice || 0,
      profit: item.profit || 0
    }))
  };
};

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
      
      if (response.success && response.data) {
        // Handle nested paginated response structure
        const data = response.data.data || response.data;
        const content = data?.content || data?.sales || data || [];
        
        const transformedSales = content.map((sale: any) => transformSale(sale));
        
        return {
          success: true,
          data: transformedSales
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      throw error;
    }
  },

  // Get sale by ID
  async getById(id: string): Promise<ApiResponse<Sale>> {
    try {
      const response = await api.get<any>(`/sales/${id}`);
      
      if (response.success && response.data) {
        const saleData = response.data.data || response.data;
        const transformedSale = transformSale(saleData);
        
        return {
          success: true,
          data: transformedSale
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching sale by ID:', error);
      throw error;
    }
  },

  // Create sale - COMPLETELY FIXED: Handle undefined values
  async create(saleData: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    try {
      console.log('📤 Creating sale:', saleData);
      
      // FIXED: Ensure all values are safe before sending
      const backendSaleData = {
        items: saleData.items.map(item => ({
          medicine_id: item.medicineId,
          medicine_name: item.medicineName,
          unit_type: item.unitType,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cost_price: item.costPrice
        })),
        // FIXED: Add safety check for paymentMethod
        payment_method: (saleData.paymentMethod || 'cash').toUpperCase(),
        customer_name: saleData.customerName || 'Walk-in',
        // FIXED: Convert undefined to empty string
        customer_phone: saleData.customerPhone || '',
        discount: saleData.discount || 0,
        notes: saleData.notes || ''
      };
      
      console.log('📤 Sending to backend:', backendSaleData);
      
      const response = await api.post<any>('/sales', backendSaleData);
      console.log('✅ Create sale response:', response);
      
      if (response.success && response.data) {
        // CRITICAL FIX: Handle both response.data.data and response.data
        const saleData = response.data.data || response.data;
        
        if (!saleData) {
          throw new Error('No sale data returned from server');
        }
        
        console.log('📦 Extracted sale data:', saleData);
        
        // Transform backend response to frontend Sale type
        const transformedSale: Sale = {
          id: saleData.id || `sale-${Date.now()}`,
          cashierId: saleData.cashier_id || saleData.cashierId,
          cashierName: saleData.cashier_name || saleData.cashierName || 'Unknown',
          subtotal: saleData.total_amount || saleData.subtotal || 0,
          discount: saleData.discount || 0,
          tax: 0,
          total: saleData.final_amount || saleData.total || 0,
          paymentMethod: (saleData.payment_method || saleData.paymentMethod || 'CASH').toLowerCase() as 'cash' | 'mpesa' | 'card',
          customerName: saleData.customer_name || saleData.customerName || 'Walk-in',
          customerPhone: saleData.customer_phone || saleData.customerPhone || '',
          notes: saleData.notes || '',
          createdAt: new Date(saleData.created_at || saleData.createdAt || new Date()),
          items: (saleData.items || []).map((item: any) => ({
            medicineId: item.medicine_id || item.medicineId,
            medicineName: item.medicine_name || item.medicineName,
            unitType: item.unit_type || item.unitType,
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || item.unitPrice || 0,
            totalPrice: item.subtotal || item.totalPrice || 0,
            costPrice: item.cost_price || item.costPrice || 0,
            profit: item.profit || 0
          }))
        };
        
        return {
          success: true,
          data: transformedSale
        };
      } else {
        throw new Error(response.error || 'Failed to create sale');
      }
    } catch (error: any) {
      console.error('❌ Error creating sale:', error);
      throw error;
    }
  },

  // Delete sale
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<void>(`/sales/${id}`);
      return response;
    } catch (error) {
      console.error('❌ Error deleting sale:', error);
      throw error;
    }
  },

  // Get today's sales summary
  async getTodaySummary(): Promise<ApiResponse<TodaySalesSummary>> {
    try {
      const response = await api.get<any>('/sales/today');
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        
        const transformedData: TodaySalesSummary = {
          date: data.date || new Date().toISOString().split('T')[0],
          transactionCount: data.transactionCount || data.transaction_count || 0,
          totalSales: data.totalSales || data.total_sales || 0,
          totalProfit: data.totalProfit || data.total_profit || 0,
          sales: (data.sales || []).map((sale: any) => transformSale(sale))
        };
        
        return {
          success: true,
          data: transformedData
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching today summary:', error);
      throw error;
    }
  },

  // Get cashier's today sales - COMPLETELY FIXED
  async getCashierTodaySales(cashierId: string): Promise<ApiResponse<TodaySalesSummary>> {
    try {
      const response = await api.get<any>(`/sales/cashier/${cashierId}/today`);
      console.log('👤 Cashier today sales raw response:', response);
      
      if (response.success && response.data) {
        // Handle nested data structure
        const responseData = response.data.data || response.data;
        
        if (!responseData) {
          return {
            success: false,
            error: 'No data returned'
          };
        }
        
        console.log('📊 Extracted cashier data:', responseData);
        
        // Transform snake_case to camelCase for frontend
        const transformedData: TodaySalesSummary = {
          date: responseData.date || new Date().toISOString().split('T')[0],
          transactionCount: responseData.transactionCount || responseData.transaction_count || 0,
          totalSales: responseData.totalSales || responseData.total_sales || 0,
          totalProfit: responseData.totalProfit || responseData.total_profit || 0,
          sales: (responseData.sales || []).map((sale: any) => transformSale(sale))
        };
        
        return {
          success: true,
          data: transformedData
        };
      } else {
        return response;
      }
    } catch (error) {
      console.error('❌ Error fetching cashier today sales:', error);
      throw error;
    }
  },

  // Get sales report
  async getReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.get<any>(`/sales/report?startDate=${startDate}&endDate=${endDate}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        return {
          success: true,
          data: data
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching report:', error);
      throw error;
    }
  },

  // Get sales by cashier
  async getByCashier(cashierId: string, page: number = 0, size: number = 20): Promise<ApiResponse<any>> {
    try {
      const response = await api.get<any>(`/sales/cashier/${cashierId}?page=${page}&size=${size}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const content = data?.content || data?.sales || data || [];
        
        const transformedSales = content.map((sale: any) => transformSale(sale));
        
        return {
          success: true,
          data: transformedSales
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching sales by cashier:', error);
      throw error;
    }
  },

  // Get sales total for period
  async getPeriodTotal(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.get<any>(`/sales/period-total?startDate=${startDate}&endDate=${endDate}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        return {
          success: true,
          data: data
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching period total:', error);
      throw error;
    }
  }
};