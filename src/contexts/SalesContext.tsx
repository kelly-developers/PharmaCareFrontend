import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Sale } from '@/types/pharmacy';
import { salesService } from '@/services/salesService';

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

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sales on mount
  const refreshSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await salesService.getAll();
      if (response.success && response.data) {
        setSales(response.data.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        })));
      } else {
        setError(response.error || 'Failed to fetch sales');
      }
    } catch (err) {
      setError('Failed to fetch sales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSales();
  }, [refreshSales]);

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

  // Get today's sales from backend
  const getTodaySales = async (cashierId?: string): Promise<Sale[]> => {
    if (cashierId) {
      const response = await salesService.getTodaySales(cashierId);
      if (response.success && response.data) {
        return response.data.sales.map(sale => ({
          ...sale,
          createdAt: new Date(sale.createdAt),
        }));
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
