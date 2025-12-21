import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Medicine, StockMovement, UnitType, UserRole } from '@/types/pharmacy';
import { medicineService } from '@/services/medicineService';
import { stockService } from '@/services/stockService';

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

export function StockProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [monthlyStocks, setMonthlyStocks] = useState<MonthlyStock[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch medicines from backend
  const refreshMedicines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await medicineService.getAll();
      if (response.success && response.data) {
        setMedicines(response.data.map(med => ({
          ...med,
          expiryDate: new Date(med.expiryDate),
          createdAt: new Date(med.createdAt),
          updatedAt: new Date(med.updatedAt),
        })));
      } else {
        setError(response.error || 'Failed to fetch medicines');
      }
    } catch (err) {
      setError('Failed to fetch medicines');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stock movements from backend - FIXED
  const refreshMovements = useCallback(async () => {
    try {
      const response = await stockService.getMovements();
      console.log('📊 Stock Movements Response:', response); // Debug log
      
      if (response.success && response.data) {
        // Handle different response structures
        let movementsArray: any[] = [];
        
        if (Array.isArray(response.data)) {
          // Case 1: Direct array
          movementsArray = response.data;
        } else if (response.data.content && Array.isArray(response.data.content)) {
          // Case 2: Paginated response { content: [], ... }
          movementsArray = response.data.content;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Case 3: Nested data { data: [], ... }
          movementsArray = response.data.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          // Case 4: Items array { items: [], ... }
          movementsArray = response.data.items;
        }
        
        console.log('📦 Extracted movements array:', movementsArray);
        
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
  }, []);

  // Fetch monthly stocks - FIXED
  const refreshMonthlyStocks = useCallback(async () => {
    try {
      const response = await stockService.getMonthlyStocks();
      console.log('📅 Monthly Stocks Response:', response); // Debug log
      
      if (response.success && response.data) {
        // Handle different response structures
        let monthlyArray: any[] = [];
        
        if (Array.isArray(response.data)) {
          monthlyArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          monthlyArray = response.data.data;
        } else if (response.data.content && Array.isArray(response.data.content)) {
          monthlyArray = response.data.content;
        }
        
        setMonthlyStocks(monthlyArray);
      } else {
        console.warn('No data in monthly stocks response');
        setMonthlyStocks([]);
      }
    } catch (err) {
      console.error('Failed to fetch monthly stocks:', err);
      setMonthlyStocks([]);
    }
  }, []);

  useEffect(() => {
    refreshMedicines();
    refreshMovements();
    refreshMonthlyStocks();
  }, [refreshMedicines, refreshMovements, refreshMonthlyStocks]);

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
      await medicineService.deductStock(medicineId, quantity, unitType, referenceId, performedBy, performedByRole);
      
      // Update local state
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
      await medicineService.addStock(medicineId, quantity, referenceId, performedBy, performedByRole);
      
      // Update local state
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
      await stockService.recordLoss(medicineId, quantity, reason, performedBy, performedByRole);
      
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
      await stockService.recordAdjustment(medicineId, quantity, reason, performedBy, performedByRole);
      
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

  // Add a new medicine
  const addMedicine = async (medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine | null> => {
    try {
      const response = await medicineService.create({
        name: medicineData.name,
        genericName: medicineData.genericName,
        category: medicineData.category,
        manufacturer: medicineData.manufacturer,
        batchNumber: medicineData.batchNumber,
        expiryDate: medicineData.expiryDate instanceof Date ? medicineData.expiryDate.toISOString() : medicineData.expiryDate as string,
        units: medicineData.units,
        stockQuantity: medicineData.stockQuantity,
        reorderLevel: medicineData.reorderLevel,
        supplierId: medicineData.supplierId,
        costPrice: medicineData.costPrice,
        imageUrl: medicineData.imageUrl,
      });
      
      if (response.success && response.data) {
        const newMedicine = {
          ...response.data,
          expiryDate: new Date(response.data.expiryDate),
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };
        setMedicines(prev => [...prev, newMedicine]);
        return newMedicine;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Upload opening stock
  const uploadOpeningStock = async (month: string, items: StockItem[]) => {
    try {
      await stockService.uploadOpeningStock(month, items);
      await refreshMonthlyStocks();
    } catch (err) {
      console.error('Failed to upload opening stock:', err);
    }
  };

  // Upload closing stock
  const uploadClosingStock = async (month: string, items: StockItem[]) => {
    try {
      await stockService.uploadClosingStock(month, items);
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