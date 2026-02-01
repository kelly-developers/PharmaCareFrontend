import { api, ApiResponse } from './api';

export interface FamilyPlanningRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  method: 'DEPO' | 'HERBAL' | 'FEMI_PLAN';
  methodName?: string;
  lastAdministeredDate: string;
  nextDueDate: string;
  cycleDays: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  dueStatus?: 'overdue' | 'upcoming' | 'scheduled';
  daysUntilDue?: number;
  daysOverdue?: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyPlanningSummary {
  totalClients: number;
  activeClients: number;
  overdueCount: number;
  upcomingCount: number;
  depoCount: number;
  herbalCount: number;
  femiPlanCount: number;
}

interface CreateFamilyPlanningRequest {
  clientName: string;
  clientPhone: string;
  method: 'DEPO' | 'HERBAL' | 'FEMI_PLAN';
  lastAdministeredDate: string;
  notes?: string;
}

// Method details
export const FP_METHODS = {
  DEPO: { name: 'Depo Injection', cycleDays: 84, description: '3 months (28 days × 3)' },
  HERBAL: { name: 'Herbal', cycleDays: 28, description: '28 days cycle' },
  FEMI_PLAN: { name: 'Femi Plan', cycleDays: 28, description: '28 days cycle' },
};

export const familyPlanningService = {
  // Get all family planning records
  async getAll(filters?: { status?: string; method?: string }): Promise<ApiResponse<FamilyPlanningRecord[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.method) queryParams.append('method', filters.method);
    const query = queryParams.toString();
    return api.get<FamilyPlanningRecord[]>(`/family-planning${query ? `?${query}` : ''}`);
  },

  // Get due/upcoming appointments
  async getDue(): Promise<ApiResponse<FamilyPlanningRecord[]>> {
    return api.get<FamilyPlanningRecord[]>('/family-planning/due');
  },

  // Get overdue appointments
  async getOverdue(): Promise<ApiResponse<FamilyPlanningRecord[]>> {
    return api.get<FamilyPlanningRecord[]>('/family-planning/overdue');
  },

  // Get summary statistics
  async getSummary(): Promise<ApiResponse<FamilyPlanningSummary>> {
    return api.get<FamilyPlanningSummary>('/family-planning/summary');
  },

  // Get single record
  async getById(id: string): Promise<ApiResponse<FamilyPlanningRecord>> {
    return api.get<FamilyPlanningRecord>(`/family-planning/${id}`);
  },

  // Create new record
  async create(data: CreateFamilyPlanningRequest): Promise<ApiResponse<FamilyPlanningRecord>> {
    return api.post<FamilyPlanningRecord>('/family-planning', data);
  },

  // Record new administration (updates next due date)
  async administer(id: string, administeredDate: string, notes?: string): Promise<ApiResponse<FamilyPlanningRecord>> {
    return api.put<FamilyPlanningRecord>(`/family-planning/${id}/administer`, {
      administeredDate,
      notes,
    });
  },

  // Update record
  async update(id: string, data: Partial<FamilyPlanningRecord>): Promise<ApiResponse<FamilyPlanningRecord>> {
    return api.put<FamilyPlanningRecord>(`/family-planning/${id}`, data);
  },

  // Deactivate record
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/family-planning/${id}`);
  },
};
