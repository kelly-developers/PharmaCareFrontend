import { api, ApiResponse } from './api';
import { Expense, UserRole } from '@/types/pharmacy';

interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  date: string;
  createdBy: string;
  createdByRole: UserRole;
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
  createdByRole?: UserRole;
  page?: number;
  limit?: number;
}

interface ExpenseSummary {
  totalExpenses: number;
  byCategory: { category: string; amount: number; count: number }[];
  byRole: { role: string; amount: number; count: number }[];
}

export const expenseService = {
  // Get all expenses with optional filters
  async getAll(filters?: ExpenseFilters): Promise<ApiResponse<Expense[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.createdBy) queryParams.append('createdBy', filters.createdBy);
    if (filters?.createdByRole) queryParams.append('createdByRole', filters.createdByRole);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    
    const query = queryParams.toString();
    return api.get<Expense[]>(`/expenses${query ? `?${query}` : ''}`);
  },

  // Get expense by ID
  async getById(id: string): Promise<ApiResponse<Expense>> {
    return api.get<Expense>(`/expenses/${id}`);
  },

  // Create new expense
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

  // Get expenses by role
  async getByRole(role: UserRole): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>(`/expenses/role/${role}`);
  },

  // Get cashier expenses
  async getByCashier(cashierId: string): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>(`/expenses/cashier/${cashierId}`);
  },

  // Get today's expenses
  async getToday(): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>('/expenses/today');
  },

  // Get this month's expenses
  async getThisMonth(): Promise<ApiResponse<Expense[]>> {
    return api.get<Expense[]>('/expenses/month');
  },

  // Get expense summary
  async getSummary(startDate?: string, endDate?: string): Promise<ApiResponse<ExpenseSummary>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const query = queryParams.toString();
    return api.get<ExpenseSummary>(`/expenses/summary${query ? `?${query}` : ''}`);
  },

  // Get expense categories
  async getCategories(): Promise<ApiResponse<string[]>> {
    return api.get<string[]>('/expenses/categories');
  },
};
