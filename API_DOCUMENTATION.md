# PharmaPOS Kenya - Spring Boot Backend API Documentation

This document provides comprehensive documentation for all backend API endpoints required for the PharmaPOS Kenya pharmacy management system.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Users API](#users-api)
4. [Medicines API](#medicines-api)
5. [Categories API](#categories-api)
6. [Sales API](#sales-api)
7. [Stock Management API](#stock-management-api)
8. [Expenses API](#expenses-api)
9. [Prescriptions API](#prescriptions-api)
10. [Suppliers API](#suppliers-api)
11. [Purchase Orders API](#purchase-orders-api)
12. [Employees API](#employees-api)
13. [Reports API](#reports-api)
14. [Database Schema](#database-schema)

---

## Overview

### Base URL
```
http://localhost:8080/api/v1
```

### Authentication
All endpoints (except login) require a JWT Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### Response Format
All API responses follow this standard format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Pagination
Paginated endpoints return:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Authentication

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@pharmacy.ke",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "name": "John Kamau",
      "email": "admin@pharmacy.ke",
      "role": "admin",
      "phone": "+254712345678",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Roles:** `admin`, `manager`, `pharmacist`, `cashier`

### POST /auth/register
Register a new user (admin only).

**Request Body:**
```json
{
  "name": "Jane Wanjiku",
  "email": "jane@pharmacy.ke",
  "password": "securePassword123",
  "role": "cashier",
  "phone": "+254722334455"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token"
  }
}
```

### POST /auth/logout
Logout current user and invalidate token.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/refresh
Refresh the JWT token.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token"
  }
}
```

### POST /auth/change-password
Change current user's password.

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

---

## Users API

### GET /users
Get all users (admin only).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `role` (string): Filter by role
- `search` (string): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Kamau",
      "email": "john@pharmacy.ke",
      "role": "admin",
      "phone": "+254712345678",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /users/:id
Get user by ID.

### PUT /users/:id
Update user details.

**Request Body:**
```json
{
  "name": "John Kamau Updated",
  "email": "john.updated@pharmacy.ke",
  "role": "manager",
  "phone": "+254712345678",
  "isActive": true
}
```

### DELETE /users/:id
Deactivate user (soft delete).

---

## Medicines API

### GET /medicines
Get all medicines with optional filtering.

**Query Parameters:**
- `page`, `limit`: Pagination
- `category` (string): Filter by category
- `search` (string): Search by name, generic name, or batch number
- `lowStock` (boolean): Only show low stock items
- `expiringSoon` (boolean): Only show items expiring in 90 days

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "med-uuid",
      "name": "Paracetamol 500mg",
      "genericName": "Acetaminophen",
      "category": "Pain Relief",
      "manufacturer": "GSK Kenya",
      "batchNumber": "BATCH-2024-001",
      "expiryDate": "2025-12-31",
      "units": [
        { "type": "single", "quantity": 1, "price": 10 },
        { "type": "strip", "quantity": 10, "price": 90 },
        { "type": "box", "quantity": 100, "price": 800 }
      ],
      "stockQuantity": 5000,
      "reorderLevel": 500,
      "supplierId": "sup-uuid",
      "costPrice": 5,
      "imageUrl": "https://...",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ]
}
```

### GET /medicines/:id
Get single medicine by ID.

### POST /medicines
Create a new medicine.

**Request Body:**
```json
{
  "name": "Amoxicillin 250mg",
  "genericName": "Amoxicillin Trihydrate",
  "category": "Antibiotics",
  "manufacturer": "Cosmos Pharma",
  "batchNumber": "AMX-2024-001",
  "expiryDate": "2025-06-30",
  "units": [
    { "type": "single", "quantity": 1, "price": 15 },
    { "type": "strip", "quantity": 10, "price": 140 }
  ],
  "stockQuantity": 2000,
  "reorderLevel": 200,
  "supplierId": "sup-uuid",
  "costPrice": 8,
  "imageUrl": "https://..."
}
```

### PUT /medicines/:id
Update medicine details.

### DELETE /medicines/:id
Delete medicine (soft delete, requires admin).

### POST /medicines/:id/deduct-stock
Deduct stock when a sale is made.

**Request Body:**
```json
{
  "quantity": 5,
  "unitType": "strip",
  "referenceId": "sale-uuid",
  "performedBy": "user-uuid",
  "performedByRole": "cashier"
}
```

### POST /medicines/:id/add-stock
Add stock (for purchases/returns).

**Request Body:**
```json
{
  "quantity": 100,
  "referenceId": "po-uuid",
  "performedBy": "user-uuid",
  "performedByRole": "manager"
}
```

---

## Categories API

### GET /categories
Get all medicine categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-uuid",
      "name": "Antibiotics",
      "description": "Medicines that fight bacterial infections",
      "medicineCount": 45,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /categories
Create new category.

**Request Body:**
```json
{
  "name": "Cardiovascular",
  "description": "Heart and blood vessel medicines"
}
```

### PUT /categories/:id
Update category.

### DELETE /categories/:id
Delete category (only if no medicines assigned).

### PATCH /categories/:name/increment-count
Increment medicine count for a category.

---

## Sales API

### GET /sales
Get all sales with optional filtering.

**Query Parameters:**
- `page`, `limit`: Pagination
- `startDate`, `endDate` (ISO string): Date range filter
- `cashierId` (string): Filter by cashier
- `paymentMethod` (string): `cash`, `mpesa`, `card`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sale-uuid",
      "items": [
        {
          "medicineId": "med-uuid",
          "medicineName": "Paracetamol 500mg",
          "unitType": "strip",
          "quantity": 2,
          "unitPrice": 90,
          "totalPrice": 180,
          "costPrice": 50
        }
      ],
      "subtotal": 180,
      "discount": 0,
      "tax": 0,
      "total": 180,
      "paymentMethod": "mpesa",
      "cashierId": "user-uuid",
      "cashierName": "Mary Akinyi",
      "customerName": "John Doe",
      "customerPhone": "+254712345678",
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ]
}
```

### GET /sales/:id
Get single sale by ID.

### POST /sales
Create a new sale (cashier/admin).

**Request Body:**
```json
{
  "items": [
    {
      "medicineId": "med-uuid",
      "medicineName": "Paracetamol 500mg",
      "unitType": "strip",
      "quantity": 2,
      "unitPrice": 90,
      "totalPrice": 180,
      "costPrice": 50
    }
  ],
  "subtotal": 180,
  "discount": 0,
  "tax": 0,
  "total": 180,
  "paymentMethod": "cash",
  "cashierId": "user-uuid",
  "cashierName": "Mary Akinyi",
  "customerName": "John Doe",
  "customerPhone": "+254712345678"
}
```

**Side Effects:**
- Automatically deducts stock for each item
- Creates stock movement records

### GET /sales/today
Get today's sales summary.

**Query Parameters:**
- `cashierId` (optional): Filter by specific cashier

**Response:**
```json
{
  "success": true,
  "data": {
    "sales": [ ... ],
    "summary": {
      "totalAmount": 45000,
      "totalTransactions": 28,
      "cashAmount": 15000,
      "mpesaAmount": 25000,
      "cardAmount": 5000,
      "cashTransactions": 10,
      "mpesaTransactions": 15,
      "cardTransactions": 3
    }
  }
}
```

### GET /sales/report
Get sales report for a date range.

**Query Parameters:**
- `startDate`, `endDate`: Required date range

---

## Stock Management API

### GET /stock/movements
Get all stock movements.

**Query Parameters:**
- `medicineId`: Filter by medicine
- `type`: `sale`, `purchase`, `adjustment`, `loss`
- `startDate`, `endDate`: Date range

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mov-uuid",
      "medicineId": "med-uuid",
      "medicineName": "Paracetamol 500mg",
      "type": "sale",
      "quantity": -20,
      "previousStock": 5000,
      "newStock": 4980,
      "referenceId": "sale-uuid",
      "reason": null,
      "performedBy": "user-uuid",
      "performedByName": "Mary Akinyi",
      "performedByRole": "cashier",
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ]
}
```

### POST /stock/loss
Record stock loss (damage, theft, expiry).

**Request Body:**
```json
{
  "medicineId": "med-uuid",
  "quantity": 10,
  "reason": "Expired stock disposed",
  "performedBy": "user-uuid",
  "performedByRole": "manager"
}
```

### POST /stock/adjustment
Record stock adjustment (corrections).

**Request Body:**
```json
{
  "medicineId": "med-uuid",
  "quantity": 5,
  "reason": "Physical count correction",
  "performedBy": "user-uuid",
  "performedByRole": "admin"
}
```

### GET /stock/monthly
Get monthly stock records.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "openingStock": [...],
      "closingStock": [...],
      "uploadedAt": "2024-01-31T23:59:00Z"
    }
  ]
}
```

### POST /stock/opening
Upload opening stock for a month.

### POST /stock/closing
Upload closing stock for a month.

---

## Expenses API

### GET /expenses
Get all expenses.

**Query Parameters:**
- `page`, `limit`: Pagination
- `category`: Filter by category
- `startDate`, `endDate`: Date range
- `status`: `pending`, `approved`, `rejected`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "exp-uuid",
      "title": "Electricity Bill",
      "description": "Monthly electricity payment",
      "amount": 15000,
      "category": "Utilities",
      "status": "approved",
      "date": "2024-01-15",
      "receiptUrl": "https://...",
      "approvedBy": "manager-uuid",
      "approvedByName": "Jane Wanjiku",
      "createdBy": "user-uuid",
      "createdByName": "Admin User",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /expenses
Create new expense.

**Request Body:**
```json
{
  "title": "Office Supplies",
  "description": "Printer paper and ink",
  "amount": 5000,
  "category": "Supplies",
  "date": "2024-01-20",
  "receiptUrl": "https://..."
}
```

### PUT /expenses/:id
Update expense.

### DELETE /expenses/:id
Delete expense (pending only).

### PATCH /expenses/:id/approve
Approve expense (manager/admin).

**Request Body:**
```json
{
  "approvedBy": "manager-uuid"
}
```

### PATCH /expenses/:id/reject
Reject expense.

**Request Body:**
```json
{
  "rejectedBy": "manager-uuid",
  "reason": "Not a valid business expense"
}
```

---

## Prescriptions API

### GET /prescriptions
Get all prescriptions.

**Query Parameters:**
- `status`: `pending`, `dispensed`, `cancelled`
- `patientPhone`: Search by patient phone
- `createdBy`: Filter by creator

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "presc-uuid",
      "patientName": "Alice Mwangi",
      "patientPhone": "+254712345678",
      "diagnosis": "Upper respiratory infection",
      "items": [
        {
          "medicine": "Amoxicillin 500mg",
          "dosage": "500mg",
          "frequency": "3 times daily",
          "duration": "7 days",
          "instructions": "Take with food"
        }
      ],
      "notes": "Complete the full course",
      "createdBy": "pharmacist-uuid",
      "createdAt": "2024-01-20T14:30:00Z",
      "status": "pending",
      "dispensedAt": null,
      "dispensedBy": null
    }
  ]
}
```

### POST /prescriptions
Create new prescription.

**Request Body:**
```json
{
  "patientName": "Alice Mwangi",
  "patientPhone": "+254712345678",
  "diagnosis": "Upper respiratory infection",
  "items": [
    {
      "medicine": "Amoxicillin 500mg",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "duration": "7 days",
      "instructions": "Take with food"
    }
  ],
  "notes": "Complete the full course",
  "createdBy": "pharmacist-uuid"
}
```

### PUT /prescriptions/:id
Update prescription (pending only).

### PATCH /prescriptions/:id/status
Update prescription status.

**Request Body:**
```json
{
  "status": "dispensed",
  "dispensedBy": "cashier-uuid"
}
```

### DELETE /prescriptions/:id
Delete prescription (pending only).

### GET /prescriptions/pending
Get all pending prescriptions.

### GET /prescriptions/dispensed
Get all dispensed prescriptions.

### GET /prescriptions/patient/:phone
Get prescriptions by patient phone.

### GET /prescriptions/creator/:userId
Get prescriptions by creator.

---

## Suppliers API

### GET /suppliers
Get all suppliers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sup-uuid",
      "name": "Kenya Pharma Distributors",
      "contactPerson": "Peter Kamau",
      "email": "peter@kenyapharma.co.ke",
      "phone": "+254722334455",
      "address": "Industrial Area, Nairobi",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /suppliers
Create new supplier.

### PUT /suppliers/:id
Update supplier.

### DELETE /suppliers/:id
Deactivate supplier.

### GET /suppliers/:id/orders
Get all purchase orders for a supplier.

---

## Purchase Orders API

### GET /purchase-orders
Get all purchase orders.

**Query Parameters:**
- `status`: `draft`, `pending`, `approved`, `received`, `cancelled`
- `supplierId`: Filter by supplier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "po-uuid",
      "orderNumber": "PO-2024-001",
      "supplierId": "sup-uuid",
      "supplierName": "Kenya Pharma Distributors",
      "items": [
        {
          "medicineId": "med-uuid",
          "medicineName": "Paracetamol 500mg",
          "quantity": 1000,
          "unitCost": 5,
          "totalCost": 5000
        }
      ],
      "subtotal": 5000,
      "tax": 800,
      "total": 5800,
      "status": "pending",
      "notes": "Urgent order",
      "createdBy": "manager-uuid",
      "createdByName": "Jane Wanjiku",
      "createdAt": "2024-01-20T10:30:00Z",
      "approvedBy": null,
      "approvedAt": null,
      "receivedBy": null,
      "receivedAt": null
    }
  ]
}
```

### POST /purchase-orders
Create new purchase order.

### PUT /purchase-orders/:id
Update purchase order (draft only).

### PATCH /purchase-orders/:id/approve
Approve purchase order.

### PATCH /purchase-orders/:id/receive
Mark purchase order as received.

**Side Effects:**
- Automatically adds stock for each item
- Creates stock movement records

### PATCH /purchase-orders/:id/cancel
Cancel purchase order.

---

## Employees API

### GET /employees
Get all employees.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp-uuid",
      "userId": "user-uuid",
      "name": "Mary Akinyi",
      "email": "mary@pharmacy.ke",
      "phone": "+254712345678",
      "role": "cashier",
      "department": "Sales",
      "employeeId": "EMP-001",
      "hireDate": "2023-06-15",
      "salary": 35000,
      "isActive": true,
      "bankName": "Equity Bank",
      "bankAccount": "1234567890",
      "nhifNumber": "NH123456",
      "nssfNumber": "NS123456",
      "kraPin": "A123456789X"
    }
  ]
}
```

### POST /employees
Create new employee.

### PUT /employees/:id
Update employee details.

### DELETE /employees/:id
Deactivate employee.

### GET /employees/:id/payroll
Get payroll history for employee.

### POST /employees/:id/payroll
Create payroll entry.

**Request Body:**
```json
{
  "month": "2024-01",
  "basicSalary": 35000,
  "allowances": 5000,
  "deductions": 3500,
  "netSalary": 36500,
  "paymentDate": "2024-01-31",
  "paymentMethod": "bank_transfer"
}
```

---

## Reports API

### GET /reports/dashboard
Get dashboard summary data.

**Response:**
```json
{
  "success": true,
  "data": {
    "todaySales": 45000,
    "todayTransactions": 28,
    "todayProfit": 15000,
    "totalStockItems": 50000,
    "lowStockCount": 12,
    "expiringCount": 5,
    "pendingOrders": 3
  }
}
```

### GET /reports/sales-summary
Get sales summary for a period.

**Query Parameters:**
- `startDate`, `endDate`: Required
- `groupBy`: `day`, `week`, `month`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSales": 1500000,
    "totalCost": 900000,
    "grossProfit": 600000,
    "profitMargin": 40,
    "byPaymentMethod": {
      "cash": 500000,
      "mpesa": 800000,
      "card": 200000
    },
    "byCategory": [
      { "category": "Pain Relief", "amount": 300000 }
    ],
    "dailyBreakdown": [
      { "date": "2024-01-15", "sales": 45000, "profit": 15000 }
    ]
  }
}
```

### GET /reports/stock-summary
Get stock summary report.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 150,
    "totalQuantity": 50000,
    "totalValue": 2500000,
    "lowStockItems": [...],
    "outOfStockItems": [...],
    "expiringItems": [...],
    "byCategory": [
      { "category": "Antibiotics", "count": 45, "value": 500000 }
    ]
  }
}
```

