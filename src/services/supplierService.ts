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

interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
}

export const supplierService = {
  // Get all suppliers (paginated)
  async getAll(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return api.get<any>(`/suppliers?page=${page}&limit=${limit}`);
  },

  // Get supplier by ID
  async getById(id: string): Promise<ApiResponse<Supplier>> {
    return api.get<Supplier>(`/suppliers/${id}`);
  },

  // Get supplier by name
  async getByName(name: string): Promise<ApiResponse<Supplier>> {
    return api.get<Supplier>(`/suppliers/name/${encodeURIComponent(name)}`);
  },

  // Create new supplier
  async create(supplier: CreateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return api.post<Supplier>('/suppliers', supplier);
  },

  // Update supplier
  async update(id: string, updates: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> {
    return api.put<Supplier>(`/suppliers/${id}`, updates);
  },

  // Delete/deactivate supplier
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/suppliers/${id}`);
  },

  // Activate supplier
  async activate(id: string): Promise<ApiResponse<Supplier>> {
    return api.patch<Supplier>(`/suppliers/${id}/activate`, {});
  },

  // Get active suppliers
  async getActive(): Promise<ApiResponse<Supplier[]>> {
    return api.get<Supplier[]>('/suppliers/active');
  },

  // Get supplier statistics
  async getStats(): Promise<ApiResponse<SupplierStats>> {
    return api.get<SupplierStats>('/suppliers/stats');
  },

  // Search suppliers (using getAll with search)
  async search(query: string): Promise<ApiResponse<Supplier[]>> {
    return api.get<Supplier[]>(`/suppliers?search=${encodeURIComponent(query)}`);
  },
};
