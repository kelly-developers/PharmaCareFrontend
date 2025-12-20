// User roles
export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

// Medicine unit types
export type UnitType = 'single' | 'strip' | 'box' | 'pair' | 'bottle';

export interface MedicineUnit {
  type: UnitType;
  quantity: number; // e.g., strip = 10 tabs, box = 100 tabs
  price: number;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: Date;
  units: MedicineUnit[];
  stockQuantity: number; // in smallest unit (single tab)
  reorderLevel: number;
  supplierId: string;
  costPrice: number; // per smallest unit
  imageUrl?: string; // Medicine image
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  createdAt: Date;
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
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'sent' | 'received' | 'cancelled';
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
