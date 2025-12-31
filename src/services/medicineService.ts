import { api, ApiResponse } from './api';
import { Medicine } from '@/types/pharmacy';

interface CreateMedicineRequest {
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  batchNumber: string;
  expiryDate: string;
  units: Array<{
    type: string;
    quantity: number;
    price: number;
    label?: string;
  }>;
  stockQuantity: number;
  reorderLevel: number;
  costPrice: number;
  imageUrl?: string;
  description?: string;
  productType?: string;
}

interface MedicineStats {
  totalMedicines: number;
  activeMedicines: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalValue: number;
}

export const medicineService = {
  // Get all medicines (paginated)
  async getAll(params?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
    expiringSoon?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.lowStock) queryParams.append('lowStock', 'true');
    if (params?.expiringSoon) queryParams.append('expiringSoon', 'true');
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return api.get<any>(`/medicines${query ? `?${query}` : ''}`);
  },

  // Get medicine by ID
  async getById(id: string): Promise<ApiResponse<Medicine>> {
    return api.get<Medicine>(`/medicines/${id}`);
  },

  // Create medicine
  async create(medicine: CreateMedicineRequest): Promise<ApiResponse<Medicine>> {
    const requestData = {
      name: medicine.name,
      genericName: medicine.genericName || '',
      category: medicine.category,
      manufacturer: medicine.manufacturer || '',
      batchNumber: medicine.batchNumber,
      expiryDate: medicine.expiryDate,
      units: medicine.units.map(unit => ({
        type: unit.type,
        quantity: unit.quantity,
        price: parseFloat(unit.price.toString())
      })),
      stockQuantity: parseInt(medicine.stockQuantity.toString()),
      reorderLevel: parseInt(medicine.reorderLevel.toString()),
      costPrice: parseFloat(medicine.costPrice.toString()),
      imageUrl: medicine.imageUrl || '',
      description: medicine.description || ''
    };

    console.log('Creating medicine with data:', requestData);
    return api.post<Medicine>('/medicines', requestData);
  },

  // Update medicine
  async update(id: string, updates: Partial<CreateMedicineRequest>): Promise<ApiResponse<Medicine>> {
    return api.put<Medicine>(`/medicines/${id}`, updates);
  },

  // Delete medicine
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/medicines/${id}`);
  },

  // Deduct stock
  async deductStock(
    medicineId: string,
    quantity: number,
    unitType?: string,
    referenceId?: string,
    performedById?: string,
    role?: string
  ): Promise<ApiResponse<any>> {
    return api.post<any>(`/medicines/${medicineId}/deduct-stock`, {
      quantity,
      unitType,
      referenceId,
      performedById,
      role
    });
  },

  // Add stock
  async addStock(
    medicineId: string,
    quantity: number,
    referenceId?: string,
    performedById?: string,
    role?: string
  ): Promise<ApiResponse<any>> {
    return api.post<any>(`/medicines/${medicineId}/add-stock`, {
      quantity,
      referenceId,
      performedBy: performedById,
      performedByRole: role
    });
  },

  // Get all categories
  async getCategories(): Promise<ApiResponse<any>> {
    const response = await api.get<any>('/medicines/categories');
    console.log('Categories API raw response:', response);
    
    if (response.success && response.data) {
      const data = response.data;
      
      if (Array.isArray(data)) {
        const categoryNames = data.map((item: any) => {
          if (typeof item === 'string') {
            return item;
          } else if (item && typeof item === 'object') {
            return item.name || '';
          }
          return '';
        }).filter((name: string) => name.trim() !== '');
        
        return {
          ...response,
          data: categoryNames
        };
      }
    }
    
    return { ...response, data: [] };
  },

  // Get low stock medicines
  async getLowStock(): Promise<ApiResponse<Medicine[]>> {
    const response = await api.get<any>('/medicines/low-stock');
    if (response.success && response.data) {
      return {
        ...response,
        data: Array.isArray(response.data) ? response.data : []
      };
    }
    return { ...response, data: [] };
  },

  // Get expiring medicines
  async getExpiring(): Promise<ApiResponse<Medicine[]>> {
    const response = await api.get<any>('/medicines/expiring');
    if (response.success && response.data) {
      return {
        ...response,
        data: Array.isArray(response.data) ? response.data : []
      };
    }
    return { ...response, data: [] };
  },

  // Get medicine statistics
  async getStats(): Promise<ApiResponse<MedicineStats>> {
    return api.get<MedicineStats>('/medicines/stats');
  },

  // Upload medicine image
  async uploadImage(medicineId: string, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = sessionStorage.getItem('auth_token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pharmacare-ywjs.onrender.com/api';
    
    const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}/image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    return { 
      success: response.ok, 
      data: data.data, 
      message: data.message,
      error: data.error 
    };
  }
};
