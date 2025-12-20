import { api, ApiResponse } from './api';
import { Supplier } from '@/types/pharmacy';

interface CreateSupplierRequest {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export const supplierService = {
  // Get all suppliers
  async getAll(): Promise<ApiResponse<Supplier[]>> {
    return api.get<Supplier[]>('/suppliers');
  },

  // Get supplier by ID
  async getById(id: string): Promise<ApiResponse<Supplier>> {
    return api.get<Supplier>(`/suppliers/${id}`);
  },

  // Create new supplier
  async create(supplier: CreateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return api.post<Supplier>('/suppliers', supplier);
  },

  // Update supplier
  async update(id: string, updates: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return api.put<Supplier>(`/suppliers/${id}`, updates);
  },

  // Delete supplier
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/suppliers/${id}`);
  },

  // Search suppliers
  async search(query: string): Promise<ApiResponse<Supplier[]>> {
    return api.get<Supplier[]>(`/suppliers/search?q=${encodeURIComponent(query)}`);
  },
};
