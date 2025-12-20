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

export const employeeService = {
  // Get all employees
  async getAll(status?: 'active' | 'inactive'): Promise<ApiResponse<Employee[]>> {
    const query = status ? `?status=${status}` : '';
    return api.get<Employee[]>(`/employees${query}`);
  },

  // Get employee by ID
  async getById(id: string): Promise<ApiResponse<Employee>> {
    return api.get<Employee>(`/employees/${id}`);
  },

  // Create new employee
  async create(employee: CreateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return api.post<Employee>('/employees', employee);
  },

  // Update employee
  async update(id: string, updates: UpdateEmployeeRequest): Promise<ApiResponse<Employee>> {
    return api.put<Employee>(`/employees/${id}`, updates);
  },

  // Delete employee
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/employees/${id}`);
  },

  // Deactivate employee
  async deactivate(id: string): Promise<ApiResponse<Employee>> {
    return api.patch<Employee>(`/employees/${id}/deactivate`);
  },

  // Reactivate employee
  async reactivate(id: string): Promise<ApiResponse<Employee>> {
    return api.patch<Employee>(`/employees/${id}/reactivate`);
  },
};

export const payrollService = {
  // Get all payroll entries
  async getAll(month?: string): Promise<ApiResponse<PayrollEntry[]>> {
    const query = month ? `?month=${month}` : '';
    return api.get<PayrollEntry[]>(`/payroll${query}`);
  },

  // Get payroll by ID
  async getById(id: string): Promise<ApiResponse<PayrollEntry>> {
    return api.get<PayrollEntry>(`/payroll/${id}`);
  },

  // Create payroll entry
  async create(payroll: CreatePayrollRequest): Promise<ApiResponse<PayrollEntry>> {
    return api.post<PayrollEntry>('/payroll', payroll);
  },

  // Update payroll entry
  async update(id: string, updates: Partial<CreatePayrollRequest>): Promise<ApiResponse<PayrollEntry>> {
    return api.put<PayrollEntry>(`/payroll/${id}`, updates);
  },

  // Mark as paid
  async markAsPaid(id: string): Promise<ApiResponse<PayrollEntry>> {
    return api.patch<PayrollEntry>(`/payroll/${id}/pay`);
  },

  // Get payroll by employee
  async getByEmployee(employeeId: string): Promise<ApiResponse<PayrollEntry[]>> {
    return api.get<PayrollEntry[]>(`/payroll/employee/${employeeId}`);
  },

  // Generate payroll for all employees for a month
  async generateForMonth(month: string): Promise<ApiResponse<PayrollEntry[]>> {
    return api.post<PayrollEntry[]>('/payroll/generate', { month });
  },
};
