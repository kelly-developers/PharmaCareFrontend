import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Sale } from '@/types/pharmacy';
import { salesService } from '@/services/salesService';
import { useAuth } from './AuthContext';

interface SalesContextType {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  getSalesByCashier: (cashierId: string) => Sale[];
  getTodaySales: (cashierId?: string) => Promise<Sale[]>;
  getAllSales: () => Sale[];
  refreshSales: () => Promise<void>;
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

export function SalesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sales
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
      setSales([]);
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

  // Get today's sales
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
        console.error('Failed to fetch today sales:', err);
      }
    }
    
    // Filter from local state
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      const isToday = saleDate.getTime() === today.getTime();
      const matchesCashier = !cashierId || sale.cashierId === cashierId;
      return isToday && matchesCashier;
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
      addSale,
      getSalesByCashier,
      getTodaySales,
      getAllSales,
      refreshSales,
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
