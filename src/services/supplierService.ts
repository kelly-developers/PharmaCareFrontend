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
  // Get all suppliers (paginated) - UPDATED to match backend
  async getAll(page: number = 0, limit: number = 1000): Promise<ApiResponse<any>> {
    return api.get<any>(`/suppliers?page=${page}&size=${limit}`);
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
    const backendSupplier = {
      name: supplier.name,
      contact_person: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city
    };
    return api.post<Supplier>('/suppliers', backendSupplier);
  },

  // Update supplier
  async update(id: string, updates: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> {
    const backendUpdates = {
      name: updates.name,
      contact_person: updates.contactPerson,
      email: updates.email,
      phone: updates.phone,
      address: updates.address,
      city: updates.city
    };
    return api.put<Supplier>(`/suppliers/${id}`, backendUpdates);
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

  // Search suppliers
  async search(query: string): Promise<ApiResponse<Supplier[]>> {
    return api.get<Supplier[]>(`/suppliers?search=${encodeURIComponent(query)}`);
  },
};