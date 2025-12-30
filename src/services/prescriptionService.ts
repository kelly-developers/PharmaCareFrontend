import { api, ApiResponse } from './api';

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientName: string;
  patientPhone: string;
  diagnosis: string;
  items: PrescriptionItem[];
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'PENDING' | 'DISPENSED' | 'CANCELLED';
  dispensedAt?: string;
  dispensedBy?: string;
  dispensedByName?: string;
}

interface CreatePrescriptionRequest {
  patientName: string;
  patientPhone: string;
  diagnosis: string;
  items: PrescriptionItem[];
  notes: string;
}

interface UpdatePrescriptionRequest extends Partial<CreatePrescriptionRequest> {}

interface UpdateStatusRequest {
  status: 'PENDING' | 'DISPENSED' | 'CANCELLED';
  dispensedBy?: string;
}

interface PrescriptionStats {
  totalPrescriptions: number;
  pendingCount: number;
  dispensedCount: number;
  cancelledCount: number;
  todayCount: number;
}

export const prescriptionService = {
  // Get all prescriptions (paginated)
  async getAll(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return api.get<any>(`/prescriptions?page=${page}&limit=${limit}`);
  },

  // Get prescription by ID
  async getById(id: string): Promise<ApiResponse<Prescription>> {
    return api.get<Prescription>(`/prescriptions/${id}`);
  },

  // Create prescription
  async create(prescription: CreatePrescriptionRequest): Promise<ApiResponse<Prescription>> {
    return api.post<Prescription>('/prescriptions', prescription);
  },

  // Update prescription
  async update(id: string, updates: UpdatePrescriptionRequest): Promise<ApiResponse<Prescription>> {
    return api.put<Prescription>(`/prescriptions/${id}`, updates);
  },

  // Delete prescription
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/prescriptions/${id}`);
  },

  // Update prescription status
  async updateStatus(id: string, request: UpdateStatusRequest): Promise<ApiResponse<Prescription>> {
    return api.patch<Prescription>(`/prescriptions/${id}/status`, request);
  },

  // Get pending prescriptions
  async getPending(): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>('/prescriptions/pending');
  },

  // Get dispensed prescriptions
  async getDispensed(): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>('/prescriptions/dispensed');
  },

  // Get prescriptions by patient phone
  async getByPatient(phone: string): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>(`/prescriptions/patient/${encodeURIComponent(phone)}`);
  },

  // Get prescriptions by creator
  async getByCreator(userId: string): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>(`/prescriptions/creator/${userId}`);
  },

  // Get prescription statistics
  async getStats(): Promise<ApiResponse<PrescriptionStats>> {
    return api.get<PrescriptionStats>('/prescriptions/stats');
  },
};
