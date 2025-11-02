/**
 * Convierte un patrón regex a formato de máscara para IMask
 * IMask usa: 0 = dígito, a = letra, * = alfanumérico
 * Ejemplos:
 * - ^\d{2}-\d{3}[A-Z]{0,2}$ → "00-000[aa]"
 * - ^[A-Z]{3}-\d{4}$ → "AAA-0000"
 */
export function regexToMask(pattern: string): string {
  if (!pattern) return '';
  
  // Limpia los delimitadores ^ y $
  let cleanPattern = pattern.replace(/^\^|\$$/g, "");

  // Mapa de traducción de regex → máscara IMask
  const replacements: [RegExp, string][] = [
    // Dígitos (0 = requerido en IMask)
    [/\\d\{1\}/g, "0"],
    [/\\d\{2\}/g, "00"],
    [/\\d\{3\}/g, "000"],
    [/\\d\{4\}/g, "0000"],
    [/\\d\{5\}/g, "00000"],
    [/\\d\{6\}/g, "000000"],
    [/\[0-9\]\{1\}/g, "0"],
    [/\[0-9\]\{2\}/g, "00"],
    [/\[0-9\]\{3\}/g, "000"],
    [/\[0-9\]\{4\}/g, "0000"],
    [/\[0-9\]\{5\}/g, "00000"],
    [/\[0-9\]\{6\}/g, "000000"],
    
    // Letras mayúsculas (a = letra en IMask, [] = opcional)
    [/\[A-Z\]\{1\}/g, "A"],
    [/\[A-Z\]\{2\}/g, "AA"],
    [/\[A-Z\]\{3\}/g, "AAA"],
    [/\[A-Z\]\{4\}/g, "AAAA"],
    [/\[A-Z\]\{0,1\}/g, "[A]"],
    [/\[A-Z\]\{0,2\}/g, "[AA]"],
    [/\[A-Z\]\{0,3\}/g, "[AAA]"],
    [/\[A-Z\]\{0,4\}/g, "[AAAA]"],
    
    // Letras minúsculas
    [/\[a-z\]\{1\}/g, "a"],
    [/\[a-z\]\{2\}/g, "aa"],
    [/\[a-z\]\{3\}/g, "aaa"],
    [/\[a-z\]\{0,1\}/g, "[a]"],
    [/\[a-z\]\{0,2\}/g, "[aa]"],
    [/\[a-z\]\{0,3\}/g, "[aaa]"],
    
    // Letras mixtas
    [/\[a-zA-Z\]\{1\}/g, "a"],
    [/\[a-zA-Z\]\{2\}/g, "aa"],
    [/\[a-zA-Z\]\{3\}/g, "aaa"],
    [/\[a-zA-Z\]\{0,1\}/g, "[a]"],
    [/\[a-zA-Z\]\{0,2\}/g, "[aa]"],
    [/\[a-zA-Z\]\{0,3\}/g, "[aaa]"],
    
    // Elimina paréntesis
    [/[()]/g, ""],
  ];

  // Aplica reemplazos
  replacements.forEach(([regex, replacement]) => {
    cleanPattern = cleanPattern.replace(regex, replacement);
  });

  // Mantiene separadores visibles
  cleanPattern = cleanPattern
    .replace(/\\-/g, "-")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/\s+/g, "");

  console.log('🎭 Mask conversion:', pattern, '→', cleanPattern);
  
  return cleanPattern;
}
