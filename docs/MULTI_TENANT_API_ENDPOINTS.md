# Multi-Tenant Business Management API Endpoints

This document outlines all required backend endpoints for the multi-tenant business management system.

## Base URL
```
https://your-backend-url.com/api
```

## Authentication
All endpoints (except `/auth/login`) require Bearer token authentication:
```
Authorization: Bearer <token>
```

**Important Headers for Multi-Tenancy:**
```
X-Business-ID: <business_id>
X-Schema-Name: <schema_name>
```

---

## 1. Business Management Endpoints (Super Admin Only)

### GET /api/businesses
Get all registered businesses with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (active, inactive, suspended)
- `type` (optional): Filter by business type (pharmacy, general, supermarket, retail)

**Response:**
```json
{
  "success": true,
  "data": {
    "businesses": [
      {
        "id": "bus_123",
        "name": "ABC Pharmacy",
        "email": "abc@pharmacy.com",
        "phone": "+254712345678",
        "businessType": "pharmacy",
        "schemaName": "abc_pharmacy",
        "address": "123 Main St",
        "city": "Nairobi",
        "country": "Kenya",
        "logo": "https://...",
        "subscriptionPlan": "basic",
        "status": "active",
        "ownerId": "user_456",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pages": 3
  }
}
```

---

### POST /api/businesses
Create a new business and its database schema.

**Request Body:**
```json
{
  "name": "ABC Pharmacy",
  "email": "abc@pharmacy.com",
  "phone": "+254712345678",
  "businessType": "pharmacy",
  "schemaName": "abc_pharmacy",
  "address": "123 Main St",
  "city": "Nairobi",
  "country": "Kenya",
  "adminName": "John Doe",
  "adminEmail": "john@abcpharmacy.com",
  "adminPassword": "securePassword123"
}
```

**Backend Actions:**
1. Validate schema name is unique and valid (alphanumeric + underscore only)
2. Create database schema: `CREATE SCHEMA abc_pharmacy;`
3. Create all required tables within the schema (see Schema Tables section)
4. Create the admin user with business association
5. Return business details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bus_123",
    "name": "ABC Pharmacy",
    "email": "abc@pharmacy.com",
    "phone": "+254712345678",
    "businessType": "pharmacy",
    "schemaName": "abc_pharmacy",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "adminUser": {
      "id": "user_456",
      "email": "john@abcpharmacy.com",
      "role": "admin"
    }
  },
  "message": "Business created successfully. Schema 'abc_pharmacy' has been created."
}
```

---

### GET /api/businesses/{id}
Get business details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bus_123",
    "name": "ABC Pharmacy",
    "email": "abc@pharmacy.com",
    "phone": "+254712345678",
    "businessType": "pharmacy",
    "schemaName": "abc_pharmacy",
    "address": "123 Main St",
    "city": "Nairobi",
    "country": "Kenya",
    "status": "active",
    "usersCount": 5,
    "productsCount": 150,
    "salesCount": 1200,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### PUT /api/businesses/{id}
Update business details.

**Request Body:**
```json
{
  "name": "ABC Pharmacy Ltd",
  "email": "contact@abcpharmacy.com",
  "phone": "+254712345679",
  "address": "456 New Street",
  "city": "Mombasa"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bus_123",
    "name": "ABC Pharmacy Ltd",
    ...
  },
  "message": "Business updated successfully"
}
```

---

### DELETE /api/businesses/{id}
Delete/deactivate a business (soft delete - sets status to inactive).

**Response:**
```json
{
  "success": true,
  "message": "Business deactivated successfully"
}
```

---

### POST /api/businesses/{id}/activate
Activate a suspended or inactive business.

**Response:**
```json
{
  "success": true,
  "message": "Business activated successfully"
}
```

---

### POST /api/businesses/{id}/suspend
Suspend a business.

**Request Body:**
```json
{
  "reason": "Non-payment of subscription"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business suspended"
}
```

---

### GET /api/businesses/stats
Get business statistics for super admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBusinesses": 50,
    "activeBusinesses": 45,
    "suspendedBusinesses": 3,
    "inactiveBusinesses": 2,
    "pharmacyCount": 30,
    "generalCount": 10,
    "supermarketCount": 7,
    "retailCount": 3,
    "totalRevenue": 5000000,
    "monthlyRevenue": 450000
  }
}
```

---

### GET /api/businesses/check-schema/{schemaName}
Check if a schema name is available.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

---

## 2. Modified Authentication Endpoints

### POST /api/auth/login
Login user and return business context.

**Request Body:**
```json
{
  "email": "john@abcpharmacy.com",
  "password": "password123"
}
```

**Response (includes business info):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "user_456",
      "name": "John Doe",
      "email": "john@abcpharmacy.com",
      "role": "admin",
      "businessId": "bus_123"
    },
    "business": {
      "id": "bus_123",
      "name": "ABC Pharmacy",
      "businessType": "pharmacy",
      "schemaName": "abc_pharmacy",
      "status": "active"
    }
  }
}
```

**Backend Logic:**
1. Authenticate user
2. Find associated business via `businessId`
3. Set search_path to business schema: `SET search_path TO abc_pharmacy, public;`
4. Return user and business info

---

## 3. Schema Tables (Created per Business)

When a new business is created, the following tables should be created in the business schema:

### For ALL Business Types:
```sql
-- Users table (business-specific users)
CREATE TABLE {schema}.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, manager, cashier, pharmacist
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories/Departments
CREATE TABLE {schema}.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers/Vendors
CREATE TABLE {schema}.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales
CREATE TABLE {schema}.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  cashier_id UUID REFERENCES {schema}.users(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Items
CREATE TABLE {schema}.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES {schema}.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL, -- References items/medicines
  product_name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(50),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2)
);

