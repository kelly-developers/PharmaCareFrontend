import { api, ApiResponse } from './api';
import { Expense, UserRole } from '@/types/pharmacy';

interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  date: string;
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

export const expenseService = {
  // Get all expenses (paginated)
  async getAll(filters?: ExpenseFilters): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.createdBy) queryParams.append('createdBy', filters.createdBy);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    
    const query = queryParams.toString();
    return api.get<any>(`/expenses${query ? `?${query}` : ''}`);
  },

  // Get expense by ID
  async getById(id: string): Promise<ApiResponse<Expense>> {
    return api.get<Expense>(`/expenses/${id}`);
  },

  // Create expense
  async create(expense: CreateExpenseRequest): Promise<ApiResponse<Expense>> {
    return api.post<Expense>('/expenses', expense);
  },

  // Update expense
  async update(id: string, updates: UpdateExpenseRequest): Promise<ApiResponse<Expense>> {
    return api.put<Expense>(`/expenses/${id}`, updates);
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
    return api.get<PeriodTotal>(`/expenses/period-total?startDate=${startDate}&endDate=${endDate}`);
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
    const today = new Date().toISOString().split('T')[0];
    return api.get<Expense[]>(`/expenses?startDate=${today}&endDate=${today}`);
  },

  async getThisMonth(): Promise<ApiResponse<Expense[]>> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    return api.get<Expense[]>(`/expenses?startDate=${startDate}&endDate=${endDate}`);
  },

  async getSummary(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const query = queryParams.toString();
    return api.get(`/expenses/stats${query ? `?${query}` : ''}`);
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    // Categories are typically static or can be fetched from medicine categories
    return api.get<string[]>('/expenses/categories');
  },
};
