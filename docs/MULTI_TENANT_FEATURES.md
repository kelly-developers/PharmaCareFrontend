# Multi-Tenant Business Management System

This document provides an overview of the multi-tenant features added to support both pharmacy and general retail businesses.

## Features Added

### 1. Business Management (Super Admin)
- **Business Registration**: Create new businesses with automated schema creation
- **Business Types**: Support for Pharmacy, General Store, Supermarket, and Retail
- **Schema Isolation**: Each business gets its own database schema for complete data isolation
- **Business Dashboard**: View and manage all registered businesses

### 2. Multi-Tenant Authentication
- Login now returns business context along with user
- Session stores both user and business information
- Routes are protected based on business type and user role

### 3. Dynamic Terminology
The UI adapts terminology based on business type:

| Pharmacy | General/Retail |
|----------|----------------|
| Medicine | Product |
| Medicine Categories | Product Categories |
| Prescription | Order |
| Supplier | Vendor |

### 4. Business Type Features

**Pharmacy Only**:
- Prescriptions
- Expiry date tracking
- Batch number tracking
- Medicine-specific units (tablet, strip, box)

**All Business Types**:
- POS (Point of Sale)
- Inventory management
- Sales tracking
- Expense management
- Reports
- Supplier/Vendor management
- User management

## File Structure

```
src/
├── types/
│   └── business.ts          # Business types, terminology mapping
├── contexts/
│   └── TenantContext.tsx    # Multi-tenant context provider
├── services/
│   └── businessService.ts   # Business management API calls
├── pages/
│   └── BusinessManagement.tsx # Super admin business management UI
docs/
├── MULTI_TENANT_API_ENDPOINTS.md  # Complete API documentation
└── BACKEND_API_ENDPOINTS.md       # Updated with multi-tenant section
```

## Backend Requirements

See `docs/MULTI_TENANT_API_ENDPOINTS.md` for complete backend implementation:

### Key Endpoints to Implement:
1. `GET /api/businesses` - List all businesses
2. `POST /api/businesses` - Create new business (creates schema)
3. `GET /api/businesses/{id}` - Get business details
4. `PUT /api/businesses/{id}` - Update business
5. `DELETE /api/businesses/{id}` - Deactivate business
6. `POST /api/businesses/{id}/activate` - Activate business
7. `POST /api/businesses/{id}/suspend` - Suspend business
8. `GET /api/businesses/stats` - Business statistics
9. `GET /api/businesses/check-schema/{name}` - Check schema availability

### Authentication Changes:
The login response must include business information:
```json
{
  "token": "...",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
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
```

### Database Changes:
1. Create `public.businesses` table for master business list
2. Create schema per business with appropriate tables
3. Use `SET search_path TO {schema}, public` for tenant isolation

## Usage

### Creating a New Business (Super Admin):
1. Navigate to `/businesses`
2. Click "Add Business"
3. Fill in business details:
   - Business name
   - Business type (Pharmacy/General/Supermarket/Retail)
   - Email and phone
   - Admin user credentials
4. Schema name is auto-generated from business name
5. Submit to create business and admin user

### User Login:
1. User logs in with email/password
2. Backend returns user + business context
3. Frontend stores both in session
4. Sidebar and routes adapt to business type

## Security Considerations

1. **Schema Isolation**: Each business operates in its own database schema
2. **Role-Based Access**: Users can only access features for their role
3. **Super Admin**: Separate privilege level for platform management
4. **Business Status**: Suspended businesses cannot be accessed

## Testing

1. Create a test business via super admin
2. Login with the created admin credentials
3. Verify sidebar shows correct business name and type
4. Verify routes work correctly for business type
5. For pharmacy: verify prescriptions are available
6. For general: verify prescriptions route is hidden
