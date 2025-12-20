// API Configuration and Base Client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pharmacare-ywjs.onrender.com/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get auth token from session storage
const getAuthToken = (): string | null => {
  return sessionStorage.getItem('auth_token');
};

// Set auth token
export const setAuthToken = (token: string): void => {
  sessionStorage.setItem('auth_token', token);
};

// Clear auth token
export const clearAuthToken = (): void => {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user');
};

// Base fetch wrapper with authentication
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'An error occurred',
      };
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// HTTP Methods
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
};

export type { ApiResponse, PaginatedResponse };
