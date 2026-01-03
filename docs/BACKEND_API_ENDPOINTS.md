# Backend API Endpoints Documentation

This document outlines all the required Spring Boot backend endpoints for the PharmaCare system.

## Base URL
```
https://pharma-care-backend-hdyf.onrender.com
```

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require Bearer token authentication:
```
Authorization: Bearer <token>
```

---

## 1. Reports & Analytics Endpoints

### GET /api/reports/dashboard
Returns dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "todaySales": 15000,
    "todayTransactions": 25,
    "todayProfit": 5000,
    "thisMonthProfit": 150000,
    "lastMonthProfit": 120000,
    "inventoryValue": 2500000,
    "totalStockItems": 450,
    "lowStockCount": 12,
    "outOfStockCount": 3,
    "expiringSoonCount": 8,
    "todayExpenses": 2000,
    "pendingOrders": 5,
    "pendingPrescriptions": 3
  }
}
```

### GET /api/reports/annual-summary
Returns annual income tracking with profits, orders, and seller payments.

**Query Parameters:**
- `year` (optional): Year to get summary for (default: current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 18500000,
    "totalProfit": 6200000,
    "totalOrders": 15420,
    "sellerPayments": 450000,
    "monthlyData": [
      {
        "month": "Jan",
        "revenue": 1500000,
        "profit": 520000,
        "orders": 1250
      },
      {
        "month": "Feb",
        "revenue": 1650000,
        "profit": 580000,
        "orders": 1380
      }
      // ... more months
    ]
  }
}
```

### GET /api/reports/monthly-breakdown
Returns detailed monthly breakdown for the year.

**Query Parameters:**
- `year` (optional): Year to get breakdown for

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "revenue": 1500000,
      "profit": 520000,
      "expenses": 180000,
      "orders": 1250,
      "sellerPayments": 35000
    }
    // ... more months
  ]
}
```

### GET /api/reports/seller-payments
Returns payments made to sellers/cashiers.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sellerId": "user123",
      "sellerName": "John Doe",
      "totalSales": 250000,
      "commission": 0.05,
      "paid": 12500,
      "pending": 0
    }
  ]
}
```

### GET /api/reports/income-statement
Returns profit & loss statement.

**Query Parameters:**
- `startDate` (required): Start date (ISO format)
- `endDate` (required): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "revenue": 1500000,
    "costOfGoodsSold": 850000,
    "grossProfit": 650000,
    "expenses": [
      { "category": "Rent", "amount": 50000 },
      { "category": "Utilities", "amount": 15000 },
      { "category": "Salaries", "amount": 200000 }
    ],
    "totalExpenses": 265000,
    "netProfit": 385000,
    "profitMargin": 25.67
  }
}
```

### GET /api/reports/balance-sheet
Returns balance sheet data.

**Query Parameters:**
- `asOfDate` (optional): Date for balance sheet (default: today)

**Response:**
```json
{
  "success": true,
  "data": {
    "asOfDate": "2024-01-31",
    "assets": {
      "cashBalance": 500000,
      "accountsReceivable": 150000,
      "inventoryValue": 2500000,
      "totalCurrentAssets": 3150000,
      "totalAssets": 3150000
    },
    "liabilities": {
      "accountsPayable": 300000,
      "totalCurrentLiabilities": 300000,
      "totalLiabilities": 300000
    },
    "equity": {
      "retainedEarnings": 2850000,
      "totalEquity": 2850000
    },
    "totalLiabilitiesAndEquity": 3150000
  }
}
```

### GET /api/reports/cash-flow
Returns cash flow statement.

**Query Parameters:**
- `startDate` (required): Start date
- `endDate` (required): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "operatingActivities": {
      "salesReceipts": 1500000,
      "supplierPayments": -850000,
      "operatingExpenses": -265000,
      "netOperating": 385000
    },
    "investingActivities": {
      "equipmentPurchases": -50000,
      "netInvesting": -50000
    },
    "financingActivities": {
      "ownerWithdrawals": -100000,
      "netFinancing": -100000
    },
    "netChangeInCash": 235000,
    "openingBalance": 265000,
    "closingBalance": 500000
  }
}
```

### GET /api/reports/sales-trend
Returns sales trend data.

**Query Parameters:**
- `period` (required): 'week' | 'month' | 'quarter' | 'year'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "sales": 50000,
      "cost": 28000,
      "profit": 22000
    }
    // ... more data points
  ]
}
```

### GET /api/reports/sales-by-category
Returns sales breakdown by category.

**Query Parameters:**
- `startDate` (required): Start date
- `endDate` (required): End date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "Antibiotics",
      "total": 450000,
      "percentage": 30
    },
    {
      "category": "Pain Relief",
      "total": 300000,
      "percentage": 20
    }
    // ... more categories
  ]
}
```

