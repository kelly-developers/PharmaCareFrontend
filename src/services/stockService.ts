import { api, ApiResponse } from './api';
import { StockMovement, UserRole, UnitType } from '@/types/pharmacy';

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

interface StockComparisonResult {
  item: StockItem;
  expected: number;
  actual: number;
  variance: number;
}

interface RecordMovementRequest {
  medicineId: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'loss' | 'return' | 'expired';
  quantity: number;
  unitType?: UnitType;
  referenceId?: string;
  reason?: string;
  performedBy: string;
  performedByRole: UserRole;
}

export const stockService = {
  // Get all stock movements
  async getMovements(params?: {
    medicineId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<StockMovement[]>> {
    const queryParams = new URLSearchParams();
    if (params?.medicineId) queryParams.append('medicineId', params.medicineId);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return api.get<StockMovement[]>(`/stock/movements${query ? `?${query}` : ''}`);
  },

  // Record a stock movement
  async recordMovement(request: RecordMovementRequest): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/movements', request);
  },

  // Get monthly stocks
  async getMonthlyStocks(): Promise<ApiResponse<MonthlyStock[]>> {
    return api.get<MonthlyStock[]>('/stock/monthly');
  },

  // Upload opening stock
  async uploadOpeningStock(month: string, items: StockItem[]): Promise<ApiResponse<MonthlyStock>> {
    return api.post<MonthlyStock>('/stock/opening', { month, items });
  },

  // Upload closing stock
  async uploadClosingStock(month: string, items: StockItem[]): Promise<ApiResponse<MonthlyStock>> {
    return api.post<MonthlyStock>('/stock/closing', { month, items });
  },

  // Get stock comparison for a month
  async getStockComparison(month: string): Promise<ApiResponse<StockComparisonResult[]>> {
    return api.get<StockComparisonResult[]>(`/stock/comparison/${month}`);
  },

  // Get stock audit report
  async getAuditReport(): Promise<ApiResponse<{
    medicineId: string;
    medicineName: string;
    totalSold: number;
    totalLost: number;
    totalAdjusted: number;
    currentStock: number;
  }[]>> {
    return api.get('/stock/audit');
  },

  // Record stock loss
  async recordLoss(
    medicineId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    performedByRole: UserRole
  ): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/loss', {
      medicineId,
      quantity,
      reason,
      performedBy,
      performedByRole,
    });
  },

  // Record stock adjustment
  async recordAdjustment(
    medicineId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    performedByRole: UserRole
  ): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/adjustment', {
      medicineId,
      quantity,
      reason,
      performedBy,
      performedByRole,
    });
  },
};
