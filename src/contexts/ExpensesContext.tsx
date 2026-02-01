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

// Safe date parser that handles various formats
const safeParseDate = (dateString: string | Date): Date => {
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? new Date() : dateString;
  }
  
  if (!dateString || dateString === '') {
    return new Date();
  }
  
  try {
    // Try to parse as ISO string
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Try to parse as YYYY-MM-DD
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(match[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try to parse with Date.parse
    const parsed = Date.parse(dateString);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    
    console.warn(`Could not parse date: ${dateString}, using current date`);
    return new Date();
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date();
  }
};

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
        
        // Safely parse dates
        const safeExpenses = expensesArray.map((exp: any) => {
          const date = safeParseDate(exp.date || exp.expense_date || '');
          const createdAt = safeParseDate(exp.createdAt || exp.created_at || '');
          
          return {
            ...exp,
            date,
            createdAt,
            // Ensure amount is a number
            amount: typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0,
            // Use description or title
            description: exp.description || exp.title || exp.category || 'No description',
          };
        });
        
        setExpenses(safeExpenses);
      } else {
        console.warn('Failed to fetch expenses:', response.error);
        setExpenses([]);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError('Failed to load expenses. Please try again.');
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
      // Safely parse and format date
      const dateObj = safeParseDate(expenseData.date);
      const dateString = dateObj.toISOString().split('T')[0];

      console.log('📝 Adding expense:', { 
        ...expenseData, 
        date: dateString,
        parsedDate: dateObj.toISOString() 
      });

      // Backend expects 'title' field, use description as title
      const response = await expenseService.create({
        category: expenseData.category,
        title: expenseData.description || expenseData.category, // Use description or category as title
        description: expenseData.description || expenseData.category,
        amount: typeof expenseData.amount === 'number' ? expenseData.amount : parseFloat(expenseData.amount as any) || 0,
        date: dateString,
        createdBy: expenseData.createdBy || 'Unknown',
        createdByRole: expenseData.createdByRole || 'admin',
      });
      
      console.log('📝 Expense creation response:', response);

      if (response.success && response.data) {
        const responseData = response.data as any;
        
        // Create new expense with safe date parsing
        const newExpense: Expense = {
          id: responseData.id || Date.now().toString(),
          category: responseData.category || expenseData.category,
          description: responseData.description || responseData.title || expenseData.description || expenseData.category,
          amount: typeof responseData.amount === 'number' ? responseData.amount : parseFloat(responseData.amount) || expenseData.amount,
          date: safeParseDate(responseData.date || responseData.expense_date || dateString),
          createdBy: responseData.createdBy || responseData.created_by_name || expenseData.createdBy || 'Unknown',
          createdByRole: responseData.createdByRole || expenseData.createdByRole || 'admin',
          createdAt: safeParseDate(responseData.createdAt || new Date().toISOString()),
        };
        
        setExpenses(prev => [newExpense, ...prev]);
        // Refresh to get full data from server
        await refreshExpenses();
        return newExpense;
      } else {
        console.error('❌ Failed to add expense:', response.error);
        throw new Error(response.error || 'Failed to add expense');
      }
    } catch (err) {
      console.error('❌ Failed to add expense:', err);
      throw err;
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
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
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