import { format, parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

/**
 * Obtiene la zona horaria del usuario desde el navegador
 */
export const getUserTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Convierte una fecha a string YYYY-MM-DD en la zona horaria del usuario
 */
export const formatDateInUserTimeZone = (date: Date): string => {
  const userTimeZone = getUserTimeZone();
  return formatInTimeZone(date, userTimeZone, 'yyyy-MM-dd');
};

/**
 * Obtiene la fecha actual en la zona horaria del usuario como string YYYY-MM-DD
 */
export const getTodayInUserTimeZone = (): string => {
  return formatDateInUserTimeZone(new Date());
};

/**
 * Crea una nueva fecha en la zona horaria del usuario
 */
export const createDateInUserTimeZone = (year: number, month: number, day: number): string => {
  const date = new Date(year, month, day);
  return formatDateInUserTimeZone(date);
};

/**
 * Función segura para formatear fechas que maneja correctamente fechas de base de datos
 * Evita problemas de zona horaria al trabajar con fechas ISO y fechas puras
 */
export const formatDateSafe = (
  dateInput: string | Date | null | undefined, 
  formatPattern: string = 'dd/MM/yyyy',
  options: { locale?: any } = { locale: es }
): string => {
  if (!dateInput) return 'No definida';
  
  try {
    let dateToFormat: Date;
    
    if (typeof dateInput === 'string') {
      // Si contiene información de hora (T o :), usar parseISO para preservar la hora
      if (dateInput.includes('T') && (dateInput.includes(':') || dateInput.includes('Z'))) {
        // Formato ISO completo con hora: 2025-07-14T08:00:00.000Z
        dateToFormat = parseISO(dateInput);
        if (!isValid(dateToFormat)) {
          return 'Fecha inválida';
        }
      } else {
        // Para fechas sin hora o solo fechas YYYY-MM-DD
        let year: number, month: number, day: number;
        
        if (dateInput.includes('T')) {
          // Formato ISO: extraer solo la parte de fecha
          const datePart = dateInput.split('T')[0];
          [year, month, day] = datePart.split('-').map(Number);
        } else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Formato solo fecha: 2025-07-14
          [year, month, day] = dateInput.split('-').map(Number);
        } else {
          // Si no es un formato reconocido, usar parseISO como fallback
          dateToFormat = parseISO(dateInput);
          if (!isValid(dateToFormat)) {
            return 'Fecha inválida';
          }
          return format(dateToFormat, formatPattern, options);
        }
        
        // Validar que los valores sean números válidos
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 'Fecha inválida';
        }
        
        // Crear fecha local evitando zona horaria UTC (usar mediodía para mayor seguridad solo para fechas sin hora)
        dateToFormat = new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    } else {
      dateToFormat = dateInput;
    }
    
    if (!isValid(dateToFormat)) {
      return 'Fecha inválida';
    }
    
    return format(dateToFormat, formatPattern, options);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateInput);
    return 'Error en fecha';
  }
};

/**
 * Función específica para formatear fechas de base de datos (que vienen como string)
 */
export const formatDatabaseDate = (
  dateString: string | null | undefined,
  formatPattern: string = 'dd/MM/yyyy'
): string => {
  return formatDateSafe(dateString, formatPattern);
};

/**
 * Función para formatear fecha y hora completa
 */
export const formatDateTime = (
  dateInput: string | Date | null | undefined,
  formatPattern: string = 'dd/MM/yyyy HH:mm'
): string => {
  return formatDateSafe(dateInput, formatPattern);
};

/**
 * Función para formatear solo la fecha, sin hora
 * Esta función maneja correctamente fechas UTC que representan fechas puras (sin hora significativa)
 */
export const formatDateOnly = (
  dateInput: string | Date | null | undefined
): string => {
  if (!dateInput) return 'No definida';
  
  try {
    if (typeof dateInput === 'string') {
      // Si es una fecha UTC en medianoche (como las de transacciones), extraer solo la parte de fecha
      if (dateInput.includes('T00:00:00') && dateInput.includes('+00')) {
        const datePart = dateInput.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        
        // Validar que los valores sean números válidos
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 'Fecha inválida';
        }
        
        // Crear fecha local directamente para evitar problemas de zona horaria
        const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        return format(localDate, 'dd/MM/yyyy', { locale: es });
      }
    }
    
    // Para otros casos, usar la función segura existente
    return formatDateSafe(dateInput, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date only:', error, 'Input:', dateInput);
    return 'Error en fecha';
  }
};

/**
 * Función para obtener el año de una fecha de forma segura
 */
export const getYearSafe = (dateInput: string | Date | null | undefined): number | null => {
  if (!dateInput) return null;
  
  try {
    const formatted = formatDateSafe(dateInput, 'yyyy');
    return parseInt(formatted, 10);
  } catch {
    return null;
  }
};

/**
 * Obtiene fecha actual en UTC para consultas
 * Uso: Para comparaciones y consultas que requieren timestamp actual en UTC
 */
export const getCurrentUTC = (): string => {
  return new Date().toISOString();
};

/**
 * Convierte una fecha en formato YYYY-MM-DD a medianoche UTC
 * Esto previene problemas de zona horaria al guardar en la base de datos
 */
export const convertDateToUTC = (dateString: string): string => {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('dateString debe ser una cadena válida en formato YYYY-MM-DD');
  }
  
  // Verificar que esté en formato YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    throw new Error('dateString debe estar en formato YYYY-MM-DD');
  }
  
  // Crear fecha UTC explícitamente en medianoche
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  return utcDate.toISOString();
};