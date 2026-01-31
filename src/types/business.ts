// Business/Tenant Types for Multi-Tenant SaaS

export type BusinessType = 'pharmacy' | 'general' | 'supermarket' | 'retail';

export type BusinessStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessType: BusinessType;
  schemaName: string; // Database schema name for tenant isolation
  address?: string;
  city?: string;
  country?: string;
  logo?: string;
  subscriptionPlan?: 'free' | 'basic' | 'premium' | 'enterprise';
  status: BusinessStatus;
  createdAt: Date;
  updatedAt?: Date;
  ownerId?: string; // Primary owner/admin user ID
}

export interface CreateBusinessRequest {
  name: string;
  email: string;
  phone: string;
  businessType: BusinessType;
  schemaName: string;
  address?: string;
  city?: string;
  country?: string;
  // First admin user for this business
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: BusinessStatus;
  logo?: string;
}

// Terminology mapping for different business types
export const BUSINESS_TERMINOLOGY: Record<BusinessType, {
  item: string;
  items: string;
  itemCategory: string;
  itemCategories: string;
  stock: string;
  prescription: string;
  supplier: string;
  createItem: string;
}> = {
  pharmacy: {
    item: 'Medicine',
    items: 'Medicines',
    itemCategory: 'Medicine Category',
    itemCategories: 'Medicine Categories',
    stock: 'Stock',
    prescription: 'Prescription',
    supplier: 'Supplier',
    createItem: 'Create Medicine',
  },
  general: {
    item: 'Product',
    items: 'Products',
    itemCategory: 'Product Category',
    itemCategories: 'Product Categories',
    stock: 'Inventory',
    prescription: 'Order',
    supplier: 'Vendor',
    createItem: 'Add Product',
  },
  supermarket: {
    item: 'Product',
    items: 'Products',
    itemCategory: 'Department',
    itemCategories: 'Departments',
    stock: 'Inventory',
    prescription: 'Order',
    supplier: 'Vendor',
    createItem: 'Add Product',
  },
  retail: {
    item: 'Item',
    items: 'Items',
    itemCategory: 'Category',
    itemCategories: 'Categories',
    stock: 'Stock',
    prescription: 'Order',
    supplier: 'Supplier',
    createItem: 'Add Item',
  },
};

// Features available per business type
export const BUSINESS_FEATURES: Record<BusinessType, string[]> = {
  pharmacy: [
    'medicines',
    'prescriptions',
    'medicineCategories',
    'expiryTracking',
    'batchTracking',
    'suppliers',
    'pos',
    'sales',
    'expenses',
    'reports',
    'users',
  ],
  general: [
    'products',
    'productCategories',
    'suppliers',
    'pos',
    'sales',
    'expenses',
    'reports',
    'users',
  ],
  supermarket: [
    'products',
    'departments',
    'suppliers',
    'pos',
    'sales',
    'expenses',
    'reports',
    'users',
    'barcodeScanning',
  ],
  retail: [
    'items',
    'categories',
    'suppliers',
    'pos',
    'sales',
    'expenses',
    'reports',
    'users',
  ],
};

// Check if a feature is available for a business type
export const hasFeature = (businessType: BusinessType, feature: string): boolean => {
  return BUSINESS_FEATURES[businessType]?.includes(feature) ?? false;
};

// Get terminology for current business
export const getTerminology = (businessType: BusinessType) => {
  return BUSINESS_TERMINOLOGY[businessType] || BUSINESS_TERMINOLOGY.general;
};