### GET /reports/balance-sheet
Get balance sheet data.

**Query Parameters:**
- `asOf`: Date (defaults to today)

**Response:**
```json
{
  "success": true,
  "data": {
    "asOf": "2024-01-31",
    "assets": {
      "currentAssets": {
        "cash": 500000,
        "inventory": 2500000,
        "accountsReceivable": 150000,
        "total": 3150000
      },
      "fixedAssets": {
        "equipment": 500000,
        "furniture": 200000,
        "total": 700000
      },
      "totalAssets": 3850000
    },
    "liabilities": {
      "currentLiabilities": {
        "accountsPayable": 300000,
        "taxPayable": 50000,
        "total": 350000
      },
      "longTermLiabilities": {
        "loans": 500000,
        "total": 500000
      },
      "totalLiabilities": 850000
    },
    "equity": {
      "capital": 2500000,
      "retainedEarnings": 500000,
      "totalEquity": 3000000
    },
    "totalLiabilitiesAndEquity": 3850000
  }
}
```

### GET /reports/income-statement
Get income statement (profit & loss).

**Query Parameters:**
- `startDate`, `endDate`: Required

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-01-01", "end": "2024-01-31" },
    "revenue": {
      "sales": 1500000,
      "otherIncome": 10000,
      "totalRevenue": 1510000
    },
    "costOfGoodsSold": 900000,
    "grossProfit": 610000,
    "operatingExpenses": {
      "salaries": 200000,
      "rent": 50000,
      "utilities": 15000,
      "supplies": 10000,
      "marketing": 5000,
      "other": 5000,
      "total": 285000
    },
    "operatingProfit": 325000,
    "taxes": 48750,
    "netProfit": 276250
  }
}
```

### GET /reports/cash-flow
Get cash flow statement.

**Query Parameters:**
- `startDate`, `endDate`: Required

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'pharmacist', 'cashier')),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Medicines Table
```sql
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(255),
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 50,
  supplier_id UUID REFERENCES suppliers(id),
  cost_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Medicine Units Table
