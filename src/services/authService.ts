import { api, setAuthToken, clearAuthToken } from './api';
import { User, UserRole } from '@/types/pharmacy';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

const normalizeRole = (rawRole: unknown): UserRole => {
  const role = String(rawRole ?? '').trim().toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  if (role === 'pharmacist') return 'pharmacist';
  if (role === 'cashier') return 'cashier';
  // common aliases
  if (role === 'pharmacy') return 'pharmacist';
  if (role === 'sales' || role === 'seller') return 'cashier';
  return 'cashier';
};

const normalizeUser = (raw: any): User => {
  const email = String(raw?.email ?? '').trim();
  const fallbackName = email ? email.split('@')[0] : 'User';

  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    name: String(raw?.name ?? raw?.fullName ?? raw?.username ?? fallbackName),
    email,
    role: normalizeRole(raw?.role),
    avatar: raw?.avatar,
    isActive: raw?.isActive ?? true,
    createdAt: (raw?.createdAt ?? new Date()) as any,
  };
};

export const authService = {
  // Login user - UPDATED to handle new response structure
  async login(credentials: LoginRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    console.log('Login API Response:', response); // Debug

    // FIX: Check response.data (which contains the actual auth data)
    if (response.success && response.data) {
      // response.data is now the AuthResponse {user, token, refreshToken}
      const { user: rawUser, token } = response.data as any;
      const user = normalizeUser(rawUser);

      if (token) {
        setAuthToken(token);
        sessionStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Token saved:', token.substring(0, 20) + '...'); // Debug
        return { success: true, user };
      }
    }

    console.log('❌ Login failed:', response.error); // Debug
    return { success: false, error: response.error || 'Login failed' };
  },

  // Register new user - UPDATED
  async register(userData: RegisterRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/register', userData);

    if (response.success && response.data) {
      const { user: rawUser, token } = response.data as any;
      const user = normalizeUser(rawUser);
      setAuthToken(token);
      sessionStorage.setItem('user', JSON.stringify(user));
      return { success: true, user };
    }

    return { success: false, error: response.error };
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthToken();
    }
  },

  // Get current user from session
  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        return normalizeUser(parsed);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = sessionStorage.getItem('auth_token');
    const hasToken = !!token;
    console.log('Auth check - Token exists:', hasToken); // Debug
    return hasToken;
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