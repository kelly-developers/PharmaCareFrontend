# PharmaCare - Pharmacy Management System Documentation

## System Overview

PharmaCare is a comprehensive pharmacy management system built with React + TypeScript frontend and a Spring Boot backend. This document covers all functionality, API requirements, and backend updates needed.

---

## 🔐 Authentication

### Current Status: ✅ Working

### Frontend Files:
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/services/authService.ts` - API service for auth
- `src/pages/Login.tsx` - Login page

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | User login | ✅ Working |
| POST | `/api/auth/register` | User registration | ✅ Working |
| POST | `/api/auth/logout` | User logout | ✅ Working |
| GET | `/api/auth/verify` | Verify token | ✅ Working |

### Login Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin|manager|pharmacist|cashier",
      "isActive": true
    }
  }
}
```

---

## 👥 User Management

### Current Status: ⚠️ NOT WORKING - Needs Backend Fix

### Frontend Files:
- `src/pages/UserManagement.tsx` - User CRUD interface
- `src/services/userService.ts` - API service

### Issue:
Creating users via `/api/users` POST endpoint is failing. The backend needs to implement user creation with proper password hashing.

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users` | List users (paginated) | ✅ Working |
| GET | `/api/users/:id` | Get user by ID | ✅ Working |
| POST | `/api/users` | Create user | ❌ NOT WORKING |
| PUT | `/api/users/:id` | Update user | ✅ Working |
| DELETE | `/api/users/:id` | Deactivate user | ✅ Working |
| PATCH | `/api/users/:id/activate` | Activate user | ✅ Working |
| GET | `/api/users/stats` | User statistics | ✅ Working |

### Create User Request (needs backend implementation):
```json
{
  "name": "Jane Doe",
  "email": "jane@pharmacy.ke",
  "password": "securepassword123",
  "role": "cashier",
  "phone": "+254700000000"
}
```

### Backend Fix Required:
1. Implement POST `/api/users` endpoint
2. Hash password using BCrypt before saving
3. Return created user (without password)
4. Handle email uniqueness validation

---

## 💊 Medicine/Inventory Management

### Current Status: ⚠️ PARTIALLY WORKING - Add Medicine Not Working

### Frontend Files:
- `src/pages/Inventory.tsx` - Inventory list and management
- `src/pages/CreateMedicine.tsx` - Create new medicine form
- `src/services/medicineService.ts` - API service
- `src/contexts/StockContext.tsx` - Stock state management

### Issue:
Creating medicines via POST `/api/medicines` is failing. The backend may have validation issues or missing required fields.

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/medicines` | List medicines (paginated) | ✅ Working |
| GET | `/api/medicines/:id` | Get medicine by ID | ✅ Working |
| POST | `/api/medicines` | Create medicine | ❌ NOT WORKING |
| PUT | `/api/medicines/:id` | Update medicine | ✅ Working |
| DELETE | `/api/medicines/:id` | Delete medicine | ✅ Working |
| POST | `/api/medicines/:id/add-stock` | Add stock | ✅ Working |
| POST | `/api/medicines/:id/deduct-stock` | Deduct stock | ✅ Working |
| GET | `/api/medicines/low-stock` | Low stock items | ✅ Working |
| GET | `/api/medicines/expiring` | Expiring items | ✅ Working |

### Create Medicine Request (needs backend fix):
```json
{
  "name": "Paracetamol 500mg",
  "generic_name": "Acetaminophen",
  "category": "Pain Relief",
  "manufacturer": "PharmaCo Ltd",
  "batch_number": "BATCH-2024-001",
  "expiry_date": "2025-12-31",
  "stock_quantity": 1000,
  "reorder_level": 100,
  "cost_price": 50.00,
  "unit_price": 75.00,
  "product_type": "tablets",
  "description": "Pain relief medication",
  "units": "[{\"type\":\"TABLET\",\"quantity\":1,\"price\":7.5,\"label\":\"Tablet\"},{\"type\":\"STRIP\",\"quantity\":10,\"price\":70,\"label\":\"Strip (10)\"}]"
}
```

### Backend Fix Required:
1. Ensure POST `/api/medicines` accepts all fields
2. Parse `units` field as JSON string (frontend sends stringified JSON)
3. Handle null/optional fields gracefully
4. Return created medicine with generated ID

---

## 📝 Prescriptions

### Current Status: ⚠️ NOT WORKING - Create Prescription Failing

### Frontend Files:
- `src/pages/Prescriptions.tsx` - Prescription management
- `src/services/prescriptionService.ts` - API service
- `src/contexts/PrescriptionsContext.tsx` - State management

