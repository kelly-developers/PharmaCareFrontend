import { api, ApiResponse } from './api';

export interface Category {
  id: string;
  name: string;
  description: string;
  medicineCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface CreateCategoryRequest {
  name: string;
  description: string;
}

interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

interface CategoryStats {
  totalCategories: number;
  totalMedicines: number;
  categoryBreakdown: { categoryId: string; name: string; medicineCount: number }[];
}

export const categoryService = {
  // Get all categories
  async getAll(): Promise<ApiResponse<Category[]>> {
    return api.get<Category[]>('/categories');
  },

  // Get category by ID
  async getById(id: string): Promise<ApiResponse<Category>> {
    return api.get<Category>(`/categories/${id}`);
  },

  // Get category by name
  async getByName(name: string): Promise<ApiResponse<Category>> {
    return api.get<Category>(`/categories/name/${encodeURIComponent(name)}`);
  },

  // Create category
  async create(category: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    return api.post<Category>('/categories', category);
  },

  // Update category
  async update(id: string, updates: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
    return api.put<Category>(`/categories/${id}`, updates);
  },

  // Delete category
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/categories/${id}`);
  },

  // Get category statistics
  async getStats(): Promise<ApiResponse<CategoryStats>> {
    return api.get<CategoryStats>('/categories/stats');
  },

  // Helper: Get category names (for dropdowns)
  async getNames(): Promise<ApiResponse<string[]>> {
    const response = await api.get<Category[]>('/categories');
    if (response.success && response.data) {
      return { success: true, data: response.data.map(c => c.name) };
    }
    return { success: false, error: response.error };
  },

  // Legacy method - no longer needed with dedicated category endpoint
  async incrementMedicineCount(categoryName: string): Promise<ApiResponse<void>> {
    // This is now handled automatically by the backend
    return { success: true };
  },
};
