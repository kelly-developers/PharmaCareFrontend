import { api, ApiResponse } from './api';
import { PurchaseOrder, PurchaseOrderItem } from '@/types/pharmacy';

interface CreatePurchaseOrderRequest {
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount?: number;
  expectedDate?: string;
}

interface UpdatePurchaseOrderRequest {
  items?: PurchaseOrderItem[];
  expectedDate?: string;
}

interface PurchaseOrderStats {
  totalOrders: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  receivedCount: number;
  cancelledCount: number;
  totalValue: number;
}

export const purchaseOrderService = {
  // Get all purchase orders (paginated)
  async getAll(page: number = 1, limit: number = 20, status?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (status) queryParams.append('status', status);
    return api.get<any>(`/purchase-orders?${queryParams.toString()}`);
  },

  // Get purchase order by ID
  async getById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },

  // Create purchase order
  async create(order: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return api.post<PurchaseOrder>('/purchase-orders', order);
  },

  // Update purchase order
  async update(id: string, updates: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return api.put<PurchaseOrder>(`/purchase-orders/${id}`, updates);
  },

  // Submit purchase order
  async submit(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/submit`, {});
  },

  // Approve purchase order
  async approve(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/approve`, {});
  },

  // Receive purchase order (updates stock)
  async receive(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/receive`, {});
  },

  // Cancel purchase order
  async cancel(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {});
  },

  // Get orders by supplier
  async getBySupplier(supplierId: string): Promise<ApiResponse<PurchaseOrder[]>> {
    return api.get<PurchaseOrder[]>(`/purchase-orders/supplier/${supplierId}`);
  },

  // Get orders by status
  async getByStatus(status: string): Promise<ApiResponse<PurchaseOrder[]>> {
    return api.get<PurchaseOrder[]>(`/purchase-orders/status/${status}`);
  },

  // Get purchase order statistics
  async getStats(): Promise<ApiResponse<PurchaseOrderStats>> {
    return api.get<PurchaseOrderStats>('/purchase-orders/stats');
  },

  // Legacy methods for backward compatibility
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/purchase-orders/${id}`);
  },

  async updateStatus(id: string, status: 'draft' | 'sent' | 'received' | 'cancelled'): Promise<ApiResponse<PurchaseOrder>> {
    if (status === 'sent') return this.submit(id);
    if (status === 'received') return this.receive(id);
    if (status === 'cancelled') return this.cancel(id);
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
  },

  async markAsReceived(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return this.receive(id);
  },
};
