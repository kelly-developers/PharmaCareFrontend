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
  refreshCashierTodaySales: (cashierId: string) => Promise<Sale[]>;
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

export function SalesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashierTodaySales, setCashierTodaySales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

// In your SalesContext, update the fetchCashierTodaySales function:

const fetchCashierTodaySales = useCallback(async (cashierId: string) => {
  if (!cashierId) return;
  
  setIsLoading(true);
  setError(null);
  try {
    const response = await salesService.getCashierTodaySales(cashierId);
    console.log('👤 Cashier today sales response:', response);
    
    if (response.success && response.data) {
      // Handle both possible response structures
      let todaySales: Sale[] = [];
      
      if (response.data.sales && Array.isArray(response.data.sales)) {
        todaySales = response.data.sales;
      } else if (Array.isArray(response.data)) {
        todaySales = response.data;
      }
      
      console.log('👤 Extracted sales:', todaySales.length);
      
      // Transform to frontend Sale type - cast to any to handle backend snake_case
      const transformedSales: Sale[] = todaySales.map((sale: any) => ({
        id: sale.id,
        cashierId: sale.cashierId || sale.cashier_id || '',
        cashierName: sale.cashierName || sale.cashier_name || 'Unknown',
        total: sale.total || sale.finalAmount || sale.final_amount || 0,
        subtotal: sale.subtotal || sale.totalAmount || sale.total_amount || 0,
        discount: sale.discount || 0,
        tax: 0,
        paymentMethod: (sale.paymentMethod || sale.payment_method || 'cash').toLowerCase() as 'cash' | 'mpesa' | 'card',
        customerName: sale.customerName || sale.customer_name || 'Walk-in',
        customerPhone: sale.customerPhone || sale.customer_phone || '',
        notes: sale.notes || '',
        createdAt: new Date(sale.createdAt || sale.created_at || new Date()),
        items: (sale.items || []).map((item: any) => ({
          medicineId: item.medicineId || item.medicine_id || '',
          medicineName: item.medicineName || item.medicine_name || '',
          quantity: item.quantity || 0,
          unitType: item.unitType || item.unit_type || '',
          unitPrice: item.unitPrice || item.unit_price || 0,
          costPrice: item.costPrice || item.cost_price || 0,
          totalPrice: item.subtotal || item.totalPrice || 0,
        }))
      }));
      
      console.log('👤 Transformed sales for frontend:', transformedSales.length);
      
      setCashierTodaySales(transformedSales);
    }
  } catch (err) {
    console.error('❌ Failed to fetch today sales:', err);
    // On error, keep current state (don't use localStorage fallback)
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
        
        const data = response.data as any;
        if (data.data && Array.isArray(data.data)) {
          todaySales = data.data;
        } else if (data.sales && Array.isArray(data.sales)) {
          todaySales = data.sales;
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
        // For cashiers, fetch their today sales from backend
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

  // Add a new sale to local state (used after API call succeeds)
  const addSale = async (sale: Sale): Promise<Sale | null> => {
    try {
      console.log('➕ Adding sale to local state:', sale);
      
      const newSale = {
        ...sale,
        createdAt: new Date(sale.createdAt),
      };
      
      // Update all sales state
      setSales(prev => [newSale, ...prev]);
      
      // Check if this sale is from today
      const saleDate = new Date(newSale.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      saleDate.setHours(0, 0, 0, 0);
      
      // If this is the current cashier's sale from today, add to today sales
      if (user && user.id === sale.cashierId && saleDate.getTime() === today.getTime()) {
        setCashierTodaySales(prev => [newSale, ...prev]);
      }
      
      return newSale;
    } catch (error) {
      console.error('Error adding sale to state:', error);
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