import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '@/types/pharmacy';
import { Business, BusinessType } from '@/types/business';
import { authService } from '@/services/authService';
import { clearAuthToken } from '@/services/api';

interface ExtendedUser extends User {
  businessId?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  business: Business | null;
  businessType: BusinessType;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canViewProfit: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const businessType: BusinessType = business?.businessType || 'pharmacy';
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const currentUser = authService.getCurrentUser();
        const currentBusiness = authService.getCurrentBusiness();
        const isAuth = authService.isAuthenticated();
        
        console.log('Auth check - Token exists:', isAuth, 'User:', currentUser?.email);
        
        if (currentUser && isAuth) {
          setUser(currentUser);
          setBusiness(currentBusiness);
        } else {
          clearAuthToken();
          setUser(null);
          setBusiness(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        clearAuthToken();
        setUser(null);
        setBusiness(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.login({ email, password });
      
      console.log('Login API Response:', response);
      
      if (response.success && response.user) {
        setUser(response.user);
        setBusiness(response.business || null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Continue with local logout even if API fails
    } finally {
      setUser(null);
      setBusiness(null);
      clearAuthToken();
      sessionStorage.removeItem('current_business');
    }
  }, []);

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const canViewProfit = useCallback((): boolean => {
    if (!user) return false;
    return ['admin', 'manager'].includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      business,
      businessType,
      isLoading,
      isSuperAdmin,
      login, 
      logout, 
      isAuthenticated: !!user,
      hasRole,
      canViewProfit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