### GET /api/reports/stock-audit
Returns stock audit report for reconciliation.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "medicineId": "med123",
      "medicineName": "Paracetamol 500mg",
      "openingStock": 500,
      "totalPurchased": 200,
      "totalSold": 150,
      "totalLost": 5,
      "totalAdjusted": 10,
      "currentStock": 555,
      "variance": 0
    }
    // ... more items
  ]
}
```

---

## 2. Stock Management Endpoints

### GET /api/stock/movements
Returns paginated stock movements.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `medicineId` (optional): Filter by medicine
- `type` (optional): Filter by movement type (SALE, PURCHASE, LOSS, ADJUSTMENT, ADDITION)
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mov123",
      "medicineId": "med123",
      "medicineName": "Paracetamol 500mg",
      "type": "SALE",
      "quantity": -10,
      "referenceId": "sale456",
      "performedBy": "cashier@example.com",
      "reason": "POS Sale",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### POST /api/stock/add
**NEW ENDPOINT** - Add stock to existing medicine (not from supplier purchase order).

**Request Body:**
```json
{
  "medicineId": "med123",
  "quantity": 100,
  "reason": "Additional Purchase",
  "batchNumber": "BATCH-2024-001",
  "expiryDate": "2025-12-31",
  "costPrice": 5000,
  "performedBy": "admin@example.com",
  "performedByRole": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "mov789",
    "medicineId": "med123",
    "type": "ADDITION",
    "quantity": 100,
    "previousStock": 450,
    "newStock": 550,
    "performedBy": "admin@example.com",
    "reason": "Additional Purchase",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "message": "Stock added successfully"
}
```

### POST /api/stock/loss
Record stock loss.

**Request Body:**
```json
{
  "medicineId": "med123",
  "quantity": 5,
  "reason": "Expired items disposed",
  "performedBy": "manager@example.com",
  "performedByRole": "manager"
}
```

### POST /api/stock/adjustment
Record stock adjustment (correction).

**Request Body:**
```json
{
  "medicineId": "med123",
  "quantity": 10,
  "reason": "Physical count correction",
  "performedBy": "admin@example.com",
  "performedByRole": "admin"
}
```

### GET /api/stock/current/{medicineId}
Get current stock for a specific medicine.

**Response:**
```json
{
  "success": true,
  "data": {
    "medicineId": "med123",
    "medicineName": "Paracetamol 500mg",
    "currentStock": 550,
    "reorderLevel": 100,
    "lastRestocked": "2024-01-15T11:00:00Z"
  }
}
```

### GET /api/stock/monthly
Returns monthly stock summary.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "openingStock": 25000,
      "closingStock": 28000,
      "totalPurchased": 5000,
      "totalSold": 2000,
      "totalLost": 50,
      "totalAdjusted": 50
    }
  ]
}
```

### GET /api/stock/breakdown
Returns stock breakdown by medicine.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "medicineId": "med123",
      "medicineName": "Paracetamol 500mg",
      "boxes": 5,
      "strips": 10,
      "tablets": 550,
      "totalTablets": 550,
      "value": 27500
    }
  ]
}
```

---

## 3. Medicines Endpoints

### GET /api/medicines
Returns all medicines with pagination.

### POST /api/medicines
Create new medicine.

**Request Body:**
```json
{
  "name": "Paracetamol 500mg",
  "genericName": "Acetaminophen",
  "category": "Pain Relief",
  "manufacturer": "PharmaCo",
  "batchNumber": "BATCH-001",
  "expiryDate": "2025-12-31",
  "stockQuantity": 1000,
  "reorderLevel": 100,
  "costPrice": 5000,
  "productType": "tablets",
  "units": [
    { "type": "SINGLE", "quantity": 1, "price": 5, "label": "Tablet" },
    { "type": "STRIP", "quantity": 10, "price": 45, "label": "Strip (10)" },
    { "type": "BOX", "quantity": 100, "price": 400, "label": "Box (100)" }
  ],
  "description": "Pain relief medication",
  "imageUrl": ""
}
```

### PUT /api/medicines/{id}
Update existing medicine.

### DELETE /api/medicines/{id}
Delete medicine.

---

## 4. Sales Endpoints

### GET /api/sales
Returns all sales with pagination.

### POST /api/sales
Create new sale.

### GET /api/sales/today
Returns today's sales.

### GET /api/sales/by-cashier/{cashierId}
Returns sales by specific cashier.

---

## 5. Categories Endpoints

### GET /api/categories
Returns all categories.

### POST /api/categories
Create new category.

### PUT /api/categories/{id}
Update category.

### DELETE /api/categories/{id}
Delete category.

---

## 6. Authentication Endpoints

### POST /api/auth/login
User login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "user123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### POST /api/auth/register
User registration.

### GET /api/auth/me
Get current user profile.

---

## 7. Expenses Endpoints

### GET /api/expenses
Returns all expenses.

### POST /api/expenses
Create new expense.

### PUT /api/expenses/{id}
Update expense.

### DELETE /api/expenses/{id}
Delete expense.

---

## 8. Suppliers Endpoints

### GET /api/suppliers
Returns all suppliers.

### POST /api/suppliers
Create new supplier.

### PUT /api/suppliers/{id}
Update supplier.

---

## 9. Purchase Orders Endpoints

### GET /api/purchase-orders
Returns all purchase orders.

### POST /api/purchase-orders
Create new purchase order.

### PUT /api/purchase-orders/{id}/receive
Mark purchase order as received (updates stock).

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed error description"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Implementation Notes

1. **Stock Addition Flow**: The `/api/stock/add` endpoint should:
   - Validate medicine exists
   - Create a STOCK_MOVEMENT record with type 'ADDITION'
   - Update the medicine's stockQuantity
   - Return the updated stock information

2. **Annual Summary Calculation**: The `/api/reports/annual-summary` should:
   - Sum all sales revenue for the year
   - Calculate profit (revenue - COGS - expenses)
   - Count total orders/transactions
   - Sum all payments to sellers/cashiers

3. **Seller Payments**: Track commissions or payments made to cashiers/sellers who process sales on behalf of the pharmacy.
