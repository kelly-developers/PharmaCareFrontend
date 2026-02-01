import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Expense, UserRole } from '@/types/pharmacy';
import { expenseService } from '@/services/expenseService';
import { useAuth } from './AuthContext';

interface ExpensesContextType {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  getExpensesByRole: (role?: UserRole) => Expense[];
  getCashierExpenses: (cashierId: string) => Expense[];
  getTotalExpenses: () => number;
  getTodayExpenses: () => Expense[];
  getMonthExpenses: () => Expense[];
  refreshExpenses: () => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

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

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all expenses
  const refreshExpenses = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseService.getAll();
      if (response.success && response.data) {
        const expensesArray = extractArray<Expense>(response.data);
        setExpenses(expensesArray.map(exp => ({
          ...exp,
          date: new Date(exp.date),
          createdAt: new Date(exp.createdAt),
        })));
      } else {
        console.warn('Failed to fetch expenses:', response.error);
        setExpenses([]);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Only fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshExpenses();
    } else {
      setExpenses([]);
    }
  }, [isAuthenticated, refreshExpenses]);

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense | null> => {
    try {
      // Format date properly - ensure it's a string in YYYY-MM-DD format
      let dateString: string;
      const dateValue = expenseData.date as Date | string;
      if (dateValue instanceof Date) {
        dateString = dateValue.toISOString().split('T')[0];
      } else if (typeof dateValue === 'string') {
        dateString = dateValue.split('T')[0];
      } else {
        dateString = new Date().toISOString().split('T')[0];
      }

      console.log('📝 Adding expense:', { ...expenseData, date: dateString });

      // Backend expects 'title' field, use description as title
      const response = await expenseService.create({
        category: expenseData.category,
        title: expenseData.description, // Backend requires title
        description: expenseData.description,
        amount: expenseData.amount,
        date: dateString,
        createdBy: expenseData.createdBy,
        createdByRole: expenseData.createdByRole || 'admin',
      });
      
      console.log('📝 Expense creation response:', response);

      if (response.success && response.data) {
        const responseData = response.data as any;
        const newExpense: Expense = {
          id: responseData.id,
          category: responseData.category,
          description: responseData.description || responseData.title,
          amount: parseFloat(responseData.amount) || 0,
          date: new Date(responseData.date || responseData.expense_date || dateString),
          createdBy: responseData.createdBy || responseData.created_by_name || expenseData.createdBy,
          createdByRole: responseData.createdByRole || expenseData.createdByRole,
          createdAt: responseData.createdAt ? new Date(responseData.createdAt) : new Date(),
        };
        setExpenses(prev => [newExpense, ...prev]);
        // Refresh to get full data from server
        await refreshExpenses();
        return newExpense;
      } else {
        console.error('❌ Failed to add expense:', response.error);
      }
      return null;
    } catch (err) {
      console.error('❌ Failed to add expense:', err);
      return null;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const response = await expenseService.delete(id);
      if (response.success) {
        setExpenses(prev => prev.filter(exp => exp.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getExpensesByRole = (role?: UserRole) => {
    if (!role) return expenses;
    return expenses.filter(exp => exp.createdByRole === role);
  };

  const getCashierExpenses = (cashierId: string) => {
    return expenses.filter(exp => exp.createdBy === cashierId);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getTodayExpenses = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      expDate.setHours(0, 0, 0, 0);
      return expDate.getTime() === today.getTime();
    });
  };

  const getMonthExpenses = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= monthStart && expDate <= monthEnd;
    });
  };

  return (
    <ExpensesContext.Provider value={{
      expenses,
      isLoading,
      error,
      addExpense,
      deleteExpense,
      getExpensesByRole,
      getCashierExpenses,
      getTotalExpenses,
      getTodayExpenses,
      getMonthExpenses,
      refreshExpenses,
    }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
}
