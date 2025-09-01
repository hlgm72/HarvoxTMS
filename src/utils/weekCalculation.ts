/**
 * Función unificada para calcular números de semana usando el método PostgreSQL
 * PostgreSQL usa lunes como primer día de la semana y la primera semana contiene el 4 de enero
 */
export const calculateWeekNumber = (date: Date): number => {
  const year = date.getFullYear();
  
  // Encontrar el lunes de la semana que contiene la fecha
  const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir a lunes=0
  const mondayOfWeek = new Date(date);
  mondayOfWeek.setDate(date.getDate() - daysFromMonday);
  
  // Encontrar el lunes de la primera semana del año
  // La primera semana es la que contiene el 4 de enero
  const jan4 = new Date(year, 0, 4); // 4 de enero
  const jan4DayOfWeek = jan4.getDay();
  const jan4DaysFromMonday = jan4DayOfWeek === 0 ? 6 : jan4DayOfWeek - 1;
  const firstMondayOfYear = new Date(jan4);
  firstMondayOfYear.setDate(4 - jan4DaysFromMonday);
  
  // Calcular diferencia en días y convertir a semanas
  const daysDiff = Math.floor((mondayOfWeek.getTime() - firstMondayOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  
  // 🔍 LOG MÁS VISIBLE
  console.error('🔢 WEEK CALCULATION:', { 
    inputDate: date.toLocaleDateString(),
    weekNumber, 
    year,
    mondayOfWeek: mondayOfWeek.toLocaleDateString(),
    firstMondayOfYear: firstMondayOfYear.toLocaleDateString(),
    daysDiff
  });
  
  // Test específico para 25 de agosto 2025
  if (date.getMonth() === 7 && date.getDate() === 25 && year === 2025) {
    console.error('🎯 AUGUST 25 TEST - Should be Week 35:', {
      weekNumber,
      expectedWeek: 35,
      isCorrect: weekNumber === 35
    });
  }
  
  return weekNumber;
};

/**
 * Calcula el número de semana desde una fecha string en formato YYYY-MM-DD
 */
export const calculateWeekNumberFromString = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas de zona horaria
  return calculateWeekNumber(date);
};