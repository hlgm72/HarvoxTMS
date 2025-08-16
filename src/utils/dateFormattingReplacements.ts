// Utility para hacer reemplazos masivos de formateo de fechas
import { formatInternationalized, formatPrettyDate, formatShortDate, formatMediumDate, formatMonthName, formatCurrency } from '@/lib/dateFormatting';

// Reemplazos comunes que necesitan hacerse en toda la app:

// 1. format(date, "PPP", { locale: es }) -> formatPrettyDate(date)
// 2. format(date, "dd/MM/yy", { locale: es }) -> formatShortDate(date)  
// 3. format(date, "dd MMM yyyy", { locale: es }) -> formatMediumDate(date)
// 4. format(date, 'MMMM', { locale: es }) -> formatMonthName(date)
// 5. amount.toLocaleString('es-US', { minimumFractionDigits: 2 }) -> formatCurrency(amount)

export const dateFormattingReplacements = {
  // Patrones de date-fns con locale español
  'format\\([^,]+,\\s*"PPP",\\s*\\{\\s*locale:\\s*es\\s*\\}\\)': 'formatPrettyDate($1)',
  'format\\([^,]+,\\s*"dd/MM/yy",\\s*\\{\\s*locale:\\s*es\\s*\\}\\)': 'formatShortDate($1)',
  'format\\([^,]+,\\s*"dd MMM yyyy",\\s*\\{\\s*locale:\\s*es\\s*\\}\\)': 'formatMediumDate($1)',
  'format\\([^,]+,\\s*\'MMMM\',\\s*\\{\\s*locale:\\s*es\\s*\\}\\)': 'formatMonthName($1)',
  
  // Patrones de toLocaleString para dinero
  '\\.toLocaleString\\(\'es-US\',\\s*\\{[^}]*minimumFractionDigits:\\s*2[^}]*\\}\\)': 'formatCurrency($&)',
};