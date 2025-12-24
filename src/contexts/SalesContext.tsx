import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Sale } from '@/types/pharmacy';
import { salesService } from '@/services/salesService';
import { useAuth } from './AuthContext';
import { isToday, startOfTomorrow } from 'date-fns';

interface SalesContextType {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  getSalesByCashier: (cashierId: string) => Sale[];
  getTodaySales: (cashierId?: string) => Promise<Sale[]>;
  getAllSales: () => Sale[];
  refreshSales: () => Promise<void>;
  resetTodaySales: () => Promise<void>;
  isResetting: boolean;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

// Helper to extract array from various response formats
function extractArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  const obj = data as Record<string, unknown>;
  if (obj.content && Array.isArray(obj.content)) return obj.content;
  if (obj.data && Array.isArray(obj.data)) return obj.data;
  if (obj.items && Array.isArray(obj.items)) return obj.items;
  
  return [];
}

// Check if it's a new day (after midnight)
const isNewDay = (lastResetCheck: Date | null): boolean => {
  if (!lastResetCheck) return true;
  
  const now = new Date();
  const lastCheckDate = new Date(lastResetCheck);
  
  return !isToday(lastCheckDate);
};

export function SalesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [lastResetCheck, setLastResetCheck] = useState<Date | null>(null);

  // Check for day change and reset if needed
  const checkAndResetForNewDay = useCallback(async () => {
    if (!user?.id || isResetting) return;
    
    if (isNewDay(lastResetCheck)) {
      console.log('New day detected, resetting sales view...');
      await resetTodaySales();
      setLastResetCheck(new Date());
    }
  }, [user?.id, isResetting, lastResetCheck]);

  // Set up periodic day change check
  useEffect(() => {
    if (!user?.id) return;
    
    // Initial check
    checkAndResetForNewDay();
    
    // Check every minute
    const interval = setInterval(checkAndResetForNewDay, 60000);
    
    return () => clearInterval(interval);
  }, [user?.id, checkAndResetForNewDay]);

  // Set up midnight auto-reset
  useEffect(() => {
    if (!user?.id) return;
    
    const now = new Date();
    const tomorrow = startOfTomorrow();
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(async () => {
      console.log('Midnight reached, auto-resetting sales...');
      await resetTodaySales();
      setLastResetCheck(new Date());
    }, timeUntilMidnight + 1000);
    
    return () => clearTimeout(midnightTimeout);
  }, [user?.id]);

  // Fetch all sales from backend
  const refreshSales = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getAll();
      if (response.success && response.data) {
        const salesArray = extractArray<Sale>(response.data);
        setSales(salesArray.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        })));
      } else {
        console.warn('Failed to fetch sales:', response.error);
        setSales([]);
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      setError('Failed to load sales data');
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Only fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshSales();
    } else {
      // Don't clear sales when logging out - they stay in context
      // The filtering happens in getTodaySales() method
    }
  }, [isAuthenticated, refreshSales]);

  // Add a new sale
  const addSale = async (saleData: Omit<Sale, 'id'>): Promise<Sale | null> => {
    try {
      const response = await salesService.create({
        items: saleData.items,
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        tax: saleData.tax,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        cashierId: saleData.cashierId,
        cashierName: saleData.cashierName,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
      });
      
      if (response.success && response.data) {
        const newSale = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
        };
        setSales(prev => [newSale, ...prev]);
        return newSale;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Get sales by cashier (from local state)
  const getSalesByCashier = (cashierId: string) => {
    return sales.filter(sale => sale.cashierId === cashierId);
  };

  // Get today's sales - ALWAYS fetches from backend for accurate daily data
  const getTodaySales = async (cashierId?: string): Promise<Sale[]> => {
    if (cashierId) {
      try {
        const response = await salesService.getTodaySales(cashierId);
        if (response.success && response.data) {
          // Handle both { sales: [] } and direct array
          const responseData = response.data as unknown as Record<string, unknown>;
          const salesData = (responseData.sales as Sale[]) || [];
          if (Array.isArray(salesData)) {
            return salesData.map(sale => ({
              ...sale,
              createdAt: new Date(sale.createdAt),
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch today sales from API:', err);
        // Fallback to filtering from local state
      }
    }
    
    // Fallback: Filter from local state by today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      const isTodaySale = saleDate.getTime() === today.getTime();
      const matchesCashier = !cashierId || sale.cashierId === cashierId;
      return isTodaySale && matchesCashier;
    });
  };

  // Get all sales
  const getAllSales = () => {
    return sales;
  };

  // Reset today's sales by calling backend API
  const resetTodaySales = async (): Promise<void> => {
    if (!user?.id) return;
    
    setIsResetting(true);
    try {
      // Call backend API to reset daily sales for this cashier
      await salesService.resetDailySales(user.id);
      console.log('Daily sales reset on backend for cashier:', user.id);
      
      // Refresh sales data to get updated list
      await refreshSales();
    } catch (error) {
      console.error('Failed to reset daily sales:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SalesContext.Provider value={{
      sales,
      isLoading,
      error,
      addSale,
      getSalesByCashier,
      getTodaySales,
      getAllSales,
      refreshSales,
      resetTodaySales,
      isResetting,
    }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}