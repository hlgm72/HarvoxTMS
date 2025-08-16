# Company Data Security Implementation

## Overview
This document describes the security implementation for protecting sensitive company financial data in FleetNest TMS.

## Security Issue Fixed
**Problem**: The original `companies` table exposed sensitive business information (EIN numbers, owner personal details, financial percentages) to all company users, creating a risk of data theft.

**Solution**: Implemented role-based access control with secure views and restricted table access.

## Implementation Details

### 1. Database Views Created

#### `companies_public` View
- **Purpose**: Safe company information for all authenticated company users
- **Contains**: Basic company details without sensitive data
- **Access**: All company users can see their own company's basic info
- **Fields**: id, name, address, phone, email, logo, plan_type, status, timestamps

#### `companies_financial` View  
- **Purpose**: Financial and sensitive company data
- **Contains**: EIN, owner details, financial percentages, limits
- **Access**: Company owners, operations managers, and superadmins only
- **Fields**: All sensitive fields including EIN, owner info, financial percentages

### 2. Security Functions

#### `get_user_role_in_company(company_id)`
- Security definer function to safely check user role
- Prevents RLS recursion issues
- Returns user's role in specified company

#### `can_access_company_financial_data(company_id)`
- Checks if user can access financial data
- Restricts to owners, operations managers, and superadmins
- Used by financial view security

### 3. RLS Policies Updated

#### Main `companies` Table
- **Old**: All company users could see full company data
- **New**: Only company owners and superadmins can access full table
- **Impact**: Forces use of appropriate views for different access levels

### 4. Audit Logging

#### `company_sensitive_data_access_log` Table
- Tracks access to sensitive company data
- Records user, timestamp, access type, IP, user agent
- Only accessible to superadmins
- Enables security monitoring and compliance

## Usage Guidelines

### For Frontend Development

#### Basic Company Information
```typescript
// For dashboards, lists, basic company info
const { data } = await supabase
  .from('companies')
  .select(`
    id, name, street_address, state_id, zip_code, city, 
    phone, email, logo_url, status, plan_type, 
    created_at, updated_at
  `);
```

#### Financial/Administrative Data
```typescript
// For financial reports, admin settings, owner details
const { data } = await supabase
  .from('companies_financial')
  .select('*');
```

#### Full Company Access (Restricted)
```typescript
// Only for company owners and superadmins
const { data } = await supabase
  .from('companies')
  .select('*');
```

### Role-Based Access Matrix

| Role | companies_public | companies_financial | companies (full) |
|------|------------------|-------------------|------------------|
| Driver | ✅ Own company | ❌ No access | ❌ No access |
| Dispatcher | ✅ Own company | ❌ No access | ❌ No access |
| Operations Manager | ✅ Own company | ✅ Own company | ❌ No access |
| Company Owner | ✅ Own company | ✅ Own company | ✅ Own company |
| Superadmin | ✅ All companies | ✅ All companies | ✅ All companies |

## Security Benefits

1. **Data Minimization**: Users only see data they need for their role
2. **Financial Data Protection**: EIN, owner details, and percentages restricted
3. **Audit Trail**: Complete logging of sensitive data access
4. **Compliance Ready**: Supports SOX, PCI-DSS, and privacy regulations
5. **Performance**: Views are optimized for specific use cases

## Migration Impact

### Existing Code Updates Required
1. Update hooks that fetch company data to use appropriate views
2. Modify components that display financial data to handle restricted access
3. Update superadmin dashboards to use `companies_financial` view
4. Add error handling for insufficient permissions

### Testing Checklist
- [ ] Drivers can see basic company info only
- [ ] Dispatchers cannot access financial data
- [ ] Operations managers can access financial data
- [ ] Company owners have full access to their company
- [ ] Superadmins have full access to all companies
- [ ] Audit logs capture sensitive data access
- [ ] UI gracefully handles permission errors

## Monitoring

### Security Alerts to Monitor
1. Unauthorized attempts to access financial data
2. Unusual patterns in sensitive data access
3. Cross-company data access attempts
4. Privilege escalation attempts

### Audit Queries
```sql
-- Recent sensitive data access
SELECT * FROM company_sensitive_data_access_log 
WHERE accessed_at > now() - interval '24 hours'
ORDER BY accessed_at DESC;

-- Access by non-privileged users
SELECT * FROM company_sensitive_data_access_log 
WHERE user_role NOT IN ('company_owner', 'operations_manager', 'superadmin')
ORDER BY accessed_at DESC;
```

## Compliance Notes

This implementation supports:
- **SOX Compliance**: Restricted access to financial data
- **PCI-DSS**: Data access controls and audit logging
- **GDPR/CCPA**: Data minimization and access controls
- **Industry Standards**: Role-based access control (RBAC)

## Support

For questions about company data security:
1. Review this documentation
2. Check role-based access matrix
3. Verify user permissions in `user_company_roles` table
4. Review audit logs for access patterns