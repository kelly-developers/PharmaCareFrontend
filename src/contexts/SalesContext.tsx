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

// UPDATED: Helper to extract array from various response formats
function extractArray<T>(data: unknown): T[] {
  if (!data) return [];
  
  console.log('🔍 extractArray received:', data);
  
  // If it's already an array, return it
  if (Array.isArray(data)) {
    console.log('✅ Direct array found, length:', data.length);
    return data;
  }
  
  const obj = data as Record<string, unknown>;
  
  // CRITICAL FIX: Your API returns data in nested structure: data.data
  if (obj.data && Array.isArray(obj.data)) {
    console.log('✅ Found data.data array, length:', obj.data.length);
    return obj.data as T[];
  }
  
  // Handle PaginatedResponse structure
  if (obj.content && Array.isArray(obj.content)) {
    console.log('✅ Found content array, length:', obj.content.length);
    return obj.content as T[];
  }
  
  // Handle items array
  if (obj.items && Array.isArray(obj.items)) {
    console.log('✅ Found items array, length:', obj.items.length);
    return obj.items as T[];
  }
  
  // Handle direct object (single sale)
  if (obj.id) {
    console.log('✅ Single object found, wrapping in array');
    return [obj as T];
  }
  
  console.log('❌ No array found in data structure');
  console.log('Object keys:', Object.keys(obj));
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

  // Fetch all sales (for admins/managers) - SIMPLIFIED VERSION
  const fetchAllSales = useCallback(async (filters?: any) => {
    if (!isAuthenticated || !user) return [];
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getAll(filters);
      console.log('📦 API Response:', response);
      
      if (response.success && response.data) {
        // DIRECT APPROACH: Get sales directly from response.data.data
        let salesArray: Sale[] = [];
        
        // Check if response.data has a data property (nested)
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log('✅ Found nested data.data array');
          salesArray = response.data.data;
        } 
        // Check if response.data is directly an array
        else if (Array.isArray(response.data)) {
          console.log('✅ response.data is directly an array');
          salesArray = response.data;
        }
        // Try extractArray as fallback
        else {
          console.log('⚠️ Trying extractArray fallback');
          salesArray = extractArray<Sale>(response.data);
        }
        
        console.log(`✅ Extracted ${salesArray.length} sales`);
        
        // Map and set sales
        const mappedSales = salesArray.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
          // Ensure paymentMethod is lowercase for frontend consistency
          paymentMethod: sale.paymentMethod.toLowerCase() as 'cash' | 'mpesa' | 'card',
        }));
        
        setSales(mappedSales);
        console.log('📊 Sales state updated:', mappedSales.length, 'sales');
        return mappedSales;
      } else {
        console.warn('❌ Failed to fetch sales:', response.error);
        setSales([]);
        return [];
      }
    } catch (err) {
      console.error('❌ Failed to fetch sales:', err);
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

  // Fetch cashier's today sales from backend - UPDATED
  const fetchCashierTodaySales = useCallback(async (cashierId: string) => {
    if (!cashierId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getCashierTodaySales(cashierId);
      console.log('👤 Cashier today sales response:', response);
      
      if (response.success && response.data) {
        let todaySales: Sale[] = [];
        
        // Handle nested data.data structure
        if (response.data.data && Array.isArray(response.data.data)) {
          todaySales = response.data.data;
        } else {
          todaySales = extractArray<Sale>(response.data);
        }
        
        const mappedSales = todaySales.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
          paymentMethod: sale.paymentMethod.toLowerCase() as 'cash' | 'mpesa' | 'card',
        }));
        
        console.log('👤 Cashier today sales:', mappedSales.length, 'sales');
        
        // Store in state
        setCashierTodaySales(mappedSales);
        
        // Save to localStorage for persistence
        saveCashierTodaySales(cashierId, mappedSales);
        
      } else {
        console.warn('❌ API failed, trying localStorage...');
        // Try to get from localStorage if API fails
        const stored = loadStoredCashierTodaySales(cashierId);
        setCashierTodaySales(stored);
      }
    } catch (err) {
      console.error('❌ Failed to fetch today sales:', err);
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
        let todaySales: Sale[] = [];
        
        if (response.data.data && Array.isArray(response.data.data)) {
          todaySales = response.data.data;
        } else {
          todaySales = extractArray<Sale>(response.data);
        }
        
        const mappedSales = todaySales.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
          paymentMethod: sale.paymentMethod.toLowerCase() as 'cash' | 'mpesa' | 'card',
        }));
        
        // Store in state
        setCashierTodaySales(mappedSales);
        
        // Save to localStorage for persistence
        saveCashierTodaySales(cashierId, mappedSales);
        
        return mappedSales;
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
      console.log('🚀 Initializing sales for user:', user.role, user.id);
      
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
        
        console.log('➕ New sale added:', newSale);
        
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
    console.log('📊 getAllSales returning:', sales.length, 'sales');
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