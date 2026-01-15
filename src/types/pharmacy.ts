// User roles
export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  avatar?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// Medicine unit types - supports various product types
export type UnitType = 
  // Tablets and pills
  | 'TABLET' | 'tablet' | 'SINGLE' | 'single' | 'TAB' | 'tab'
  // Packaging
  | 'STRIP' | 'strip' | 'BOX' | 'box' | 'PACK' | 'pack' | 'PAIR' | 'pair'
  // Liquids
  | 'BOTTLE' | 'bottle' | 'ML' | 'ml' | 'SYRUP' | 'syrup'
  // Weight-based
  | 'GRAM' | 'gram' | 'G' | 'g' | 'KG' | 'kg'
  // Individual items
  | 'PIECE' | 'piece' | 'PCS' | 'pcs' | 'UNIT' | 'unit' | 'EACH' | 'each'
  // Services
  | 'SERVICE' | 'service' | 'INJECTION' | 'injection' | 'SESSION' | 'session'
  // Custom
  | string;

// Product type categories for better organization
export type ProductCategory = 
  | 'tablets' 
  | 'syrup' 
  | 'injection' 
  | 'cream' 
  | 'drops' 
  | 'powder' 
  | 'device' 
  | 'consumable' 
  | 'service'
  | 'other';

// Helper to get unit labels
export const getUnitLabel = (type: UnitType): string => {
  const labels: Record<string, string> = {
    // Tablets - proper capitalization
    tablet: 'Tablet', TABLET: 'Tablet', single: 'Tablet', SINGLE: 'Tablet', tab: 'Tablet', TAB: 'Tablet',
    tablets: 'Tablet', TABLETS: 'Tablet',
    // Packaging
    strip: 'Strip', STRIP: 'Strip',
    box: 'Box', BOX: 'Box',
    pack: 'Pack', PACK: 'Pack',
    pair: 'Pair', PAIR: 'Pair',
    // Liquids
    bottle: 'Bottle', BOTTLE: 'Bottle',
    ml: 'ml', ML: 'ml',
    syrup: 'Syrup', SYRUP: 'Syrup',
    // Weight
    gram: 'g', GRAM: 'g', g: 'g', G: 'g',
    kg: 'kg', KG: 'kg',
    // Items - proper capitalization
    piece: 'Piece', PIECE: 'Piece', pcs: 'Piece', PCS: 'Piece', Pc: 'Piece', pc: 'Piece',
    unit: 'Unit', UNIT: 'Unit',
    each: 'Each', EACH: 'Each',
    // Services
    service: 'Service', SERVICE: 'Service',
    injection: 'Injection', INJECTION: 'Injection',
    session: 'Session', SESSION: 'Session',
  };
  return labels[type] || type;
};

// Common unit presets for quick selection
export const UNIT_PRESETS = {
  tablets: [
    { type: 'TABLET', label: 'Tablet/Single', defaultQty: 1 },
    { type: 'STRIP', label: 'Strip', defaultQty: 10 },
    { type: 'BOX', label: 'Box', defaultQty: 100 },
  ],
  tabletsPair: [
    { type: 'PAIR', label: 'Pair (2 tablets)', defaultQty: 2 },
    { type: 'STRIP', label: 'Strip', defaultQty: 10 },
    { type: 'BOX', label: 'Box', defaultQty: 100 },
  ],
  syrup: [
    { type: 'BOTTLE', label: 'Bottle', defaultQty: 1 },
    { type: 'BOX', label: 'Box (1 bottle)', defaultQty: 1 },
  ],
  liquid: [
    { type: 'ML', label: 'Per ml', defaultQty: 1 },
    { type: 'BOTTLE', label: 'Bottle', defaultQty: 100 },
  ],
  liquidBottles: [
    { type: 'BOTTLE', label: '100ml Bottle', defaultQty: 100 },
    { type: 'BOTTLE', label: '200ml Bottle', defaultQty: 200 },
    { type: 'BOTTLE', label: '500ml Bottle', defaultQty: 500 },
  ],
  weight: [
    { type: 'GRAM', label: 'Per gram', defaultQty: 1 },
    { type: 'PACK', label: '50g Pack', defaultQty: 50 },
    { type: 'PACK', label: '100g Pack', defaultQty: 100 },
  ],
  individual: [
    { type: 'PIECE', label: 'Per piece', defaultQty: 1 },
    { type: 'PACK', label: 'Pack', defaultQty: 1 },
    { type: 'BOX', label: 'Box', defaultQty: 1 },
  ],
  service: [
    { type: 'SERVICE', label: 'Per service', defaultQty: 1 },
    { type: 'SESSION', label: 'Per session', defaultQty: 1 },
    { type: 'INJECTION', label: 'Per injection', defaultQty: 1 },
  ],
};

