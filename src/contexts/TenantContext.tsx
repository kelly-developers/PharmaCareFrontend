import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Business, BusinessType, getTerminology, hasFeature, BUSINESS_TERMINOLOGY } from '@/types/business';
import { businessService } from '@/services/businessService';

interface TenantContextType {
  currentBusiness: Business | null;
  businessType: BusinessType;
  isLoading: boolean;
  terminology: typeof BUSINESS_TERMINOLOGY.pharmacy;
  hasFeature: (feature: string) => boolean;
  setCurrentBusiness: (business: Business | null) => void;
  refreshBusiness: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get business type with fallback
  const businessType: BusinessType = currentBusiness?.businessType || 'pharmacy';
  
  // Get terminology based on business type
  const terminology = getTerminology(businessType);

  // Check feature availability
  const checkFeature = useCallback((feature: string): boolean => {
    return hasFeature(businessType, feature);
  }, [businessType]);

  // Load business info from session/storage
  useEffect(() => {
    const loadBusiness = () => {
      try {
        const businessStr = sessionStorage.getItem('current_business');
        if (businessStr) {
          const business = JSON.parse(businessStr);
          setCurrentBusiness(business);
        }
      } catch (error) {
        console.error('Failed to load business info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBusiness();
  }, []);

  // Refresh business data from API
  const refreshBusiness = useCallback(async () => {
    if (!currentBusiness?.id) return;
    
    try {
      const response = await businessService.getById(currentBusiness.id);
      if (response.success && response.data) {
        setCurrentBusiness(response.data);
        sessionStorage.setItem('current_business', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to refresh business:', error);
    }
  }, [currentBusiness?.id]);

  // Update session storage when business changes
  const handleSetBusiness = useCallback((business: Business | null) => {
    setCurrentBusiness(business);
    if (business) {
      sessionStorage.setItem('current_business', JSON.stringify(business));
    } else {
      sessionStorage.removeItem('current_business');
    }
  }, []);

  return (
    <TenantContext.Provider value={{
      currentBusiness,
      businessType,
      isLoading,
      terminology,
      hasFeature: checkFeature,
      setCurrentBusiness: handleSetBusiness,
      refreshBusiness,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