-- Expenses
CREATE TABLE {schema}.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  created_by UUID REFERENCES {schema}.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE {schema}.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE,
  supplier_id UUID REFERENCES {schema}.suppliers(id),
  status VARCHAR(50) DEFAULT 'DRAFT',
  total_amount DECIMAL(12,2),
  expected_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### For PHARMACY Business Type (additional tables):
```sql
-- Medicines (instead of generic products)
CREATE TABLE {schema}.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  category_id UUID REFERENCES {schema}.categories(id),
  manufacturer VARCHAR(255),
  batch_number VARCHAR(100),
  expiry_date DATE NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  cost_price DECIMAL(12,2) NOT NULL,
  product_type VARCHAR(50) DEFAULT 'tablets',
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  supplier_id UUID REFERENCES {schema}.suppliers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Units (pricing tiers)
CREATE TABLE {schema}.medicine_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES {schema}.medicines(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- TABLET, STRIP, BOX, etc.
  quantity INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  label VARCHAR(100)
);

-- Prescriptions
CREATE TABLE {schema}.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50),
  doctor_name VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_by UUID REFERENCES {schema}.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Items
CREATE TABLE {schema}.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES {schema}.prescriptions(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES {schema}.medicines(id),
  medicine_name VARCHAR(255),
  dosage VARCHAR(100),
  quantity INTEGER,
  instructions TEXT
);
```

### For GENERAL/SUPERMARKET/RETAIL Business Types:
```sql
-- Products (instead of medicines)
CREATE TABLE {schema}.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  category_id UUID REFERENCES {schema}.categories(id),
  brand VARCHAR(255),
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  cost_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  supplier_id UUID REFERENCES {schema}.suppliers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Multi-Tenant Query Pattern

### Backend Implementation Notes:

1. **On Login**: Store `schemaName` in JWT token or session
2. **On Each Request**: Set PostgreSQL search_path:
   ```java
   // Spring Boot example
   @Aspect
   public class TenantAspect {
     @Before("@annotation(TenantRequired)")
     public void setTenant() {
       String schema = SecurityContext.getCurrentTenant();
       jdbcTemplate.execute("SET search_path TO " + schema + ", public");
     }
   }
   ```

3. **Middleware Example (Node.js)**:
   ```javascript
   const tenantMiddleware = async (req, res, next) => {
     const schemaName = req.user.schemaName; // From JWT
     await db.query(`SET search_path TO ${schemaName}, public`);
     next();
   };
   ```

---

## 5. Business Type Features Matrix

| Feature | Pharmacy | General | Supermarket | Retail |
|---------|----------|---------|-------------|--------|
| Medicines | ✅ | ❌ | ❌ | ❌ |
| Products | ❌ | ✅ | ✅ | ✅ |
| Prescriptions | ✅ | ❌ | ❌ | ❌ |
| Expiry Tracking | ✅ | ❌ | ✅ | ❌ |
| Batch Tracking | ✅ | ❌ | ❌ | ❌ |
| Barcode Scanning | ❌ | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ | ✅ |
| Sales | ✅ | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ | ✅ |

---

## 6. Error Response Format

```json
{
  "success": false,
  "error": "SCHEMA_EXISTS",
  "message": "A business with schema name 'abc_pharmacy' already exists"
}
```

**Error Codes:**
- `SCHEMA_EXISTS` - Schema name already taken
- `INVALID_SCHEMA_NAME` - Invalid characters in schema name
- `BUSINESS_NOT_FOUND` - Business ID not found
- `BUSINESS_SUSPENDED` - Trying to access suspended business
- `UNAUTHORIZED_TENANT` - User doesn't belong to this business

---

## 7. Data Structure Summary

### Business Object:
```typescript
interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessType: 'pharmacy' | 'general' | 'supermarket' | 'retail';
  schemaName: string;
  address?: string;
  city?: string;
  country?: string;
  logo?: string;
  subscriptionPlan?: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  ownerId?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

### CreateBusinessRequest:
```typescript
interface CreateBusinessRequest {
  name: string;
  email: string;
  phone: string;
  businessType: BusinessType;
  schemaName: string;
  address?: string;
  city?: string;
  country?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}
```

---

## 8. Implementation Checklist

Backend Tasks:
- [ ] Create `businesses` table in public schema (master list)
- [ ] Create `user_business` junction table (users can belong to multiple businesses)
- [ ] Implement schema creation on business registration
- [ ] Add schema-based routing middleware
- [ ] Update login to return business context
- [ ] Update JWT to include schemaName and businessId
- [ ] Create business management CRUD endpoints
- [ ] Add business type-specific table creation scripts
- [ ] Implement business statistics endpoint
- [ ] Add schema name validation (alphanumeric + underscore only)

---

## 9. Security Considerations

1. **Schema Isolation**: Each business schema is completely isolated
2. **User Binding**: Users can only access their assigned business data
3. **Super Admin**: Separate role that can manage all businesses
4. **Audit Logging**: Track all business-level operations
5. **Schema Name Validation**: Prevent SQL injection via schema names
