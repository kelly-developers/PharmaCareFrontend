import { api, ApiResponse } from './api';

export interface CreditSale {
  id: string;
  saleId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  payments: CreditPayment[];
  sale?: any;
}

export interface CreditPayment {
  id: string;
  creditSaleId: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  receivedBy: string;
  receivedByName: string;
  notes?: string;
  createdAt: Date;
}

interface CreateCreditPaymentRequest {
  creditSaleId: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  notes?: string;
}

// Transform backend response to frontend format
const transformCreditSale = (data: any): CreditSale => {
  return {
    id: data.id,
    saleId: data.sale_id || data.saleId || '',
    customerId: data.customer_id || data.customerId,
    customerName: data.customer_name || data.customerName || 'Unknown',
    customerPhone: data.customer_phone || data.customerPhone || '',
    totalAmount: parseFloat(data.total_amount || data.totalAmount || 0),
    paidAmount: parseFloat(data.paid_amount || data.paidAmount || 0),
    balanceAmount: parseFloat(data.balance_amount || data.balanceAmount || 0),
    status: (data.status || 'pending').toLowerCase() as 'pending' | 'partial' | 'paid',
    dueDate: data.due_date || data.dueDate ? new Date(data.due_date || data.dueDate) : undefined,
    notes: data.notes || '',
    createdAt: new Date(data.created_at || data.createdAt || new Date()),
    updatedAt: new Date(data.updated_at || data.updatedAt || new Date()),
    payments: (data.payments || []).map((p: any) => ({
      id: p.id,
      creditSaleId: p.credit_sale_id || p.creditSaleId,
      amount: parseFloat(p.amount || 0),
      paymentMethod: (p.payment_method || p.paymentMethod || 'cash').toLowerCase(),
      receivedBy: p.received_by || p.receivedBy || '',
      receivedByName: p.received_by_name || p.receivedByName || 'Unknown',
      notes: p.notes || '',
      createdAt: new Date(p.created_at || p.createdAt || new Date()),
    })),
    sale: data.sale,
  };
};

export const creditService = {
  // Get all credit sales
  async getAll(filters?: { status?: string; customerId?: string }): Promise<ApiResponse<CreditSale[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.customerId) queryParams.append('customerId', filters.customerId);
      
      const query = queryParams.toString();
      const response = await api.get<any>(`/sales/credit${query ? `?${query}` : ''}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const content = Array.isArray(data) ? data : (data.content || data.credits || []);
        
        return {
          success: true,
          data: content.map(transformCreditSale),
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching credit sales:', error);
      throw error;
    }
  },

  // Get credit sale by ID
  async getById(id: string): Promise<ApiResponse<CreditSale>> {
    try {
      const response = await api.get<any>(`/sales/credit/${id}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        return {
          success: true,
          data: transformCreditSale(data),
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching credit sale:', error);
      throw error;
    }
  },

  // Get credit sales summary
  async getSummary(): Promise<ApiResponse<{
    totalOutstanding: number;
    totalCredits: number;
    pendingCount: number;
    partialCount: number;
    paidCount: number;
  }>> {
    try {
      const response = await api.get<any>('/sales/credit/summary');
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        return {
          success: true,
          data: {
            totalOutstanding: parseFloat(data.total_outstanding || data.totalOutstanding || 0),
            totalCredits: parseInt(data.total_credits || data.totalCredits || 0),
            pendingCount: parseInt(data.pending_count || data.pendingCount || 0),
            partialCount: parseInt(data.partial_count || data.partialCount || 0),
            paidCount: parseInt(data.paid_count || data.paidCount || 0),
          },
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching credit summary:', error);
      throw error;
    }
  },

  // Record a payment for a credit sale
  async recordPayment(payment: CreateCreditPaymentRequest): Promise<ApiResponse<CreditSale>> {
    try {
      // The backend route is /sales/credit/:id/payment
      const response = await api.post<any>(`/sales/credit/${payment.creditSaleId}/payment`, {
        amount: payment.amount,
        payment_method: payment.paymentMethod.toUpperCase(),
        notes: payment.notes || '',
      });
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        return {
          success: true,
          data: transformCreditSale(data),
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      throw error;
    }
  },

  // Get customer credit history
  async getCustomerCredits(customerPhone: string): Promise<ApiResponse<CreditSale[]>> {
    try {
      const response = await api.get<any>(`/sales/credit/customer/${encodeURIComponent(customerPhone)}`);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const content = Array.isArray(data) ? data : (data.content || data.credits || []);
        
        return {
          success: true,
          data: content.map(transformCreditSale),
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching customer credits:', error);
      throw error;
    }
  },
};
