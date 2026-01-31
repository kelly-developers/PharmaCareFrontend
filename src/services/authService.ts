import { api, setAuthToken, clearAuthToken } from './api';
import { User, UserRole } from '@/types/pharmacy';
import { Business } from '@/types/business';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User & { businessId?: string };
  token: string;
  refreshToken?: string;
  business?: Business;
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
  // SUPER_ADMIN from API maps to admin role for UI purposes
  if (role === 'super_admin' || role === 'superadmin') return 'admin';
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  if (role === 'pharmacist') return 'pharmacist';
  if (role === 'cashier') return 'cashier';
  // common aliases
  if (role === 'pharmacy') return 'pharmacist';
  if (role === 'sales' || role === 'seller') return 'cashier';
  return 'cashier';
};

// Check if user is super admin based on API response
const checkIsSuperAdmin = (raw: any): boolean => {
  // Check explicit isSuperAdmin flag from API
  if (raw?.isSuperAdmin === true) return true;
  // Check role from API
  const role = String(raw?.role ?? '').trim().toLowerCase();
  return role === 'super_admin' || role === 'superadmin';
};

const normalizeUser = (raw: any): User & { businessId?: string; isSuperAdmin?: boolean } => {
  const email = String(raw?.email ?? '').trim();
  const fallbackName = email ? email.split('@')[0] : 'User';

  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    name: String(raw?.name ?? raw?.fullName ?? raw?.username ?? fallbackName),
    email,
    role: normalizeRole(raw?.role),
    avatar: raw?.avatar,
    isActive: raw?.isActive ?? raw?.active ?? true,
    createdAt: (raw?.createdAt ?? new Date()) as any,
    businessId: raw?.businessId ?? raw?.business_id,
    isSuperAdmin: checkIsSuperAdmin(raw),
  };
};

const normalizeBusiness = (raw: any): Business | null => {
  if (!raw) return null;
  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    name: String(raw?.name ?? ''),
    email: String(raw?.email ?? ''),
    phone: String(raw?.phone ?? ''),
    businessType: raw?.businessType ?? 'pharmacy',
    schemaName: String(raw?.schemaName ?? ''),
    address: raw?.address,
    city: raw?.city,
    country: raw?.country,
    logo: raw?.logo,
    subscriptionPlan: raw?.subscriptionPlan,
    status: raw?.status ?? 'active',
    createdAt: new Date(raw?.createdAt ?? Date.now()),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : undefined,
    ownerId: raw?.ownerId,
  };
};

export const authService = {
  // Login user - Returns user and business context
  async login(credentials: LoginRequest): Promise<{ success: boolean; user?: User & { businessId?: string }; business?: Business | null; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    console.log('Login API Response:', response);

    if (response.success && response.data) {
      const { user: rawUser, token, business: rawBusiness } = response.data as any;
      const user = normalizeUser(rawUser);
      const business = normalizeBusiness(rawBusiness);

      if (token) {
        setAuthToken(token);
        sessionStorage.setItem('user', JSON.stringify(user));
        
        // Store business context for multi-tenant routing
        if (business) {
          sessionStorage.setItem('current_business', JSON.stringify(business));
        }
        
        console.log('✅ Token saved:', token.substring(0, 20) + '...');
        return { success: true, user, business };
      }
    }

    console.log('❌ Login failed:', response.error);
    return { success: false, error: response.error || 'Login failed' };
  },

  // Register new user
  async register(userData: RegisterRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await api.post<LoginResponse>('/auth/register', userData);

    if (response.success && response.data) {
      const { user: rawUser, token, business: rawBusiness } = response.data as any;
      const user = normalizeUser(rawUser);
      const business = normalizeBusiness(rawBusiness);
      
      setAuthToken(token);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      if (business) {
        sessionStorage.setItem('current_business', JSON.stringify(business));
      }
      
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
      sessionStorage.removeItem('current_business');
    }
  },

  // Get current user from session
  getCurrentUser(): (User & { businessId?: string; isSuperAdmin?: boolean }) | null {
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

  // Get current business from session
  getCurrentBusiness(): Business | null {
    const businessStr = sessionStorage.getItem('current_business');
    if (businessStr) {
      try {
        return JSON.parse(businessStr);
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
    console.log('Auth check - Token exists:', hasToken);
    return hasToken;
  },

  // Check if user is super admin
  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isSuperAdmin ?? false;
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