export interface MedicineUnit {
  type: UnitType;
  quantity: number; // e.g., strip = 10 tabs, box = 100 tabs
  price: number;
  label?: string; // Custom label like "500ml Bottle" or "50g Pack"
}

// Product type for flexible categorization
export type ProductType = 
  | 'tablets'           // Regular tablets (single, strip, box)
  | 'tablets_pair'      // Tablets sold as pairs (Maramoja)
  | 'syrup'             // Syrups (bottle per box)
  | 'liquid_bottle'     // Liquids sold by bottle size (spirit, peroxide)
  | 'weight_based'      // Items sold by weight (cotton wool)
  | 'individual'        // Individual items (condoms, Eno)
  | 'service'           // Services (injections, family planning)
  | 'box_only'          // Items sold only per box (Azithromycin)
  | 'custom';           // Custom configuration

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: Date;
  units: MedicineUnit[];
  stockQuantity: number; // in smallest unit
  reorderLevel: number;
  supplierId: string;
  costPrice: number; // per smallest unit
  imageUrl?: string;
  description?: string; // Product description
  productType?: ProductType; // Type of product for unit configuration
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
}
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country?: string;
  notes?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  unitType: UnitType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  orderNumber?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'sent' | 'received' | 'cancelled' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  createdAt: Date;
  expectedDate?: Date;
}

export interface PurchaseOrderItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  salary: number;
  bankAccount?: string;
  startDate: Date;
  status: 'active' | 'inactive';
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netPay: number;
  status: 'pending' | 'paid';
  paidAt?: Date;
}

export interface StockEntry {
  id: string;
  type: 'opening' | 'closing' | 'adjustment';
  month: string; // YYYY-MM
  entries: StockItem[];
  totalValue: number;
  createdAt: Date;
}

export interface StockItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  boxes?: number;
  strips?: number;
  singles?: number;
  unitCost: number;
  totalValue: number;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  createdBy: string;
  createdByRole?: UserRole;
  createdAt: Date;
}

export interface DailyReport {
  date: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  transactionCount: number;
}

export interface MonthlyReport {
  month: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  openingStock: number;
  closingStock: number;
  purchases: number;
  cogsSold: number;
  expenses: number;
  netProfit: number;
}

export interface CashierSalesReport {
  cashierId: string;
  cashierName: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalSales: number;
  totalCash: number;
  totalMpesa: number;
  totalCard: number;
  transactionCount: number;
  sales: Sale[];
}

// Stock movement tracking for loss prevention
export type StockMovementType = 'sale' | 'purchase' | 'adjustment' | 'loss' | 'return' | 'expired';

export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName: string;
  type: StockMovementType;
  quantity: number; // positive for additions, negative for deductions
  previousStock: number;
  newStock: number;
  unitType?: UnitType;
  referenceId?: string; // sale ID, purchase order ID, etc.
  reason?: string;
  performedBy: string;
  performedByRole: UserRole;
  createdAt: Date;
}

export interface StockAudit {
  id: string;
  medicineId: string;
  medicineName: string;
  expectedStock: number;
  actualStock: number;
  variance: number;
  varianceReason?: string;
  auditedBy: string;
  auditedAt: Date;
}

// Additional types for user management
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

export interface UserStats {
  totalUsersCount: number;
  adminUsersCount: number;
  managerUsersCount: number;
  pharmacistUsersCount: number;
  cashierUsersCount: number;
}

export interface PaginatedResponse<T> {
  users: T[];
  total: number;
  page: number;
  pages: number;
}