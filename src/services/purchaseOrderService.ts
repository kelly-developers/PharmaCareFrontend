import { api, ApiResponse } from './api';
import { PurchaseOrder, PurchaseOrderItem } from '@/types/pharmacy';

interface CreatePurchaseOrderRequest {
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  expectedDate?: string;
}

interface UpdatePurchaseOrderRequest {
  items?: PurchaseOrderItem[];
  status?: 'draft' | 'sent' | 'received' | 'cancelled';
  expectedDate?: string;
}

export const purchaseOrderService = {
  // Get all purchase orders
  async getAll(status?: string): Promise<ApiResponse<PurchaseOrder[]>> {
    const query = status ? `?status=${status}` : '';
    return api.get<PurchaseOrder[]>(`/purchase-orders${query}`);
  },

  // Get purchase order by ID
  async getById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },

  // Create new purchase order
  async create(order: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return api.post<PurchaseOrder>('/purchase-orders', order);
  },

  // Update purchase order
  async update(id: string, updates: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return api.put<PurchaseOrder>(`/purchase-orders/${id}`, updates);
  },

  // Delete purchase order
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/purchase-orders/${id}`);
  },

  // Update status
  async updateStatus(id: string, status: 'draft' | 'sent' | 'received' | 'cancelled'): Promise<ApiResponse<PurchaseOrder>> {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
  },

  // Mark as received (updates stock)
  async markAsReceived(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`);
  },

  // Get orders by supplier
  async getBySupplier(supplierId: string): Promise<ApiResponse<PurchaseOrder[]>> {
    return api.get<PurchaseOrder[]>(`/purchase-orders/supplier/${supplierId}`);
  },
};
