import { z } from 'zod';
import { sanitizeText, validateEmail, validatePhone } from './securityUtils';

/**
 * Validation schemas for consistent input validation across the application
 * These schemas enforce security, data integrity, and proper formatting
 */

// ============================================================================
// TEXT FIELD VALIDATIONS
// ============================================================================

export const loadNumberSchema = z
  .string()
  .trim()
  .min(1, { message: "Load number is required" })
  .max(50, { message: "Load number must be less than 50 characters" })
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length > 0, { message: "Load number cannot be empty after sanitization" });

export const poNumberSchema = z
  .string()
  .trim()
  .max(50, { message: "PO number must be less than 50 characters" })
  .transform((val) => sanitizeText(val))
  .optional()
  .nullable();

export const commoditySchema = z
  .string()
  .trim()
  .max(200, { message: "Commodity description must be less than 200 characters" })
  .transform((val) => sanitizeText(val))
  .optional()
  .nullable();

export const notesSchema = z
  .string()
  .trim()
  .max(1000, { message: "Notes must be less than 1000 characters" })
  .transform((val) => sanitizeText(val))
  .optional()
  .nullable();

export const specialInstructionsSchema = z
  .string()
  .trim()
  .max(500, { message: "Special instructions must be less than 500 characters" })
  .transform((val) => sanitizeText(val))
  .optional()
  .nullable();

// ============================================================================
// COMPANY DATA VALIDATIONS
// ============================================================================

export const companyNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Company name is required" })
  .max(200, { message: "Company name must be less than 200 characters" })
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length > 0, { message: "Company name cannot be empty after sanitization" });

export const addressSchema = z
  .string()
  .trim()
  .min(1, { message: "Address is required" })
  .max(300, { message: "Address must be less than 300 characters" })
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length > 0, { message: "Address cannot be empty after sanitization" });

export const citySchema = z
  .string()
  .trim()
  .min(1, { message: "City is required" })
  .max(100, { message: "City must be less than 100 characters" })
  .transform((val) => sanitizeText(val));

export const zipCodeSchema = z
  .string()
  .trim()
  .min(5, { message: "ZIP code must be at least 5 characters" })
  .max(10, { message: "ZIP code must be less than 10 characters" })
  .transform((val) => sanitizeText(val));

// ============================================================================
// CONTACT INFORMATION VALIDATIONS
// ============================================================================

export const contactNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Contact name is required" })
  .max(100, { message: "Contact name must be less than 100 characters" })
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length > 0, { message: "Contact name cannot be empty after sanitization" });

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" })
  .refine((val) => validateEmail(val), { message: "Email contains suspicious patterns" })
  .optional()
  .nullable();

export const phoneSchema = z
  .string()
  .trim()
  .max(20, { message: "Phone number must be less than 20 characters" })
  .refine((val) => !val || validatePhone(val), { message: "Invalid phone number format" })
  .optional()
  .nullable();

// ============================================================================
// STOP DATA VALIDATIONS
// ============================================================================

export const stopLocationSchema = z.object({
  company_name: z
    .string()
    .trim()
    .max(200, { message: "Company name must be less than 200 characters" })
    .transform((val) => sanitizeText(val))
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(300, { message: "Address must be less than 300 characters" })
    .transform((val) => sanitizeText(val))
    .optional()
    .nullable(),
  city: citySchema.optional().nullable(),
  zip_code: zipCodeSchema.optional().nullable(),
  contact_name: contactNameSchema.optional().nullable(),
  contact_phone: phoneSchema.optional().nullable(),
  reference_number: z
    .string()
    .trim()
    .max(50, { message: "Reference number must be less than 50 characters" })
    .transform((val) => sanitizeText(val))
    .optional()
    .nullable(),
  special_instructions: specialInstructionsSchema,
});

// ============================================================================
// CLIENT CONTACT VALIDATIONS
// ============================================================================

export const clientContactSchema = z.object({
  name: contactNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  position: z
    .string()
    .trim()
    .max(100, { message: "Position must be less than 100 characters" })
    .transform((val) => sanitizeText(val))
    .optional()
    .nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates and sanitizes a single text field
 * @param value - The value to validate
 * @param schema - The zod schema to use
 * @returns { isValid: boolean, sanitized?: string, error?: string }
 */
export function validateField<T extends z.ZodType>(
  value: string,
  schema: T
): { isValid: boolean; sanitized?: z.infer<T>; error?: string } {
  try {
    const result = schema.parse(value);
    return { isValid: true, sanitized: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { isValid: false, error: 'Unknown validation error' };
  }
}

/**
 * Validates and sanitizes multiple fields at once
 * @param data - Object with field values
 * @param schema - The zod schema to use
 * @returns { isValid: boolean, data?: any, errors?: Record<string, string> }
 */
export function validateFields<T extends z.ZodObject<any>>(
  data: unknown,
  schema: T
): { isValid: boolean; data?: z.infer<T>; errors?: Record<string, string> } {
  try {
    const result = schema.parse(data);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _general: 'Unknown validation error' } };
  }
}
