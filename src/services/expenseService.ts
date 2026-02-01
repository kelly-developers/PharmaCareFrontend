import { api, ApiResponse } from './api';
import { Expense, UserRole } from '@/types/pharmacy';

interface CreateExpenseRequest {
  category: string;
  title: string; // Backend expects title
  description: string;
  amount: number;
  date: string; // Should be YYYY-MM-DD format
  createdBy?: string;
  createdByRole?: UserRole;
}

interface UpdateExpenseRequest {
  category?: string;
  description?: string;
  amount?: number;
  date?: string;
}

interface ExpenseFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
}

interface ExpenseStats {
  totalExpenses: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  todayTotal: number;
  monthTotal: number;
  byCategory: { category: string; amount: number; count: number }[];
}

interface PeriodTotal {
  startDate: string;
  endDate: string;
  total: number;
  count: number;
}

// Helper to safely format date
const safeDateFormat = (date: Date | string): string => {
  try {
    if (typeof date === 'string') {
      // If it's already a string, try to parse it
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date string');
      }
      return parsed.toISOString().split('T')[0];
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      throw new Error('Invalid date');
    }
    return d.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Date formatting error, using current date:', error);
    return new Date().toISOString().split('T')[0];
  }
};

export const expenseService = {
  // Get all expenses (NO pagination - returns ALL expenses)
  async getAll(filters?: ExpenseFilters): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.startDate) {
      queryParams.append('startDate', safeDateFormat(filters.startDate));
    }
    if (filters?.endDate) {
      queryParams.append('endDate', safeDateFormat(filters.endDate));
    }
    if (filters?.createdBy) queryParams.append('createdBy', filters.createdBy);
    
    const query = queryParams.toString();
    return api.get<any>(`/expenses${query ? `?${query}` : ''}`);
  },

  // Get expense by ID
  async getById(id: string): Promise<ApiResponse<Expense>> {
    return api.get<Expense>(`/expenses/${id}`);
  },

  // Create expense
  async create(expense: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    // Ensure date is properly formatted
    const formattedExpense = {
      ...expense,
      date: safeDateFormat(expense.date),
    };
    return api.post<Expense>('/expenses', formattedExpense);
  },

  // Update expense
  async update(id: string, updates: UpdateExpenseRequest): Promise<ApiResponse<Expense>> {
    const formattedUpdates = {
      ...updates,
      ...(updates.date && { date: safeDateFormat(updates.date) }),
    };
    return api.put<Expense>(`/expenses/${id}`, formattedUpdates);
  },

  // Delete expense
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/expenses/${id}`);
  },

  // Approve expense
  async approve(id: string): Promise<ApiResponse<Expense>> {
    return api.patch<Expense>(`/expenses/${id}/approve`, {});
  },

  // Reject expense
  async reject(id: string): Promise<ApiResponse<Expense>> {
    return api.patch<Expense>(`/expenses/${id}/reject`, {});
  },

  // Get pending expenses
  async getPending(): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>('/expenses/pending');
  },

  // Get expenses by category
  async getByCategory(category: string): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>(`/expenses/category/${encodeURIComponent(category)}`);
  },

  // Get expenses total for period
  async getPeriodTotal(startDate: string, endDate: string): Promise<ApiResponse<PeriodTotal>> {
    const safeStart = safeDateFormat(startDate);
    const safeEnd = safeDateFormat(endDate);
    return api.get<PeriodTotal>(`/expenses/period-total?startDate=${safeStart}&endDate=${safeEnd}`);
  },

  // Get expense statistics
  async getStats(): Promise<ApiResponse<ExpenseStats>> {
    return api.get<ExpenseStats>('/expenses/stats');
  },

  // Legacy methods for backward compatibility
  async getByRole(role: UserRole): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>(`/expenses?role=${role}`);
  },

  async getByCashier(cashierId: string): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>(`/expenses?createdBy=${cashierId}`);
  },

  async getToday(): Promise<ApiResponse<Expense[]>> {
    const today = safeDateFormat(new Date());
    return api.get<Expense[]>(`/expenses?startDate=${today}&endDate=${today}`);
  },

  async getThisMonth(): Promise<ApiResponse<Expense[]>> {
    const now = new Date();
    const startDate = safeDateFormat(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDate = safeDateFormat(now);
    return api.get<Expense[]>(`/expenses?startDate=${startDate}&endDate=${endDate}`);
  },

  async getSummary(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', safeDateFormat(startDate));
    if (endDate) queryParams.append('endDate', safeDateFormat(endDate));
    const query = queryParams.toString();
    return api.get(`/expenses/stats${query ? `?${query}` : ''}`);
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    return api.get<string[]>('/expenses/categories');
  },
  
  // Utility function to get today's date in safe format
  getTodayDate(): string {
    return safeDateFormat(new Date());
  }
};