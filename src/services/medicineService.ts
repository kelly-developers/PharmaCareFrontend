import { api, ApiResponse } from './api';
import { Medicine } from '@/types/pharmacy';

interface CreateMedicineRequest {
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string;
  units: Array<{
    type: string;
    quantity: number;
    price: number;
    label?: string;
  }>;
  stockQuantity: number;
  reorderLevel: number;
  costPrice: number;
  unitPrice?: number;
  imageUrl?: string;
  description?: string;
  productType?: string;
  requiresPrescription?: boolean;
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
// In your medicineService.ts, update the getAll method to handle the response structure:

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

  // Create medicine - FIXED: Send data in correct format
  async create(medicine: CreateMedicineRequest): Promise<ApiResponse<Medicine>> {
    // Calculate unit_price from the first unit's price
    const unitPrice = medicine.units && medicine.units.length > 0 
      ? parseFloat(medicine.units[0].price.toString()) 
      : 0;

    const requestData = {
      name: medicine.name.trim(),
      generic_name: medicine.genericName?.trim() || '',
      category: medicine.category.trim(),
      manufacturer: medicine.manufacturer?.trim() || '',
      batch_number: medicine.batchNumber?.trim() || '',
      expiry_date: medicine.expiryDate || null,
      stock_quantity: parseInt(medicine.stockQuantity.toString()) || 0,
      reorder_level: parseInt(medicine.reorderLevel.toString()) || 10,
      cost_price: parseFloat(medicine.costPrice.toString()) || 0,
      unit_price: unitPrice, // Calculate from first unit
      description: medicine.description?.trim() || '',
      image_url: medicine.imageUrl || '',
      product_type: medicine.productType || 'tablets',
      requires_prescription: medicine.requiresPrescription || false,
      units: medicine.units ? JSON.stringify(medicine.units.map(unit => ({
        type: unit.type,
        quantity: unit.quantity,
        price: parseFloat(unit.price.toString()),
        label: unit.label || unit.type
      }))) : null
    };

    console.log('📦 Creating medicine with data:', requestData);
    
    // Remove null/empty values that shouldn't be sent
    const cleanedData: any = {};
    Object.keys(requestData).forEach(key => {
      const value = (requestData as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    });

    console.log('📦 Cleaned medicine data:', cleanedData);
    return api.post<Medicine>('/medicines', cleanedData);
  },

  // Update medicine
  async update(id: string, updates: Partial<CreateMedicineRequest>): Promise<ApiResponse<Medicine>> {
    const cleanedUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedUpdates[key] = value;
      }
    });
    
    return api.put<Medicine>(`/medicines/${id}`, cleanedUpdates);
  },

  // Delete medicine
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/medicines/${id}`);
  },

  // Add stock to medicine
  async addStock(
    medicineId: string,
    quantity: number,
    batchNumber?: string,
    expiryDate?: string,
    costPrice?: number,
    notes?: string
  ): Promise<ApiResponse<any>> {
    const requestData: any = {
      quantity: parseInt(quantity.toString())
    };
    
    if (batchNumber) requestData.batch_number = batchNumber;
    if (expiryDate) requestData.expiry_date = expiryDate;
    if (costPrice) requestData.cost_price = parseFloat(costPrice.toString());
    if (notes) requestData.notes = notes;
    
    return api.post<any>(`/medicines/${medicineId}/add-stock`, requestData);
  },

  // Deduct stock
  async deductStock(
    medicineId: string,
    quantity: number,
    notes?: string,
    referenceId?: string
  ): Promise<ApiResponse<any>> {
    return api.post<any>(`/medicines/${medicineId}/deduct-stock`, {
      quantity: parseInt(quantity.toString()),
      notes,
      reference_id: referenceId
    });
  },

  // Update batch information
  async updateBatch(
    medicineId: string,
    batchNumber?: string,
    expiryDate?: string
  ): Promise<ApiResponse<any>> {
    const requestData: any = {};
    if (batchNumber !== undefined) requestData.batch_number = batchNumber;
    if (expiryDate !== undefined) requestData.expiry_date = expiryDate;
    
    return api.post<any>(`/medicines/${medicineId}/update-batch`, requestData);
  },

  // Update stock directly
  async updateStock(
    medicineId: string,
    stockQuantity: number
  ): Promise<ApiResponse<any>> {
    return api.patch<any>(`/medicines/${medicineId}/stock`, {
      stock_quantity: parseInt(stockQuantity.toString())
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
            return item.name || item.category || '';
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
  async getExpiring(days?: number): Promise<ApiResponse<Medicine[]>> {
    const query = days ? `?days=${days}` : '';
    const response = await api.get<any>(`/medicines/expiring${query}`);
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
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pharma-care-backend-hdyf.onrender.com';
    
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