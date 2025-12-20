import { api, ApiResponse } from './api';
import { User, UserRole } from '@/types/pharmacy';

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  avatar?: string;
}

export const userService = {
  // Get all users
  async getAll(role?: UserRole): Promise<ApiResponse<User[]>> {
    const query = role ? `?role=${role}` : '';
    return api.get<User[]>(`/users${query}`);
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

  // Delete user
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/users/${id}`);
  },

  // Update user role
  async updateRole(id: string, role: UserRole): Promise<ApiResponse<User>> {
    return api.patch<User>(`/users/${id}/role`, { role });
  },

  // Upload avatar
  async uploadAvatar(id: string, file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'}/users/${id}/avatar`, {
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
