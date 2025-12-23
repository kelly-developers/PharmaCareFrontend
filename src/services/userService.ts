import { api, ApiResponse } from './api';
import { User, UserRole } from '@/types/pharmacy';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

export const userService = {
  // Get all users with pagination
  async getAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: UserRole
  ): Promise<ApiResponse<{ users: User[]; total: number; page: number; pages: number }>> {
    let query = `?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (role) query += `&role=${role}`;
    
    return api.get<{ users: User[]; total: number; page: number; pages: number }>(`/users${query}`);
  },

  // Get user by ID
  async getById(id: string): Promise<ApiResponse<User>> {
    return api.get<User>(`/users/${id}`);
  },

  // Create new user
  async create(user: CreateUserRequest): Promise<ApiResponse<User>> {
    return api.post<User>('/users', user);
  },

  // Update user
  async update(id: string, updates: UpdateUserRequest): Promise<ApiResponse<User>> {
    return api.put<User>(`/users/${id}`, updates);
  },

  // Delete user (deactivate)
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/users/${id}`);
  },

  // Activate user
  async activate(id: string): Promise<ApiResponse<User>> {
    return api.patch<User>(`/users/${id}/activate`, {});
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse<User>> {
    return api.get<User>('/users/profile');
  },

  // Update current user profile
  async updateProfile(updates: UpdateUserRequest): Promise<ApiResponse<User>> {
    return api.put<User>('/users/profile', updates);
  },

  // Get user stats
  async getStats(): Promise<ApiResponse<{
    totalUsersCount: number;
    adminUsersCount: number;
    managerUsersCount: number;
    pharmacistUsersCount: number;
    cashierUsersCount: number;
  }>> {
    return api.get('/users/stats');
  },

  // Get users by role
  async getByRole(role: UserRole, page: number = 1, limit: number = 20): Promise<ApiResponse<{
    users: User[];
    total: number;
    page: number;
    pages: number;
  }>> {
    return api.get(`/users/role/${role}?page=${page}&limit=${limit}`);
  },
};