### Issue:
Creating prescriptions via POST `/api/prescriptions` is failing. Backend should extract `createdBy` from the JWT token, not require it in the request body.

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/prescriptions` | List prescriptions | ✅ Working |
| GET | `/api/prescriptions/:id` | Get by ID | ✅ Working |
| POST | `/api/prescriptions` | Create prescription | ❌ NOT WORKING |
| PUT | `/api/prescriptions/:id` | Update prescription | ✅ Working |
| DELETE | `/api/prescriptions/:id` | Delete prescription | ✅ Working |
| PATCH | `/api/prescriptions/:id/status` | Update status | ✅ Working |
| GET | `/api/prescriptions/pending` | Pending prescriptions | ✅ Working |

### Create Prescription Request:
```json
{
  "patientName": "John Smith",
  "patientPhone": "0712345678",
  "diagnosis": "Upper Respiratory Tract Infection",
  "notes": "Take with food",
  "items": [
    {
      "medicine": "Amoxicillin 500mg",
      "dosage": "1 tablet",
      "frequency": "Three times daily",
      "duration": "7 days",
      "instructions": "Take after meals"
    }
  ]
}
```

### Backend Fix Required:
1. Extract `createdBy` and `createdByName` from JWT token (not request body)
2. Set initial status as "PENDING"
3. Generate prescription ID and timestamp
4. Return created prescription

---

## 🛒 Sales / Point of Sale (POS)

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/POS.tsx` - Point of Sale interface
- `src/pages/Sales.tsx` - Sales history and analytics
- `src/pages/MySales.tsx` - Cashier's own sales
- `src/services/salesService.ts` - API service
- `src/contexts/SalesContext.tsx` - State management

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/sales` | List sales | ✅ Working |
| GET | `/api/sales/:id` | Get sale by ID | ✅ Working |
| POST | `/api/sales` | Create sale | ✅ Working |
| GET | `/api/sales/cashier/:id` | Sales by cashier | ✅ Working |
| GET | `/api/sales/today` | Today's sales | ✅ Working |
| GET | `/api/sales/stats` | Sales statistics | ✅ Working |

### Create Sale Request:
```json
{
  "items": [
    {
      "medicineId": "med-uuid",
      "medicineName": "Paracetamol 500mg",
      "unitType": "TABLET",
      "quantity": 10,
      "unitPrice": 7.5,
      "totalPrice": 75,
      "costPrice": 5.0
    }
  ],
  "paymentMethod": "cash|mpesa|card",
  "customerName": "Walk-in",
  "customerPhone": "",
  "discount": 0,
  "notes": ""
}
```

---

## 💰 Expenses

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/Expenses.tsx` - Expense management
- `src/pages/CashierExpenses.tsx` - Cashier expense entry
- `src/services/expenseService.ts` - API service
- `src/contexts/ExpensesContext.tsx` - State management

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/expenses` | List expenses | ✅ Working |
| GET | `/api/expenses/:id` | Get by ID | ✅ Working |
| POST | `/api/expenses` | Create expense | ✅ Working |
| PUT | `/api/expenses/:id` | Update expense | ✅ Working |
| DELETE | `/api/expenses/:id` | Delete expense | ✅ Working |
| GET | `/api/expenses/stats` | Expense statistics | ✅ Working |

---

## 📦 Purchase Orders

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/PurchaseOrders.tsx` - Purchase order management
- `src/services/purchaseOrderService.ts` - API service

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/purchase-orders` | List orders | ✅ Working |
| GET | `/api/purchase-orders/:id` | Get by ID | ✅ Working |
| POST | `/api/purchase-orders` | Create order | ✅ Working |
| PUT | `/api/purchase-orders/:id` | Update order | ✅ Working |
| POST | `/api/purchase-orders/:id/submit` | Submit order | ✅ Working |
| POST | `/api/purchase-orders/:id/approve` | Approve order | ✅ Working |
| POST | `/api/purchase-orders/:id/receive` | Receive order | ✅ Working |
| POST | `/api/purchase-orders/:id/cancel` | Cancel order | ✅ Working |

---

## 🏭 Suppliers

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/Suppliers.tsx` - Supplier management
- `src/services/supplierService.ts` - API service

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/suppliers` | List suppliers | ✅ Working |
| GET | `/api/suppliers/:id` | Get by ID | ✅ Working |
| POST | `/api/suppliers` | Create supplier | ✅ Working |
| PUT | `/api/suppliers/:id` | Update supplier | ✅ Working |
| DELETE | `/api/suppliers/:id` | Delete supplier | ✅ Working |

---

## 📊 Reports & Analytics

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/Reports.tsx` - Reports dashboard
- `src/pages/Dashboard.tsx` - Main dashboard
- `src/services/reportService.ts` - API service

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/reports/dashboard` | Dashboard stats | ✅ Working |
| GET | `/api/reports/income-statement` | P&L statement | ✅ Working |
| GET | `/api/reports/balance-sheet` | Balance sheet | ✅ Working |
| GET | `/api/reports/cash-flow` | Cash flow | ✅ Working |
| GET | `/api/reports/sales-trend` | Sales trend | ✅ Working |
| GET | `/api/reports/sales-by-category` | Category breakdown | ✅ Working |
| GET | `/api/reports/inventory-value` | Inventory value | ✅ Working |
| GET | `/api/reports/annual-summary` | Annual summary | ✅ Working |

---

## 🏷️ Categories

### Current Status: ✅ Working

### Frontend Files:
- `src/pages/MedicineCategories.tsx` - Category management
- `src/services/categoryService.ts` - API service
- `src/contexts/CategoriesContext.tsx` - State management

### Backend Endpoints Required:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/categories` | List categories | ✅ Working |
| GET | `/api/categories/:id` | Get by ID | ✅ Working |
| POST | `/api/categories` | Create category | ✅ Working |
| PUT | `/api/categories/:id` | Update category | ✅ Working |
| DELETE | `/api/categories/:id` | Delete category | ✅ Working |

