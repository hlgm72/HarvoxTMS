import { formatInTimeZone } from 'date-fns-tz';

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