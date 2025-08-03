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
      // Debug: ver qué fecha estamos recibiendo
      console.log('formatDateSafe input:', dateInput);
      
      // Extraer año, mes, día directamente para evitar problemas de zona horaria
      let year: number, month: number, day: number;
      
      if (dateInput.includes('T') || dateInput.includes('Z')) {
        // Formato ISO: 2025-07-14T00:00:00.000Z - extraer solo la parte de fecha
        const datePart = dateInput.split('T')[0];
        [year, month, day] = datePart.split('-').map(Number);
        console.log('ISO format parsed:', { year, month, day });
      } else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Formato solo fecha: 2025-07-14
        [year, month, day] = dateInput.split('-').map(Number);
        console.log('Date only format parsed:', { year, month, day });
      } else {
        console.log('Using parseISO fallback for:', dateInput);
        // Si no es un formato reconocido, usar parseISO como fallback
        dateToFormat = parseISO(dateInput);
        if (!isValid(dateToFormat)) {
          return 'Fecha inválida';
        }
        return format(dateToFormat, formatPattern, options);
      }
      
      // Validar que los valores sean números válidos
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.log('Invalid numbers:', { year, month, day });
        return 'Fecha inválida';
      }
      
      // Crear fecha local evitando zona horaria UTC (usar mediodía para mayor seguridad)
      dateToFormat = new Date(year, month - 1, day, 12, 0, 0, 0);
      console.log('Created date:', dateToFormat);
    } else {
      dateToFormat = dateInput;
    }
    
    if (!isValid(dateToFormat)) {
      return 'Fecha inválida';
    }
    
    const result = format(dateToFormat, formatPattern, options);
    console.log('formatDateSafe result:', result);
    return result;
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
 */
export const formatDateOnly = (
  dateInput: string | Date | null | undefined
): string => {
  return formatDateSafe(dateInput, 'dd/MM/yyyy');
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