```sql
CREATE TABLE medicine_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('single', 'strip', 'box', 'pair', 'bottle')),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  medicine_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sales Table
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card')),
  cashier_id UUID REFERENCES users(id),
  cashier_name VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sale Items Table
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2)
);
```

### Stock Movements Table
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id),
  medicine_name VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('sale', 'purchase', 'adjustment', 'loss')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_id UUID,
  reason TEXT,
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(255),
  performed_by_role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Expenses Table
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  date DATE NOT NULL,
  receipt_url TEXT,
  approved_by UUID REFERENCES users(id),
  approved_by_name VARCHAR(255),
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Prescriptions Table
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50),
  diagnosis TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  dispensed_by UUID REFERENCES users(id),
  dispensed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Prescription Items Table
```sql
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT
);
```

### Suppliers Table
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Purchase Orders Table
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name VARCHAR(255),
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'received', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(255),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Purchase Order Items Table
```sql
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);
```

### Employees Table
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100),
  hire_date DATE,
  salary DECIMAL(10,2),
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  nhif_number VARCHAR(50),
  nssf_number VARCHAR(50),
  kra_pin VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payroll Table
```sql
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  month VARCHAR(7) NOT NULL,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Role-Based Access Control

| Endpoint | Admin | Manager | Pharmacist | Cashier |
|----------|-------|---------|------------|---------|
| Auth (login/logout) | ✓ | ✓ | ✓ | ✓ |
| Users (manage) | ✓ | - | - | - |
| Medicines (view) | ✓ | ✓ | ✓ | ✓ |
| Medicines (create/edit) | ✓ | ✓ | ✓ | - |
| Categories | ✓ | ✓ | ✓ | - |
| Sales (create) | ✓ | - | - | ✓ |
| Sales (view all) | ✓ | ✓ | - | - |
| Sales (own) | - | - | - | ✓ |
| Stock Management | ✓ | ✓ | - | - |
| Expenses (view) | ✓ | ✓ | - | - |
| Expenses (create) | ✓ | ✓ | - | ✓ |
| Expenses (approve) | ✓ | ✓ | - | - |
| Prescriptions | ✓ | ✓ | ✓ | ✓ |
| Suppliers | ✓ | ✓ | - | - |
| Purchase Orders | ✓ | ✓ | - | - |
| Employees | ✓ | ✓ | - | - |
| Reports (full) | ✓ | ✓ | - | - |
| Reports (limited) | - | - | ✓ | ✓ |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |

---

## Environment Variables (Spring Boot)

```properties
# Server
server.port=8080

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/pharmapos
spring.datasource.username=postgres
spring.datasource.password=yourpassword

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT
jwt.secret=your-256-bit-secret-key-here
jwt.expiration=86400000

# File Upload
spring.servlet.multipart.max-file-size=10MB
```

---

## Notes for Backend Implementation

1. **Password Hashing**: Use BCrypt for password hashing
2. **JWT Token**: Include user ID and role in the token payload
3. **Validation**: Implement request validation using Spring Validation
4. **Transactions**: Use @Transactional for operations that modify multiple tables
5. **Audit Logging**: Log all stock movements and financial transactions
6. **Currency**: All monetary values are in KES (Kenyan Shillings)
7. **Dates**: Use ISO 8601 format for all dates/timestamps
8. **UUIDs**: Use UUIDs for all primary keys for security