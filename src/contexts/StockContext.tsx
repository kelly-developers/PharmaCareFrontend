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

// Transform backend snake_case to frontend camelCase
function transformBackendMedicine(backendMedicine: any): Medicine {
  console.log('🔧 Transforming backend medicine:', backendMedicine);
  
  // Parse units from string or object
  let units: any[] = [];
  if (backendMedicine.units) {
    try {
      units = typeof backendMedicine.units === 'string' 
        ? JSON.parse(backendMedicine.units)
        : backendMedicine.units;
    } catch (e) {
      console.error('Failed to parse units:', e);
      units = [];
    }
  }
  
  return {
    id: backendMedicine.id,
    name: backendMedicine.name,
    genericName: backendMedicine.generic_name || backendMedicine.genericName || '',
    category: backendMedicine.category,
    manufacturer: backendMedicine.manufacturer || '',
    batchNumber: backendMedicine.batch_number || backendMedicine.batchNumber || '',
    expiryDate: backendMedicine.expiry_date ? new Date(backendMedicine.expiry_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    units: units.map(unit => ({
      type: unit.type || 'TABLET',
      quantity: unit.quantity || 1,
      price: unit.price || 0,
      label: unit.label || unit.type
    })),
    stockQuantity: backendMedicine.stock_quantity || backendMedicine.stockQuantity || 0,
    reorderLevel: backendMedicine.reorder_level || backendMedicine.reorderLevel || 10,
    supplierId: backendMedicine.supplier_id || backendMedicine.supplierId || '',
    costPrice: backendMedicine.cost_price || backendMedicine.costPrice || 0,
    imageUrl: backendMedicine.image_url || backendMedicine.imageUrl,
    description: backendMedicine.description || '',
    productType: backendMedicine.product_type || backendMedicine.productType || 'tablets',
    createdAt: backendMedicine.created_at ? new Date(backendMedicine.created_at) : new Date(),
    updatedAt: backendMedicine.updated_at ? new Date(backendMedicine.updated_at) : new Date(),
    isActive: backendMedicine.is_active !== false,
  };
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
      console.log('📊 Raw medicines response:', response);
      
      if (response.success && response.data) {
        let medicinesArray: any[] = [];
        
        // Extract array from response
        if (response.data.content && Array.isArray(response.data.content)) {
          medicinesArray = response.data.content;
        } else if (Array.isArray(response.data)) {
          medicinesArray = response.data;
        }
        
        console.log('📊 Extracted medicines:', medicinesArray.length);
        
        // Transform the data
        const transformedMedicines = medicinesArray.map(med => transformBackendMedicine(med));
        
        console.log('📊 Transformed medicines:', transformedMedicines);
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
        let movementsArray: any[] = [];
        
        if (response.data.content && Array.isArray(response.data.content)) {
          movementsArray = response.data.content;
        } else if (Array.isArray(response.data)) {
          movementsArray = response.data;
        }
        
        const transformedMovements = movementsArray.map(mov => ({
          id: mov.id,
          medicineId: mov.medicine_id,
          medicineName: mov.medicine_name,
          type: mov.type.toLowerCase() as any,
          quantity: mov.quantity,
          previousStock: mov.previous_stock,
          newStock: mov.new_stock,
          unitType: mov.unit_type as UnitType,
          referenceId: mov.reference_id,
          reason: mov.reason,
          performedBy: mov.performed_by_name || mov.created_by,
          performedByRole: mov.performed_by_role as UserRole,
          createdAt: new Date(mov.created_at),
        }));
        
        setStockMovements(transformedMovements);
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
        // Transform backend MonthlyStockSummary to frontend MonthlyStock format
        const transformedData: MonthlyStock[] = (response.data as any[]).map((item: any) => ({
          month: item.month,
          openingStock: [], // Backend returns numeric, we keep empty for now
          closingStock: [], // Backend returns numeric, we keep empty for now
          uploadedAt: item.uploadedAt
        }));
        setMonthlyStocks(transformedData);
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
      const response = await medicineService.deductStock(medicineId, quantity, `Stock deducted for ${unitType}`, referenceId);
      
      if (response.success) {
        await refreshMedicines();
        await refreshMovements();
      }
    } catch (err) {
      console.error('Failed to deduct stock:', err);
      throw err;
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
      const response = await medicineService.addStock(medicineId, quantity, undefined, undefined, undefined, `Reference: ${referenceId}, By: ${performedBy}`);
      
      if (response.success) {
        await refreshMedicines();
        await refreshMovements();
      }
    } catch (err) {
      console.error('Failed to add stock:', err);
      throw err;
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
      
      await refreshMedicines();
      await refreshMovements();
    } catch (err) {
      console.error('Failed to record stock loss:', err);
      throw err;
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
      
      await refreshMedicines();
      await refreshMovements();
    } catch (err) {
      console.error('Failed to record stock adjustment:', err);
      throw err;
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
          label: unit.label || unit.type
        })),
        stockQuantity: medicineData.stockQuantity,
        reorderLevel: medicineData.reorderLevel,
        costPrice: medicineData.costPrice,
        imageUrl: medicineData.imageUrl,
        description: medicineData.description,
        productType: medicineData.productType,
      });
      
      if (response.success && response.data) {
        const newMedicine = transformBackendMedicine(response.data);
        setMedicines(prev => [...prev, newMedicine]);
        return newMedicine;
      }
      return null;
    } catch (error) {
      console.error('Error adding medicine:', error);
      throw error;
    }
  };

  // Upload opening stock
  const uploadOpeningStock = async (month: string, items: StockItem[]) => {
    try {
      console.log('Upload opening stock:', month, items);
      await refreshMonthlyStocks();
    } catch (err) {
      console.error('Failed to upload opening stock:', err);
      throw err;
    }
  };

  // Upload closing stock
  const uploadClosingStock = async (month: string, items: StockItem[]) => {
    try {
      console.log('Upload closing stock:', month, items);
      await refreshMonthlyStocks();
    } catch (err) {
      console.error('Failed to upload closing stock:', err);
      throw err;
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