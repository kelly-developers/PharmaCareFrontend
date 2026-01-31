import { api } from './api';
import { Business, CreateBusinessRequest, UpdateBusinessRequest } from '@/types/business';

interface BusinessListResponse {
  businesses: Business[];
  total: number;
  page: number;
  pages: number;
}

interface BusinessStatsResponse {
  totalBusinesses: number;
  activeBusinesses: number;
  pharmacyCount: number;
  generalCount: number;
  supermarketCount: number;
  retailCount: number;
}

export const businessService = {
  // Get all businesses (super admin only)
  async getAll(page = 1, limit = 20, status?: string): Promise<{ success: boolean; data?: BusinessListResponse; error?: string }> {
    let endpoint = `/businesses?page=${page}&limit=${limit}`;
    if (status) endpoint += `&status=${status}`;
    
    const response = await api.get<BusinessListResponse>(endpoint);
    return response;
  },

  // Get business by ID
  async getById(id: string): Promise<{ success: boolean; data?: Business; error?: string }> {
    return await api.get<Business>(`/businesses/${id}`);
  },

  // Create new business (super admin only)
  async create(data: CreateBusinessRequest): Promise<{ success: boolean; data?: Business; error?: string }> {
    return await api.post<Business>('/businesses', data);
  },

  // Update business
  async update(id: string, data: UpdateBusinessRequest): Promise<{ success: boolean; data?: Business; error?: string }> {
    return await api.put<Business>(`/businesses/${id}`, data);
  },

  // Delete/deactivate business
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    return await api.delete(`/businesses/${id}`);
  },

  // Get business statistics (super admin dashboard)
  async getStats(): Promise<{ success: boolean; data?: BusinessStatsResponse; error?: string }> {
    return await api.get<BusinessStatsResponse>('/businesses/stats');
  },

  // Check if schema name is available
  async checkSchemaAvailable(schemaName: string): Promise<{ success: boolean; data?: { available: boolean }; error?: string }> {
    return await api.get<{ available: boolean }>(`/businesses/check-schema/${schemaName}`);
  },

  // Activate business
  async activate(id: string): Promise<{ success: boolean; error?: string }> {
    return await api.post(`/businesses/${id}/activate`);
  },

  // Suspend business
  async suspend(id: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    return await api.post(`/businesses/${id}/suspend`, { reason });
  },
};
