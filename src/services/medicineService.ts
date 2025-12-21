import { api, ApiResponse, PaginatedResponse } from './api';
import { Medicine, MedicineUnit } from '@/types/pharmacy';

interface CreateMedicineRequest {
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  units: MedicineUnit[];
  stockQuantity: number;
  reorderLevel: number;
  supplierId: string;
  costPrice: number;
  imageUrl?: string;
}

interface UpdateMedicineRequest extends Partial<CreateMedicineRequest> {
  id: string;
}

interface StockUpdateRequest {
  medicineId: string;
  quantity: number;
  type: 'add' | 'deduct' | 'adjustment' | 'loss';
  reason?: string;
  referenceId?: string;
  unitType?: string;
}

export const medicineService = {
  // Get all medicines with optional filters
  async getAll(params?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Medicine[]>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.lowStock) queryParams.append('lowStock', 'true');
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return api.get<Medicine[]>(`/medicines${query ? `?${query}` : ''}`);
  },

  // Get medicine by ID
  async getById(id: string): Promise<ApiResponse<Medicine>> {
    return api.get<Medicine>(`/medicines/${id}`);
  },

  // Create new medicine
  async create(medicine: CreateMedicineRequest): Promise<ApiResponse<Medicine>> {
    return api.post<Medicine>('/medicines', medicine);
  },

  // Update medicine
  async update(id: string, updates: Partial<CreateMedicineRequest>): Promise<ApiResponse<Medicine>> {
    return api.put<Medicine>(`/medicines/${id}`, updates);
  },

  // Delete medicine
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/medicines/${id}`);
  },

  // Update stock
  async updateStock(request: StockUpdateRequest): Promise<ApiResponse<Medicine>> {
    return api.post<Medicine>('/medicines/stock', request);
  },

  // Deduct stock (for sales)
  async deductStock(
    medicineId: string,
    quantity: number,
    unitType: string,
    referenceId: string,
    performedBy: string,
    performedByRole: string
  ): Promise<ApiResponse<Medicine>> {
    return api.post<Medicine>('/medicines/stock/deduct', {
      medicineId,
      quantity,
      unitType,
      referenceId,
      performedBy,
      performedByRole,
    });
  },

  // Add stock (for purchases)
  async addStock(
    medicineId: string,
    quantity: number,
    referenceId: string,
    performedBy: string,
    performedByRole: string
  ): Promise<ApiResponse<Medicine>> {
    return api.post<Medicine>('/medicines/stock/add', {
      medicineId,
      quantity,
      referenceId,
      performedBy,
      performedByRole,
    });
  },

  // Get low stock medicines
  async getLowStock(): Promise<ApiResponse<Medicine[]>> {
    return api.get<Medicine[]>('/medicines/low-stock');
  },

  // Get out of stock medicines
  async getOutOfStock(): Promise<ApiResponse<Medicine[]>> {
    return api.get<Medicine[]>('/medicines/out-of-stock');
  },

  // Get expiring soon medicines
  async getExpiringSoon(days: number = 30): Promise<ApiResponse<Medicine[]>> {
    return api.get<Medicine[]>(`/medicines/expiring-soon?days=${days}`);
  },

  // Get stock movements for a medicine
  async getStockMovements(medicineId: string): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`/medicines/${medicineId}/movements`);
  },

  // Upload medicine image
  async uploadImage(medicineId: string, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/medicines/${medicineId}/image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    return { success: response.ok, data: data.data, error: data.error };
  },
};
