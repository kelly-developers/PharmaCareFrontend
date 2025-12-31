import { api, ApiResponse } from './api';
import { StockMovement, UserRole, UnitType } from '@/types/pharmacy';

interface StockBreakdown {
  medicineId: string;
  medicineName: string;
  boxes: number;
  strips: number;
  tablets: number;
  totalTablets: number;
  value: number;
}

interface MonthlyStockSummary {
  month: string;
  openingStock: number;
  closingStock: number;
  totalPurchased: number;
  totalSold: number;
  totalLost: number;
  totalAdjusted: number;
}

interface RecordLossRequest {
  medicineId: string;
  quantity: number;
  reason: string;
  performedBy?: string;
  performedByRole?: UserRole;
}

interface RecordAdjustmentRequest {
  medicineId: string;
  quantity: number;
  reason: string;
  performedBy?: string;
  performedByRole?: UserRole;
}

interface NetMovementResult {
  medicineId: string;
  startDate: string;
  endDate: string;
  netMovement: number;
  totalIn: number;
  totalOut: number;
}

export const stockService = {
  // Get stock movements (paginated)
  async getMovements(params?: {
    page?: number;
    limit?: number;
    medicineId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.medicineId) queryParams.append('medicineId', params.medicineId);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const query = queryParams.toString();
    return api.get<any>(`/stock/movements${query ? `?${query}` : ''}`);
  },

  // Record stock loss
  async recordLoss(request: RecordLossRequest): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/loss', request);
  },

  // Record stock adjustment
  async recordAdjustment(request: RecordAdjustmentRequest): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/adjustment', request);
  },

  // Get movements by medicine
  async getMovementsByMedicine(medicineId: string): Promise<ApiResponse<StockMovement[]>> {
    return api.get<StockMovement[]>(`/stock/movements/medicine/${medicineId}`);
  },

  // Get movements by reference
  async getMovementsByReference(referenceId: string): Promise<ApiResponse<StockMovement[]>> {
    return api.get<StockMovement[]>(`/stock/movements/reference/${referenceId}`);
  },

  // Get monthly stock summary
  async getMonthlyStock(): Promise<ApiResponse<MonthlyStockSummary[]>> {
    return api.get<MonthlyStockSummary[]>('/stock/monthly');
  },

  // Get net movement for a medicine in a period
  async getNetMovement(medicineId: string, startDate?: string, endDate?: string): Promise<ApiResponse<NetMovementResult>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return api.get<NetMovementResult>(`/stock/net-movement/${medicineId}${query ? `?${query}` : ''}`);
  },

  // Get stock breakdown for UI
  async getBreakdown(): Promise<ApiResponse<StockBreakdown[]>> {
    return api.get<StockBreakdown[]>('/stock/breakdown');
  },

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return api.get<{ status: string }>('/stock/health');
  },

  // Add stock to existing medicine (not from supplier)
  async addStock(request: {
    medicineId: string;
    quantity: number;
    reason?: string;
    batchNumber?: string;
    expiryDate?: string;
    costPrice?: number;
    performedBy?: string;
    performedByRole?: UserRole;
  }): Promise<ApiResponse<StockMovement>> {
    return api.post<StockMovement>('/stock/add', request);
  },

  // Get current stock for a medicine
  async getCurrentStock(medicineId: string): Promise<ApiResponse<{
    medicineId: string;
    medicineName: string;
    currentStock: number;
    reorderLevel: number;
    lastRestocked: string;
  }>> {
    return api.get(`/stock/current/${medicineId}`);
  },
};
