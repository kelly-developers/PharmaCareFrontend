import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { prescriptionService, Prescription, PrescriptionItem } from '@/services/prescriptionService';
import { useAuth } from './AuthContext';

interface PrescriptionsContextType {
  prescriptions: Prescription[];
  isLoading: boolean;
  error: string | null;
  addPrescription: (prescription: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByName'>) => Promise<Prescription | null>;
  updatePrescriptionStatus: (id: string, status: 'PENDING' | 'DISPENSED' | 'CANCELLED', dispensedBy?: string) => Promise<boolean>;
  getPendingPrescriptions: () => Prescription[];
  getDispensedPrescriptions: () => Prescription[];
  refreshPrescriptions: () => Promise<void>;
}

const PrescriptionsContext = createContext<PrescriptionsContextType | undefined>(undefined);

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

export function PrescriptionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all prescriptions
  const refreshPrescriptions = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await prescriptionService.getAll();
      if (response.success && response.data) {
        const prescriptionsArray = extractArray<Prescription>(response.data);
        setPrescriptions(prescriptionsArray.map(rx => ({
          ...rx,
          createdAt: rx.createdAt,
          dispensedAt: rx.dispensedAt,
        })));
      } else {
        console.warn('Failed to fetch prescriptions:', response.error);
        setPrescriptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Only fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshPrescriptions();
    } else {
      setPrescriptions([]);
    }
  }, [isAuthenticated, refreshPrescriptions]);

  const addPrescription = async (prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'createdBy' | 'createdByName'>): Promise<Prescription | null> => {
    try {
      const response = await prescriptionService.create({
        patientName: prescriptionData.patientName,
        patientPhone: prescriptionData.patientPhone,
        diagnosis: prescriptionData.diagnosis,
        items: prescriptionData.items,
        notes: prescriptionData.notes,
        // Do NOT send createdBy - backend will get it from authentication
      });
      
      if (response.success && response.data) {
        setPrescriptions(prev => [response.data!, ...prev]);
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const updatePrescriptionStatus = async (
    id: string, 
    status: 'PENDING' | 'DISPENSED' | 'CANCELLED', 
    dispensedBy?: string
  ): Promise<boolean> => {
    try {
      const response = await prescriptionService.updateStatus(id, { status, dispensedBy });
      
      if (response.success) {
        setPrescriptions(prev => prev.map(rx => {
          if (rx.id === id) {
            return {
              ...rx,
              status,
              dispensedAt: status === 'DISPENSED' ? new Date().toISOString() : undefined,
              dispensedBy: status === 'DISPENSED' ? dispensedBy : undefined,
            };
          }
          return rx;
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getPendingPrescriptions = () => prescriptions.filter(rx => rx.status === 'PENDING');
  const getDispensedPrescriptions = () => prescriptions.filter(rx => rx.status === 'DISPENSED');

  return (
    <PrescriptionsContext.Provider value={{
      prescriptions,
      isLoading,
      error,
      addPrescription,
      updatePrescriptionStatus,
      getPendingPrescriptions,
      getDispensedPrescriptions,
      refreshPrescriptions,
    }}>
      {children}
    </PrescriptionsContext.Provider>
  );
}

export function usePrescriptions() {
  const context = useContext(PrescriptionsContext);
  if (!context) {
    throw new Error('usePrescriptions must be used within a PrescriptionsProvider');
  }
  return context;
}

export type { Prescription, PrescriptionItem };