# Fix: Driver Period Calculation Issue

## Problem Identified
When creating new loads, the driver period calculations were not being created correctly due to:

1. **Redundant period creation** - `ensurePaymentPeriodExists` was being called in the hook AND in the SQL function
2. **Incorrect user assignment** - Using `user.id` instead of the actual driver when no driver was assigned
3. **Missing date parameters** - The SQL function wasn't receiving the correct pickup/delivery dates

## Changes Made

### src/hooks/useCreateLoad.tsx

**REMOVED:**
- Redundant call to `ensurePaymentPeriodExists` 
- Complex period creation logic that was duplicating SQL function work
- Manual `paymentPeriodId` assignment

**ADDED:**
- Delegation of period creation to SQL function `simple_load_operation_with_deductions`
- Correct pickup/delivery date extraction from stops
- Better logging for debugging period creation issues

**KEY FIXES:**
1. **Lines 230-250**: Removed redundant period creation logic
2. **Lines 282-287**: Simplified load data preparation with correct dates
3. **Lines 289-298**: Updated SQL function call parameters

## Expected Results

After these changes:

✅ **Driver period calculations** will be created correctly for the assigned driver
✅ **No duplicate periods** will be created
✅ **Correct dates** (pickup/delivery) will be used for period assignment
✅ **SQL function handles** all period creation logic consistently

## Technical Details

The fix delegates all period creation responsibility to the SQL function `simple_load_operation_with_deductions`, which:

1. Calls `create_payment_period_if_needed` with correct company and date
2. Creates `driver_period_calculations` for all active drivers in the company
3. Generates automatic percentage deductions
4. Handles edge cases and concurrency properly

## Testing Validation

To verify the fix works:

1. Create a new load with an assigned driver
2. Check that a `company_payment_period` is created
3. Verify `driver_period_calculations` exists for the assigned driver
4. Confirm the calculation includes the load's amount in `gross_earnings`

## Files Modified

- `src/hooks/useCreateLoad.tsx` - Fixed redundant period creation logic
- `docs/changelog-driver-period-calculation-fix.md` - This documentation

## Migration Notes

No database migration required. The fix uses existing SQL functions and database structure.