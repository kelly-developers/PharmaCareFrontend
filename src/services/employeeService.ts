import { api, ApiResponse } from './api';
import { Employee, PayrollEntry, UserRole } from '@/types/pharmacy';

interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  salary: number;
  bankAccount?: string;
  startDate: string;
}

interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  status?: 'active' | 'inactive';
}

interface CreatePayrollRequest {
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  deductions: number;
  bonuses: number;
}

interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export const employeeService = {
  // Get all employees (paginated)
  async getAll(page: number = 0, limit: number = 20): Promise<ApiResponse<PaginatedResponse<Employee>>> {
    return api.get<PaginatedResponse<Employee>>(`/employees?page=${page}&limit=${limit}`);
  },

  // Get active employees
  async getActive(): Promise<ApiResponse<Employee[]>> {
    return api.get<Employee[]>('/employees/active');
  },

  // Get employee by ID
  async getById(id: string): Promise<ApiResponse<Employee>> {
    return api.get<Employee>(`/employees/${id}`);
  },

  // Get employee by user ID
  async getByUserId(userId: string): Promise<ApiResponse<Employee>> {
    return api.get<Employee>(`/employees/user/${userId}`);
  },

  // Create new employee
  async create(employee: CreateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return api.post<Employee>('/employees', employee);
  },

  // Update employee
  async update(id: string, updates: UpdateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return api.put<Employee>(`/employees/${id}`, updates);
  },

  // Delete/deactivate employee
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/employees/${id}`);
  },

  // Activate employee
  async activate(id: string): Promise<ApiResponse<void>> {
    return api.patch<void>(`/employees/${id}/activate`);
  },

  // Get employee statistics
  async getStats(): Promise<ApiResponse<{ activeEmployees: number }>> {
    return api.get('/employees/stats');
  },
};

export const payrollService = {
  // Get employee payroll (paginated)
  async getByEmployee(employeeId: string, page: number = 0, limit: number = 20): Promise<ApiResponse<PaginatedResponse<PayrollEntry>>> {
    return api.get<PaginatedResponse<PayrollEntry>>(`/employees/${employeeId}/payroll?page=${page}&limit=${limit}`);
  },

  // Create payroll entry
  async create(payroll: CreatePayrollRequest): Promise<ApiResponse<PayrollEntry>> {
    return api.post<PayrollEntry>('/employees/payroll', payroll);
  },

  // Update payroll status
  async updateStatus(id: string, status: string): Promise<ApiResponse<PayrollEntry>> {
    return api.patch<PayrollEntry>(`/employees/payroll/${id}/status`, { status });
  },

  // Legacy methods for backward compatibility
  async getAll(month?: string): Promise<ApiResponse<PayrollEntry[]>> {
    const query = month ? `?month=${month}` : '';
    return api.get<PayrollEntry[]>(`/employees/payroll${query}`);
  },

  async getById(id: string): Promise<ApiResponse<PayrollEntry>> {
    return api.get<PayrollEntry>(`/employees/payroll/${id}`);
  },

  async update(id: string, updates: Partial<CreatePayrollRequest>): Promise<ApiResponse<PayrollEntry>> {
    return api.put<PayrollEntry>(`/employees/payroll/${id}`, updates);
  },

  async markAsPaid(id: string): Promise<ApiResponse<PayrollEntry>> {
    return api.patch<PayrollEntry>(`/employees/payroll/${id}/status`, { status: 'paid' });
  },

  async generateForMonth(month: string): Promise<ApiResponse<PayrollEntry[]>> {
    return api.post<PayrollEntry[]>('/employees/payroll/generate', { month });
  },
};
