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
  createdBy: string; // This will be the user's ID from backend
  createdByName: string; // User's name from backend
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
  // REMOVED: createdBy - backend will set it from authentication
}

interface UpdatePrescriptionStatusRequest {
  status: 'PENDING' | 'DISPENSED' | 'CANCELLED';
  dispensedBy?: string;
}

export const prescriptionService = {
  // Get all prescriptions
  async getAll(): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>('/prescriptions');
  },

  // Get prescription by ID
  async getById(id: string): Promise<ApiResponse<Prescription>> {
    return api.get<Prescription>(`/prescriptions/${id}`);
  },

  // Create new prescription
  async create(prescription: CreatePrescriptionRequest): Promise<ApiResponse<Prescription>> {
    // Don't send createdBy - backend will get it from authentication
    return api.post<Prescription>('/prescriptions', prescription);
  },

  // Update prescription
  async update(id: string, updates: Partial<CreatePrescriptionRequest>): Promise<ApiResponse<Prescription>> {
    return api.put<Prescription>(`/prescriptions/${id}`, updates);
  },

  // Update prescription status
  async updateStatus(id: string, request: UpdatePrescriptionStatusRequest): Promise<ApiResponse<Prescription>> {
    return api.patch<Prescription>(`/prescriptions/${id}/status`, request);
  },

  // Delete prescription
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/prescriptions/${id}`);
  },

  // Get pending prescriptions
  async getPending(): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>('/prescriptions/pending');
  },

  // Get dispensed prescriptions
  async getDispensed(): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>('/prescriptions/dispensed');
  },

  // Get prescriptions by patient
  async getByPatient(patientPhone: string): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>(`/prescriptions/patient/${encodeURIComponent(patientPhone)}`);
  },

  // Get prescriptions created by a user
  async getByCreator(createdBy: string): Promise<ApiResponse<Prescription[]>> {
    return api.get<Prescription[]>(`/prescriptions/creator/${encodeURIComponent(createdBy)}`);
  },
};