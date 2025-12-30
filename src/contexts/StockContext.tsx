import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Medicine, StockMovement, UnitType, UserRole } from '@/types/pharmacy';
import { medicineService } from '@/services/medicineService';
import { stockService } from '@/services/stockService';
import { useAuth } from './AuthContext';

interface StockItem {
  medicineId: string;
  name: string;
  openingStock: number;
  currentStock: number;
  sold: number;
  purchased: number;
}

interface MonthlyStock {
  month: string;
  openingStock: StockItem[];
  closingStock: StockItem[];
  uploadedAt?: string;
}

interface StockContextType {
  medicines: Medicine[];
  monthlyStocks: MonthlyStock[];
  stockMovements: StockMovement[];
  isLoading: boolean;
  error: string | null;
  deductStock: (medicineId: string, quantity: number, unitType: UnitType, referenceId: string, performedBy: string, performedByRole: UserRole) => Promise<void>;
  addStock: (medicineId: string, quantity: number, referenceId: string, performedBy: string, performedByRole: UserRole) => Promise<void>;
  recordStockLoss: (medicineId: string, quantity: number, reason: string, performedBy: string, performedByRole: UserRole) => Promise<void>;
  recordStockAdjustment: (medicineId: string, quantity: number, reason: string, performedBy: string, performedByRole: UserRole) => Promise<void>;
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Medicine | null>;
  uploadOpeningStock: (month: string, items: StockItem[]) => Promise<void>;
  uploadClosingStock: (month: string, items: StockItem[]) => Promise<void>;
  getStockComparison: (month: string) => { item: StockItem; expected: number; actual: number; variance: number }[];
  getMedicineStock: (medicineId: string) => number;
  getMedicineMovements: (medicineId: string) => StockMovement[];
  getStockAuditReport: () => { medicineId: string; medicineName: string; totalSold: number; totalLost: number; totalAdjusted: number; currentStock: number }[];
  refreshMedicines: () => Promise<void>;
  refreshMovements: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

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

export function StockProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [monthlyStocks, setMonthlyStocks] = useState<MonthlyStock[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch medicines from backend
  const refreshMedicines = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await medicineService.getAll();
      if (response.success && response.data) {
        const medicinesArray = extractArray<Medicine>(response.data);
        console.log('📊 Fetched medicines:', medicinesArray.length);
        
        // Transform the data to match frontend types
        const transformedMedicines = medicinesArray.map(med => ({
          ...med,
          // Ensure dates are properly converted
          expiryDate: new Date(med.expiryDate),
          createdAt: new Date(med.createdAt || new Date()),
          updatedAt: new Date(med.updatedAt || new Date()),
          // Ensure units exist
          units: med.units || [],
          // Ensure numeric fields are numbers
          stockQuantity: Number(med.stockQuantity) || 0,
          reorderLevel: Number(med.reorderLevel) || 50,
          costPrice: Number(med.costPrice) || 0,
        }));
        
        setMedicines(transformedMedicines);
      } else {
        console.warn('Failed to fetch medicines:', response.error);
        setMedicines([]);
      }
    } catch (err) {
      console.error('Failed to fetch medicines:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch medicines');
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch stock movements from backend
  const refreshMovements = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await stockService.getMovements();
      console.log('📊 Stock Movements Response:', response);
      
      if (response.success && response.data) {
        const movementsArray = extractArray<StockMovement>(response.data);
        setStockMovements(movementsArray.map(mov => ({
          ...mov,
          createdAt: new Date(mov.createdAt),
        })));
      } else {
        console.warn('No data in stock movements response');
        setStockMovements([]);
      }
    } catch (err) {
      console.error('Failed to fetch stock movements:', err);
      setStockMovements([]);
    }
  }, [isAuthenticated]);

  // Fetch monthly stocks
  const refreshMonthlyStocks = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await stockService.getMonthlyStock();
      console.log('📅 Monthly Stocks Response:', response);
      
      if (response.success && response.data) {
        const monthlyArray = extractArray<MonthlyStock>(response.data);
        setMonthlyStocks(monthlyArray);
      } else {
        console.warn('No data in monthly stocks response');
        setMonthlyStocks([]);
      }
    } catch (err) {
      console.error('Failed to fetch monthly stocks:', err);
      setMonthlyStocks([]);
    }
  }, [isAuthenticated]);

  // Only fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshMedicines();
      refreshMovements();
      refreshMonthlyStocks();
    } else {
      // Clear data when not authenticated
      setMedicines([]);
      setStockMovements([]);
      setMonthlyStocks([]);
    }
  }, [isAuthenticated, refreshMedicines, refreshMovements, refreshMonthlyStocks]);

  // Deduct stock when a sale is made
  const deductStock = async (
    medicineId: string, 
    quantity: number, 
    unitType: UnitType,
    referenceId: string,
    performedBy: string,
    performedByRole: UserRole
  ) => {
    try {
      const response = await medicineService.deductStock(medicineId, quantity, unitType, referenceId, performedBy, performedByRole);
      
      if (response.success) {
        setMedicines(prev => prev.map(med => {
          if (med.id === medicineId) {
            const unit = med.units?.find(u => u.type === unitType);
            const actualQty = unit ? quantity * unit.quantity : quantity;
            return {
              ...med,
              stockQuantity: Math.max(0, med.stockQuantity - actualQty),
            };
          }
          return med;
        }));
        
        await refreshMovements();
      }
    } catch (err) {
      console.error('Failed to deduct stock:', err);
    }
  };

  // Add stock (for purchases)
  const addStock = async (
    medicineId: string, 
    quantity: number,
    referenceId: string,
    performedBy: string,
    performedByRole: UserRole
  ) => {
    try {
      const response = await medicineService.addStock(medicineId, quantity, referenceId, performedBy, performedByRole);
      
      if (response.success) {
        setMedicines(prev => prev.map(med => {
          if (med.id === medicineId) {
            return {
              ...med,
              stockQuantity: med.stockQuantity + quantity,
            };
          }
          return med;
        }));
        
        await refreshMovements();
      }
    } catch (err) {
      console.error('Failed to add stock:', err);
    }
  };

  // Record stock loss
  const recordStockLoss = async (
    medicineId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    performedByRole: UserRole
  ) => {
    try {
      await stockService.recordLoss({
        medicineId,
        quantity,
        reason,
        performedBy,
        performedByRole,
      });
      
      setMedicines(prev => prev.map(med => {
        if (med.id === medicineId) {
          return {
            ...med,
            stockQuantity: Math.max(0, med.stockQuantity - quantity),
          };
        }
        return med;
      }));
      
      await refreshMovements();
    } catch (err) {
      console.error('Failed to record stock loss:', err);
    }
  };

  // Record stock adjustment
  const recordStockAdjustment = async (
    medicineId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    performedByRole: UserRole
  ) => {
    try {
      await stockService.recordAdjustment({
        medicineId,
        quantity,
        reason,
        performedBy,
        performedByRole,
      });
      
      setMedicines(prev => prev.map(med => {
        if (med.id === medicineId) {
          return {
            ...med,
            stockQuantity: Math.max(0, med.stockQuantity + quantity),
          };
        }
        return med;
      }));
      
      await refreshMovements();
    } catch (err) {
      console.error('Failed to record stock adjustment:', err);
    }
  };

  // Add a new medicine (both to backend and update local state)
  const addMedicine = async (medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine | null> => {
    try {
      const response = await medicineService.create({
        name: medicineData.name,
        genericName: medicineData.genericName,
        category: medicineData.category,
        manufacturer: medicineData.manufacturer,
        batchNumber: medicineData.batchNumber,
        expiryDate: medicineData.expiryDate instanceof Date ? medicineData.expiryDate.toISOString().split('T')[0] : medicineData.expiryDate as string,
        units: medicineData.units.map(unit => ({
          type: unit.type.toUpperCase(),
          quantity: unit.quantity,
          price: unit.price,
        })),
        stockQuantity: medicineData.stockQuantity,
        reorderLevel: medicineData.reorderLevel,
        costPrice: medicineData.costPrice,
        imageUrl: medicineData.imageUrl,
      });
      
      if (response.success && response.data) {
        const newMedicine = {
          ...response.data,
          id: response.data.id,
          name: response.data.name,
          genericName: response.data.genericName,
          category: response.data.category,
          manufacturer: response.data.manufacturer,
          batchNumber: response.data.batchNumber,
          expiryDate: new Date(response.data.expiryDate),
          units: response.data.units || [],
          stockQuantity: response.data.stockQuantity || 0,
          reorderLevel: response.data.reorderLevel || 50,
          supplierId: response.data.supplierId || medicineData.supplierId,
          costPrice: response.data.costPrice || 0,
          imageUrl: response.data.imageUrl,
          createdAt: new Date(response.data.createdAt || new Date()),
          updatedAt: new Date(response.data.updatedAt || new Date()),
        };
        
        setMedicines(prev => [...prev, newMedicine]);
        return newMedicine;
      }
      return null;
    } catch (error) {
      console.error('Error adding medicine:', error);
      return null;
    }
  };

  // Upload opening stock - Not available in new API, use local state
  const uploadOpeningStock = async (month: string, items: StockItem[]) => {
    try {
      console.log('Upload opening stock - storing locally:', month, items);
      await refreshMonthlyStocks();
    } catch (err) {
      console.error('Failed to upload opening stock:', err);
    }
  };

  // Upload closing stock - Not available in new API, use local state
  const uploadClosingStock = async (month: string, items: StockItem[]) => {
    try {
      console.log('Upload closing stock - storing locally:', month, items);
      await refreshMonthlyStocks();
    } catch (err) {
      console.error('Failed to upload closing stock:', err);
    }
  };

  // Get stock comparison for a month
  const getStockComparison = (month: string) => {
    const monthData = monthlyStocks.find(s => s.month === month);
    if (!monthData) return [];

    return monthData.openingStock.map(opening => {
      const closing = monthData.closingStock.find(c => c.medicineId === opening.medicineId);
      const expected = opening.openingStock + (opening.purchased || 0) - (opening.sold || 0);
      const actual = closing?.currentStock || 0;
      return {
        item: opening,
        expected,
        actual,
        variance: actual - expected,
      };
    });
  };

  // Get current stock for a medicine
  const getMedicineStock = (medicineId: string) => {
    const med = medicines.find(m => m.id === medicineId);
    return med?.stockQuantity || 0;
  };

  // Get all movements for a specific medicine
  const getMedicineMovements = (medicineId: string) => {
    return stockMovements.filter(m => m.medicineId === medicineId);
  };

  // Get stock audit report for all medicines
  const getStockAuditReport = () => {
    return medicines.map(med => {
      const movements = stockMovements.filter(m => m.medicineId === med.id);
      const totalSold = movements
        .filter(m => m.type === 'sale')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const totalLost = movements
        .filter(m => m.type === 'loss')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const totalAdjusted = movements
        .filter(m => m.type === 'adjustment')
        .reduce((sum, m) => sum + m.quantity, 0);
      
      return {
        medicineId: med.id,
        medicineName: med.name,
        totalSold,
        totalLost,
        totalAdjusted,
        currentStock: med.stockQuantity,
      };
    });
  };

  return (
    <StockContext.Provider value={{
      medicines,
      monthlyStocks,
      stockMovements,
      isLoading,
      error,
      deductStock,
      addStock,
      recordStockLoss,
      recordStockAdjustment,
      addMedicine,
      uploadOpeningStock,
      uploadClosingStock,
      getStockComparison,
      getMedicineStock,
      getMedicineMovements,
      getStockAuditReport,
      refreshMedicines,
      refreshMovements,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}