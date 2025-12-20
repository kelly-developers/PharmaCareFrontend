import { api, setAuthToken, clearAuthToken } from './api';
import { User, UserRole } from '@/types/pharmacy';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export const authService = {
  // Login user
  async login(credentials: LoginRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      setAuthToken(response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.error };
  },

  // Register new user
  async register(userData: RegisterRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/register', userData);
    
    if (response.success && response.data) {
      setAuthToken(response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.error };
  },

  // Logout user
  async logout(): Promise<void> {
    await api.post('/auth/logout');
    clearAuthToken();
  },

  // Get current user from session
  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!sessionStorage.getItem('auth_token');
  },

  // Refresh token
  async refreshToken(): Promise<boolean> {
    const response = await api.post<{ token: string }>('/auth/refresh');
    if (response.success && response.data) {
      setAuthToken(response.data.token);
      return true;
    }
    return false;
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return { success: response.success, error: response.error };
  },
};
