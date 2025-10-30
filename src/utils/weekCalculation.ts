import { getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Función unificada para calcular números de semana usando el método ISO 8601
 * ISO 8601 usa lunes como primer día de la semana y la primera semana contiene el primer jueves del año
 */
export const calculateWeekNumber = (date: Date): number => {
  return getISOWeek(date);
};

/**
 * Calcula el año ISO de la semana (importante para semanas entre años)
 * Ejemplo: 30/12/2024 pertenece a la semana 1 de 2025, no a la semana 53 de 2024
 */
export const calculateWeekYear = (date: Date): number => {
  return getISOWeekYear(date);
};

/**
 * Calcula el número de semana desde una fecha string en formato YYYY-MM-DD
 */
export const calculateWeekNumberFromString = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas de zona horaria
  return calculateWeekNumber(date);
};

/**
 * Calcula el año ISO de la semana desde una fecha string en formato YYYY-MM-DD
 */
export const calculateWeekYearFromString = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return calculateWeekYear(date);
};