---

## ⚙️ Settings

### Current Status: ⚠️ UI Only - No Backend Persistence

### Frontend Files:
- `src/pages/Settings.tsx` - Settings page

### Issue:
Settings are displayed in UI but not persisted to backend. Changes are not saved.

### Backend Implementation Needed:

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/settings` | Get all settings | ❌ NOT IMPLEMENTED |
| PUT | `/api/settings` | Update settings | ❌ NOT IMPLEMENTED |

### Settings Structure Needed:
```json
{
  "pharmacy": {
    "name": "PharmaCare Kenya",
    "licenseNo": "PPB-2024-12345",
    "phone": "+254 722 123 456",
    "email": "info@pharmacare.co.ke",
    "address": "Kenyatta Avenue, CBD, Nairobi"
  },
  "notifications": {
    "lowStockAlerts": true,
    "expiryAlerts": true,
    "dailySalesSummary": false,
    "newOrderNotifications": true
  },
  "printing": {
    "receiptHeader": "PharmaCare Kenya",
    "receiptFooter": "Thank you for shopping with us!",
    "autoPrint": true,
    "includeBatchNumbers": false
  },
  "security": {
    "requireLoginForPOS": true,
    "autoLogoutMinutes": 30,
    "managerApprovalForDiscounts": true,
    "twoFactorAuth": false
  },
  "backup": {
    "autoBackup": true,
    "backupFrequency": "daily"
  }
}
```

---

## 🔴 CRITICAL BACKEND FIXES NEEDED

### 1. User Creation (HIGH PRIORITY)
**Endpoint:** POST `/api/users`
**Issue:** Returns error when creating users
**Fix Required:**
- Accept user data with password
- Hash password using BCrypt
- Save to database
- Return created user (excluding password)

### 2. Medicine Creation (HIGH PRIORITY)
**Endpoint:** POST `/api/medicines`
**Issue:** Returns error when creating medicines
**Fix Required:**
- Accept all medicine fields including stringified `units` JSON
- Parse units JSON string to array
- Handle nullable fields (generic_name, manufacturer, etc.)
- Generate UUID for new medicine
- Return created medicine

### 3. Prescription Creation (MEDIUM PRIORITY)
**Endpoint:** POST `/api/prescriptions`
**Issue:** Returns error when creating prescriptions
**Fix Required:**
- Extract user ID from JWT token for `createdBy`
- Get user name from database for `createdByName`
- Do NOT require these fields in request body
- Set status to "PENDING"
- Return created prescription

### 4. Settings Persistence (LOW PRIORITY)
**Endpoints:** GET/PUT `/api/settings`
**Issue:** Not implemented
**Fix Required:**
- Create settings table
- Implement GET to retrieve settings
- Implement PUT to update settings

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── layout/          # Layout components (MainLayout, Sidebar)
│   ├── reports/         # Report components
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts for state management
│   ├── AuthContext.tsx
│   ├── CategoriesContext.tsx
│   ├── ExpensesContext.tsx
│   ├── PrescriptionsContext.tsx
│   ├── SalesContext.tsx
│   └── StockContext.tsx
├── pages/               # Page components
├── services/            # API service functions
│   ├── api.ts           # Base API configuration
│   ├── authService.ts
│   ├── categoryService.ts
│   ├── expenseService.ts
│   ├── medicineService.ts
│   ├── prescriptionService.ts
│   ├── purchaseOrderService.ts
│   ├── reportService.ts
│   ├── salesService.ts
│   ├── stockService.ts
│   ├── supplierService.ts
│   └── userService.ts
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

---

## 🌐 Environment Variables

```env
VITE_API_BASE_URL=https://pharma-care-backend-hdyf.onrender.com/api
```

---

## 📝 Response Format Convention

All API responses should follow this format:

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message here",
  "message": "Human-readable error description"
}
```

### Paginated Response:
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```
