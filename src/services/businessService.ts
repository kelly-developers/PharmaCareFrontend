import { api } from './api';
import { Business, CreateBusinessRequest, UpdateBusinessRequest } from '@/types/business';

interface BusinessListResponse {
  data: Business[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface BusinessDashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingBusinesses: number;
  pharmacyCount: number;
  generalCount: number;
  supermarketCount: number;
  retailCount: number;
  totalUsers?: number;
  adminCount?: number;
  recentBusinesses?: number;
  monthlyGrowth?: {
    current: number;
    previous: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const normalizeBusiness = (raw: any): Business & { admins?: any[]; usersCount?: number } => {
  const usersCountRaw = raw?.usersCount ?? raw?.users_count;

  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    phone: String(raw?.phone ?? ''),
    businessType: (raw?.businessType ?? raw?.business_type ?? 'pharmacy') as any,
    schemaName: String(raw?.schemaName ?? raw?.schema_name ?? raw?.schema ?? ''),
    address: raw?.address ?? undefined,
    city: raw?.city ?? undefined,
    country: raw?.country ?? undefined,
    logo: raw?.logo ?? undefined,
    subscriptionPlan: (raw?.subscriptionPlan ?? raw?.subscription_plan ?? undefined) as any,
    status: (raw?.status ?? 'active') as any,
    createdAt: toDate(raw?.createdAt ?? raw?.created_at),
    updatedAt: raw?.updatedAt || raw?.updated_at ? toDate(raw?.updatedAt ?? raw?.updated_at) : undefined,
    ownerId: raw?.ownerId ?? raw?.owner_id ?? undefined,
    ...(usersCountRaw !== undefined ? { usersCount: Number(usersCountRaw) } : {}),
    ...(Array.isArray(raw?.admins) ? { admins: raw.admins } : {}),
  };
};

const normalizeBusinessArray = (raw: any): Business[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeBusiness);
};

export const businessService = {
  // Get all businesses (super admin only)
  async getAll(
    page = 1, 
    limit = 20, 
    status?: string
  ): Promise<ApiResponse<BusinessListResponse>> {
    try {
      let endpoint = `/businesses?page=${page}&limit=${limit}`;
      if (status) endpoint += `&status=${status}`;
      
      const response = await api.get<any>(endpoint);

      if (!response.success) return response as any;

      const payload = response.data as any;

      const businessesRaw = payload?.businesses ?? payload?.data ?? payload;
      const businesses = normalizeBusinessArray(businessesRaw);

      const total = Number(payload?.total ?? payload?.pagination?.total ?? 0);
      const resolvedLimit = Number(payload?.limit ?? payload?.pagination?.limit ?? limit);
      const pages = Number(
        payload?.pages ??
          payload?.pagination?.pages ??
          (resolvedLimit ? Math.ceil(total / resolvedLimit) : 1)
      );

      return {
        success: true,
        data: {
          data: businesses,
          pagination: {
            page: Number(payload?.page ?? payload?.pagination?.page ?? page),
            limit: resolvedLimit,
            total,
            pages,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching businesses:', error);
      return {
        success: false,
        error: 'Failed to fetch businesses'
      };
    }
  },

  // Get business by ID
  async getById(id: string): Promise<ApiResponse<Business>> {
    try {
      // Try the my-business endpoint first (for non-super-admin users)
      const myBusinessResponse = await api.get<any>('/businesses/my-business');
      if (myBusinessResponse.success && myBusinessResponse.data) {
        return { success: true, data: normalizeBusiness(myBusinessResponse.data) as any };
      }
      
      // Fall back to regular endpoint (for super admins)
      const response = await api.get<any>(`/businesses/${id}`);
      if (response.success && response.data) {
        return { success: true, data: normalizeBusiness(response.data) as any };
      }
      return response as any;
    } catch (error) {
      console.error('Error fetching business by ID:', error);
      return {
        success: false,
        error: 'Failed to fetch business'
      };
    }
  },

  // Get my business (for business admins)
  async getMyBusiness(): Promise<ApiResponse<Business>> {
    try {
      const response = await api.get<any>('/businesses/my-business');
      if (response.success && response.data) {
        return { success: true, data: normalizeBusiness(response.data) as any };
      }
      return response as any;
    } catch (error) {
      console.error('Error fetching my business:', error);
      return {
        success: false,
        error: 'Failed to fetch business'
      };
    }
  },

  // Update my business (for business admins)
  async updateMyBusiness(data: UpdateBusinessRequest): Promise<ApiResponse<Business>> {
    try {
      const response = await api.put<any>('/businesses/my-business', data);
      if (response.success && response.data) {
        return { success: true, data: normalizeBusiness(response.data) as any, message: response.message };
      }
      return response as any;
    } catch (error) {
      console.error('Error updating my business:', error);
      return {
        success: false,
        error: 'Failed to update business'
      };
    }
  },

  // Create new business (super admin only)
  async create(data: CreateBusinessRequest): Promise<ApiResponse<Business>> {
    try {
      const response = await api.post<any>('/businesses', data);
      if (response.success && response.data) {
        return { success: true, data: normalizeBusiness(response.data) as any, message: response.message };
      }
      return response as any;
    } catch (error) {
      console.error('Error creating business:', error);
      return {
        success: false,
        error: 'Failed to create business'
      };
    }
  },

  // Update business
  async update(id: string, data: UpdateBusinessRequest): Promise<ApiResponse<Business>> {
    try {
      const response = await api.put<any>(`/businesses/${id}`, data);
      if (response.success && response.data) {
        return { success: true, data: normalizeBusiness(response.data) as any, message: response.message };
      }
      return response as any;
    } catch (error) {
      console.error('Error updating business:', error);
      return {
        success: false,
        error: 'Failed to update business'
      };
    }
  },

  // Delete/deactivate business
  async delete(id: string): Promise<ApiResponse> {
    try {
      return await api.delete(`/businesses/${id}`);
    } catch (error) {
      console.error('Error deleting business:', error);
      return {
        success: false,
        error: 'Failed to delete business'
      };
    }
  },

  // Get business statistics (super admin dashboard)
  async getStats(): Promise<ApiResponse<BusinessDashboardStats>> {
    try {
      const response = await api.get<any>('/businesses/stats');
      
      if (response.success && response.data) {
        const stats = response.data as any;

        // Prefer backend-provided shape (newer backend)
        if (typeof stats.totalBusinesses === 'number') {
          return { success: true, data: stats as BusinessDashboardStats };
        }

        // Back-compat: transform older stats shapes
        const total = Number(stats.total ?? stats.total_businesses ?? 0);
        const byStatus = stats.byStatus || {
          active: Number(stats.active_businesses ?? 0),
          inactive: Number(stats.inactive_businesses ?? 0),
          suspended: Number(stats.suspended_businesses ?? 0),
          pending: Number(stats.pending_businesses ?? 0),
        };
        const byType = stats.byType || {
          pharmacy: Number(stats.pharmacy_count ?? 0),
          general: Number(stats.general_count ?? 0),
          supermarket: Number(stats.supermarket_count ?? 0),
          retail: Number(stats.retail_count ?? 0),
        };
        const recent = Number(stats.recent ?? stats.recentBusinesses ?? 0);
        const monthlyGrowth =
          stats.monthlyGrowth || {
            current: recent,
            previous: Math.floor(recent * 0.8),
          };

        return {
          success: true,
          data: {
            totalBusinesses: total,
            activeBusinesses: Number(byStatus?.active ?? 0),
            suspendedBusinesses: Number(byStatus?.suspended ?? 0),
            pendingBusinesses: Number(byStatus?.pending ?? 0),
            pharmacyCount: Number(byType?.pharmacy ?? 0),
            generalCount: Number(byType?.general ?? 0),
            supermarketCount: Number(byType?.supermarket ?? 0),
            retailCount: Number(byType?.retail ?? 0),
            totalUsers: Number(stats.totalUsers ?? 0),
            adminCount: Number(stats.adminCount ?? 0),
            recentBusinesses: recent,
            monthlyGrowth,
          },
        };
      }
      
      // Return default stats if API fails
      return {
        success: true,
        data: {
          totalBusinesses: 0,
          activeBusinesses: 0,
          suspendedBusinesses: 0,
          pendingBusinesses: 0,
          pharmacyCount: 0,
          generalCount: 0,
          supermarketCount: 0,
          retailCount: 0,
          recentBusinesses: 0,
          monthlyGrowth: {
            current: 0,
            previous: 0
          }
        }
      };
    } catch (error) {
      console.error('Error fetching business stats:', error);
      // Return default stats on error
      return {
        success: true,
        data: {
          totalBusinesses: 0,
          activeBusinesses: 0,
          suspendedBusinesses: 0,
          pendingBusinesses: 0,
          pharmacyCount: 0,
          generalCount: 0,
          supermarketCount: 0,
          retailCount: 0,
          recentBusinesses: 0,
          monthlyGrowth: {
            current: 0,
            previous: 0
          }
        }
      };
    }
  },

  // Check if schema name is available
  async checkSchemaAvailable(schemaName: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      return await api.get<{ available: boolean }>(`/businesses/check-schema/${schemaName}`);
    } catch (error) {
      console.error('Error checking schema availability:', error);
      return { success: false, error: 'Failed to check schema availability' };
    }
  },

  // Activate business
  async activate(id: string): Promise<ApiResponse> {
    try {
      return await api.post(`/businesses/${id}/activate`);
    } catch (error) {
      console.error('Error activating business:', error);
      return { success: false, error: 'Failed to activate business' };
    }
  },

  // Suspend business
  async suspend(id: string, reason?: string): Promise<ApiResponse> {
    try {
      return await api.post(`/businesses/${id}/suspend`, { reason });
    } catch (error) {
      console.error('Error suspending business:', error);
      return { success: false, error: 'Failed to suspend business' };
    }
  },

  // Permanently delete business (super admin)
  async permanentDelete(id: string): Promise<ApiResponse> {
    try {
      return await api.delete(`/businesses/${id}/permanent`);
    } catch (error) {
      console.error('Error permanently deleting business:', error);
      return { success: false, error: 'Failed to permanently delete business' };
    }
  },

  // Permanently delete a user (super admin)
  async deleteUser(userId: string): Promise<ApiResponse> {
    try {
      return await api.delete(`/businesses/users/${userId}/permanent`);
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  },

  // Reset user password (super admin)
  async resetUserPassword(userId: string, newPassword: string): Promise<ApiResponse> {
    try {
      return await api.put(`/businesses/users/${userId}/reset-password`, { newPassword });
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  },
};