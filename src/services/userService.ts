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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UserStats {
  totalUsersCount: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  adminUsersCount: number;
  managerUsersCount: number;
  pharmacistUsersCount: number;
  cashierUsersCount: number;
}

export const userService = {
  // Get all users (paginated)
  async getAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: UserRole
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (search) queryParams.append('search', search);
    if (role) queryParams.append('role', role);
    
    return api.get<PaginatedResponse<User>>(`/users?${queryParams.toString()}`);
  },

  // Get user by ID
  async getById(id: string): Promise<ApiResponse<User>> {
    return api.get<User>(`/users/${id}`);
  },

  // Create user
  async create(user: CreateUserRequest): Promise<ApiResponse<User>> {
    // Backend expects role in uppercase
    const userData = {
      ...user,
      role: user.role.toUpperCase() as UserRole
    };
    return api.post<User>('/users', userData);
  },

  // Update user
  async update(id: string, updates: UpdateUserRequest): Promise<ApiResponse<User>> {
    // Convert role to uppercase if provided
    const updateData = {
      ...updates,
      ...(updates.role && { role: updates.role.toUpperCase() })
    };
    return api.put<User>(`/users/${id}`, updateData);
  },

  // Delete/deactivate user
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

  // Get users by role
  async getByRole(
    role: UserRole, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return api.get<PaginatedResponse<User>>(`/users/role/${role}?page=${page}&limit=${limit}`);
  },

  // Get user statistics
  async getStats(): Promise<ApiResponse<UserStats>> {
    return api.get<UserStats>('/users/stats');
  },
};

// Export employee-like functions that map to users (since users are employees)
export const employeeService = {
  async getAll(status?: 'active' | 'inactive'): Promise<ApiResponse<User[]>> {
    const response = await userService.getAll(1, 1000);
    if (response.success && response.data) {
      let users = response.data.data || [];
      if (status === 'active') {
        users = users.filter(u => u.isActive);
      } else if (status === 'inactive') {
        users = users.filter(u => !u.isActive);
      }
      return { success: true, data: users };
    }
    return { success: false, error: response.error, data: [] };
  },

  async getById(id: string): Promise<ApiResponse<User>> {
    return userService.getById(id);
  },

  async create(employee: CreateUserRequest): Promise<ApiResponse<User>> {
    return userService.create(employee);
  },

  async update(id: string, updates: UpdateUserRequest): Promise<ApiResponse<User>> {
    return userService.update(id, updates);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return userService.delete(id);
  },

  async deactivate(id: string): Promise<ApiResponse<User>> {
    return userService.delete(id) as unknown as Promise<ApiResponse<User>>;
  },

  async reactivate(id: string): Promise<ApiResponse<User>> {
    return userService.activate(id);
  },
};