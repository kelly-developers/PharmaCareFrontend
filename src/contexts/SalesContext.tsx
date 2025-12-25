import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Sale } from '@/types/pharmacy';
import { salesService } from '@/services/salesService';
import { useAuth } from './AuthContext';
import { isToday, startOfTomorrow, isSameDay } from 'date-fns';

interface SalesContextType {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  cashierTodaySales: Sale[];
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  getSalesByCashier: (cashierId: string) => Sale[];
  getTodaySales: (cashierId?: string) => Promise<Sale[]>;
  getAllSales: () => Sale[];
  refreshSales: () => Promise<void>;
  fetchCashierTodaySales: (cashierId: string) => Promise<void>;
  refreshCashierTodaySales: (cashierId: string) => Promise<void>;
  fetchAllSales: (filters?: any) => Promise<Sale[]>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

// Helper to extract array from various response formats
function extractArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  const obj = data as Record<string, unknown>;
  
  // Handle PaginatedResponse structure
  if (obj.content && Array.isArray(obj.content)) return obj.content;
  // Handle regular array
  if (obj.data && Array.isArray(obj.data)) return obj.data;
  // Handle direct array
  if (Array.isArray(obj)) return obj;
  
  return [];
}

// Get localStorage key for cashier's today sales
const getStorageKey = (cashierId: string) => `cashier_${cashierId}_today_sales_${new Date().toISOString().split('T')[0]}`;

// Get midnight timestamp
const getMidnightTimestamp = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  return midnight.getTime();
};

export function SalesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashierTodaySales, setCashierTodaySales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cashier's today sales from localStorage
  const loadStoredCashierTodaySales = (cashierId: string): Sale[] => {
    try {
      const stored = localStorage.getItem(getStorageKey(cashierId));
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data is still valid (same day)
        if (data.expiresAt > Date.now() && data.cashierId === cashierId) {
          return data.sales.map((sale: any) => ({
            ...sale,
            createdAt: new Date(sale.createdAt),
          }));
        } else {
          // Clear expired data
          localStorage.removeItem(getStorageKey(cashierId));
        }
      }
    } catch (err) {
      console.error('Error reading stored sales:', err);
    }
    return [];
  };

  // Save cashier's today sales to localStorage
  const saveCashierTodaySales = (cashierId: string, salesData: Sale[]) => {
    try {
      const storageData = {
        sales: salesData,
        expiresAt: getMidnightTimestamp(),
        cashierId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(getStorageKey(cashierId), JSON.stringify(storageData));
    } catch (err) {
      console.error('Error saving sales to localStorage:', err);
    }
  };

  // Fetch all sales (for admins/managers)
  const fetchAllSales = useCallback(async (filters?: any) => {
    if (!isAuthenticated || !user) return [];
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getAll(filters);
      console.log('Sales API Response:', response);
      
      if (response.success && response.data) {
        // Extract sales from the response structure
        const salesArray = extractArray<Sale>(response.data);
        console.log('Extracted sales:', salesArray.length);
        
        // Map and set sales
        const mappedSales = salesArray.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        }));
        
        setSales(mappedSales);
        return mappedSales;
      } else {
        console.warn('Failed to fetch sales:', response.error);
        setSales([]);
        return [];
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      setSales([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Refresh all sales (alias for fetchAllSales)
  const refreshSales = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    // Only fetch all sales for admins/managers
    if (user.role === 'admin' || user.role === 'manager') {
      await fetchAllSales();
    }
  }, [isAuthenticated, user, fetchAllSales]);

  // Fetch cashier's today sales from backend
  const fetchCashierTodaySales = useCallback(async (cashierId: string) => {
    if (!cashierId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getCashierTodaySales(cashierId);
      console.log('Cashier today sales response:', response);
      
      if (response.success && response.data) {
        const todaySales = extractArray<Sale>(response.data).map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        }));
        
        console.log('Cashier today sales:', todaySales);
        
        // Store in state
        setCashierTodaySales(todaySales);
        
        // Save to localStorage for persistence
        saveCashierTodaySales(cashierId, todaySales);
        
      } else {
        console.warn('API failed, trying localStorage...');
        // Try to get from localStorage if API fails
        const stored = loadStoredCashierTodaySales(cashierId);
        setCashierTodaySales(stored);
      }
    } catch (err) {
      console.error('Failed to fetch today sales:', err);
      // Fallback to localStorage
      const stored = loadStoredCashierTodaySales(cashierId);
      setCashierTodaySales(stored);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh cashier's today sales (force update from backend)
  const refreshCashierTodaySales = async (cashierId: string) => {
    if (!cashierId) return [];
    
    setIsLoading(true);
    try {
      const response = await salesService.getCashierTodaySales(cashierId);
      if (response.success && response.data) {
        const todaySales = extractArray<Sale>(response.data).map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        }));
        
        // Store in state
        setCashierTodaySales(todaySales);
        
        // Save to localStorage for persistence
        saveCashierTodaySales(cashierId, todaySales);
        
        return todaySales;
      }
    } catch (err) {
      console.error('Failed to refresh today sales:', err);
    } finally {
      setIsLoading(false);
    }
    return [];
  };

  // Initialize based on user role
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Initializing sales for user:', user.role, user.id);
      
      if (user.role === 'cashier') {
        // For cashiers, load their today sales from localStorage first
        const storedSales = loadStoredCashierTodaySales(user.id);
        setCashierTodaySales(storedSales);
        
        // Then fetch from backend to get latest
        fetchCashierTodaySales(user.id);
      } else if (user.role === 'admin' || user.role === 'manager') {
        // For admins/managers, fetch all sales
        fetchAllSales();
      }
    } else {
      // Reset sales when logging out
      setSales([]);
      setCashierTodaySales([]);
    }
  }, [isAuthenticated, user, fetchAllSales, fetchCashierTodaySales]);

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
        
        console.log('New sale added:', newSale);
        
        // Update both states
        setSales(prev => [newSale, ...prev]);
        
        // Check if this sale is from today
        const saleDate = new Date(newSale.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        saleDate.setHours(0, 0, 0, 0);
        
        // If this is the current cashier's sale from today, add to today sales
        if (user && user.id === saleData.cashierId && saleDate.getTime() === today.getTime()) {
          setCashierTodaySales(prev => [newSale, ...prev]);
          
          // Update localStorage
          saveCashierTodaySales(user.id, [newSale, ...cashierTodaySales]);
        }
        
        return newSale;
      }
      return null;
    } catch (error) {
      console.error('Error adding sale:', error);
      return null;
    }
  };

  // Get sales by cashier (from local state)
  const getSalesByCashier = (cashierId: string) => {
    return sales.filter(sale => sale.cashierId === cashierId);
  };

  // Get today's sales - Uses stored cashierTodaySales for cashiers
  const getTodaySales = async (cashierId?: string): Promise<Sale[]> => {
    if (cashierId && user && user.id === cashierId) {
      // For current cashier, return from cashierTodaySales state
      return cashierTodaySales;
    }
    
    // For others or no cashierId specified, filter from all sales
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

  return (
    <SalesContext.Provider value={{
      sales,
      isLoading,
      error,
      cashierTodaySales,
      addSale,
      getSalesByCashier,
      getTodaySales,
      getAllSales,
      refreshSales,
      fetchCashierTodaySales,
      refreshCashierTodaySales,
      fetchAllSales,
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