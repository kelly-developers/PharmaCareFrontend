import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '@/types/pharmacy';
import { authService } from '@/services/authService';
import { clearAuthToken } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canViewProfit: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const currentUser = authService.getCurrentUser();
        const isAuth = authService.isAuthenticated();
        
        console.log('Auth check - Token exists:', isAuth, 'User:', currentUser?.email);
        
        if (currentUser && isAuth) {
          setUser(currentUser);
        } else {
          clearAuthToken();
          setUser(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        clearAuthToken();
        setUser(null);
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
      clearAuthToken();
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
      isLoading,
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
