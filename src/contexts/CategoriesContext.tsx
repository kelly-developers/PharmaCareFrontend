import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { categoryService } from '@/services/categoryService';
import { useAuth } from './AuthContext';

export interface Category {
  id: string;
  name: string;
  description: string;
  medicineCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface CategoriesContextType {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  getCategoryNames: () => string[];
  incrementMedicineCount: (categoryName: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

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

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all categories
  const refreshCategories = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await categoryService.getAll();
      if (response.success && response.data) {
        const categoriesArray = extractArray<Category>(response.data);
        setCategories(categoriesArray);
      } else {
        console.warn('Failed to fetch categories:', response.error);
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Only fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshCategories();
    } else {
      setCategories([]);
    }
  }, [isAuthenticated, refreshCategories]);

  const addCategory = async (category: Omit<Category, 'id' | 'createdAt'>): Promise<Category | null> => {
    try {
      const response = await categoryService.create({
        name: category.name,
        description: category.description,
      });
      
      if (response.success && response.data) {
        setCategories(prev => [response.data!, ...prev]);
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    try {
      const response = await categoryService.update(id, {
        name: updates.name,
        description: updates.description,
      });
      
      if (response.success) {
        setCategories(prev => prev.map(cat => 
          cat.id === id ? { ...cat, ...updates } : cat
        ));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const response = await categoryService.delete(id);
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getCategoryNames = () => {
    return categories.map(cat => cat.name);
  };

  const incrementMedicineCount = async (categoryName: string) => {
    try {
      await categoryService.incrementMedicineCount(categoryName);
      setCategories(prev => prev.map(cat => 
        cat.name === categoryName 
          ? { ...cat, medicineCount: cat.medicineCount + 1 }
          : cat
      ));
    } catch (err) {
      console.error('Failed to increment medicine count:', err);
    }
  };

  return (
    <CategoriesContext.Provider value={{
      categories,
      isLoading,
      error,
      addCategory,
      updateCategory,
      deleteCategory,
      getCategoryNames,
      incrementMedicineCount,
      refreshCategories,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}
