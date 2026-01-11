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
  async getAll(page: number = 0, limit: number = 1000, status?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', limit.toString());
    if (status) queryParams.append('status', status);
    return api.get<any>(`/purchase-orders?${queryParams.toString()}`);
  },

  // Get purchase order by ID
  async getById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },

  // Create purchase order
  async create(order: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    const backendOrder = {
      supplier_id: order.supplierId,
      supplier_name: order.supplierName,
      items: order.items.map(item => ({
        medicine_id: item.medicineId,
        medicine_name: item.medicineName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitPrice,
        subtotal: item.totalPrice,
        total_cost: item.totalPrice
      })),
      total: order.totalAmount,
      total_amount: order.totalAmount,
      expected_delivery_date: order.expectedDate
    };
    return api.post<PurchaseOrder>('/purchase-orders', backendOrder);
  },

  // Update purchase order
  async update(id: string, updates: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    const backendUpdates = {
      items: updates.items?.map(item => ({
        medicine_id: item.medicineId,
        medicine_name: item.medicineName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitPrice,
        subtotal: item.totalPrice,
        total_cost: item.totalPrice
      })),
      expected_delivery_date: updates.expectedDate
    };
    return api.put<PurchaseOrder>(`/purchase-orders/${id}`, backendUpdates);
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