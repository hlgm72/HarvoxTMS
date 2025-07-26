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
      // Si es una fecha ISO o con hora, usar parseISO
      if (dateInput.includes('T') || dateInput.includes('Z')) {
        dateToFormat = parseISO(dateInput);
      } else {
        // Si es solo fecha (YYYY-MM-DD), crear Date evitando zona horaria
        const [year, month, day] = dateInput.split('-').map(Number);
        dateToFormat = new Date(year, month - 1, day);
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
 */
export const formatDateOnly = (
  dateInput: string | Date | null | undefined
): string => {
  if (!dateInput) return 'No definida';
  
  try {
    let dateToFormat: Date;
    
    if (typeof dateInput === 'string') {
      // Si es una fecha ISO o con hora, usar parseISO y ajustar zona horaria
      if (dateInput.includes('T') || dateInput.includes('Z')) {
        dateToFormat = parseISO(dateInput);
      } else {
        // Si es solo fecha (YYYY-MM-DD), crear Date en la zona horaria del usuario
        const [year, month, day] = dateInput.split('-').map(Number);
        dateToFormat = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
      }
    } else {
      dateToFormat = dateInput;
    }
    
    if (!isValid(dateToFormat)) {
      return 'Fecha inválida';
    }
    
    // Usar zona horaria del usuario para el formateo
    const userTimeZone = getUserTimeZone();
    return formatInTimeZone(dateToFormat, userTimeZone, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateInput);
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