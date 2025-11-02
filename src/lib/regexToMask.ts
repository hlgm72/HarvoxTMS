/**
 * Convierte un patrón regex a formato de máscara para IMask
 * IMask usa: 0 = dígito, A = letra (mayúscula), a = letra (cualquier), * = alfanumérico
 * [] = opcional
 * 
 * Ejemplos:
 * - ^\d{2}-\d{3}[A-Z]{0,2}$ → "00-000[A][A]"
 * - ^[A-Z]{3}-\d{4}$ → "AAA-0000"
 * - ^[0-9]{1,3}\.[0-9]{2}$ → "000.00"
 */
export function regexToMask(pattern: string): string {
  if (!pattern) return '';
  
  console.log('🎭 Converting pattern:', pattern);
  
  // Limpia los delimitadores ^ y $
  let result = pattern.replace(/^\^|\$$/g, "");
  
  // Función auxiliar para repetir un carácter n veces
  const repeat = (char: string, times: number): string => char.repeat(times);
  
  // Función auxiliar para envolver en [] n veces (opcional)
  const wrapOptional = (char: string, times: number): string => 
    repeat(`[${char}]`, times);
  
  // Procesa cuantificadores de forma más genérica
  // Orden importante: procesar primero los más específicos
  
  // 1. Rangos opcionales {0,n} - todos son opcionales
  result = result.replace(/\\d\{0,(\d+)\}/g, (_, n) => wrapOptional('0', parseInt(n)));
  result = result.replace(/\[0-9\]\{0,(\d+)\}/g, (_, n) => wrapOptional('0', parseInt(n)));
  result = result.replace(/\[A-Z\]\{0,(\d+)\}/g, (_, n) => wrapOptional('A', parseInt(n)));
  result = result.replace(/\[a-z\]\{0,(\d+)\}/g, (_, n) => wrapOptional('a', parseInt(n)));
  result = result.replace(/\[a-zA-Z\]\{0,(\d+)\}/g, (_, n) => wrapOptional('a', parseInt(n)));
  
  // 2. Rangos variables {n,m} - n requeridos, (m-n) opcionales
  result = result.replace(/\\d\{(\d+),(\d+)\}/g, (_, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return repeat('0', minNum) + wrapOptional('0', maxNum - minNum);
  });
  result = result.replace(/\[0-9\]\{(\d+),(\d+)\}/g, (_, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return repeat('0', minNum) + wrapOptional('0', maxNum - minNum);
  });
  result = result.replace(/\[A-Z\]\{(\d+),(\d+)\}/g, (_, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return repeat('A', minNum) + wrapOptional('A', maxNum - minNum);
  });
  result = result.replace(/\[a-z\]\{(\d+),(\d+)\}/g, (_, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return repeat('a', minNum) + wrapOptional('a', maxNum - minNum);
  });
  result = result.replace(/\[a-zA-Z\]\{(\d+),(\d+)\}/g, (_, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return repeat('a', minNum) + wrapOptional('a', maxNum - minNum);
  });
  
  // 3. Cuantificador exacto {n} - todos requeridos
  result = result.replace(/\\d\{(\d+)\}/g, (_, n) => repeat('0', parseInt(n)));
  result = result.replace(/\[0-9\]\{(\d+)\}/g, (_, n) => repeat('0', parseInt(n)));
  result = result.replace(/\[A-Z\]\{(\d+)\}/g, (_, n) => repeat('A', parseInt(n)));
  result = result.replace(/\[a-z\]\{(\d+)\}/g, (_, n) => repeat('a', parseInt(n)));
  result = result.replace(/\[a-zA-Z\]\{(\d+)\}/g, (_, n) => repeat('a', parseInt(n)));
  
  // 4. Cuantificadores simples sin llaves
  result = result.replace(/\\d\+/g, '000'); // Al menos 1, asumimos 3 por defecto
  result = result.replace(/\\d\*/g, '[0][0][0]'); // 0 o más, asumimos hasta 3 opcionales
  result = result.replace(/\\d\?/g, '[0]'); // 0 o 1
  result = result.replace(/\\d/g, '0'); // Exactamente 1
  
  // 5. Clases de caracteres sin cuantificador
  result = result.replace(/\[0-9\]/g, '0');
  result = result.replace(/\[A-Z\]/g, 'A');
  result = result.replace(/\[a-z\]/g, 'a');
  result = result.replace(/\[a-zA-Z\]/g, 'a');
  
  // 6. Cuantificadores para clases de caracteres simples
  result = result.replace(/\[0-9\]\+/g, '000');
  result = result.replace(/\[0-9\]\*/g, '[0][0][0]');
  result = result.replace(/\[0-9\]\?/g, '[0]');
  
  result = result.replace(/\[A-Z\]\+/g, 'AAA');
  result = result.replace(/\[A-Z\]\*/g, '[A][A][A]');
  result = result.replace(/\[A-Z\]\?/g, '[A]');
  
  result = result.replace(/\[a-z\]\+/g, 'aaa');
  result = result.replace(/\[a-z\]\*/g, '[a][a][a]');
  result = result.replace(/\[a-z\]\?/g, '[a]');
  
  result = result.replace(/\[a-zA-Z\]\+/g, 'aaa');
  result = result.replace(/\[a-zA-Z\]\*/g, '[a][a][a]');
  result = result.replace(/\[a-zA-Z\]\?/g, '[a]');
  
  // 7. Elimina paréntesis de grupos
  result = result.replace(/[()]/g, "");
  
  // 8. Mantiene y limpia separadores comunes
  result = result
    .replace(/\\-/g, "-")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/\\:/g, ":")
    .replace(/\\_/g, "_")
    .replace(/\\\s/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  console.log('🎭 Mask result:', pattern, '→', result);
  
  return result;
}
