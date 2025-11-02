/**
 * Convierte un patrón regex a formato de máscara para input mask
 * Ejemplos:
 * - ^\d{2}-\d{3}[A-Z]{0,2}$ → "99-999aa"
 * - ^[A-Z]{3}-\d{4}$ → "AAA-9999"
 * - ^[A-Z]{2}\d{5}$ → "AA99999"
 */
export function regexToMask(pattern: string): string {
  if (!pattern) return '';
  
  // Limpia los delimitadores ^ y $
  let cleanPattern = pattern.replace(/^\^|\$$/g, "");

  // Mapa de traducción de regex → máscara
  const replacements: [RegExp, string][] = [
    // Dígitos
    [/\\d\{1\}/g, "9"],
    [/\\d\{2\}/g, "99"],
    [/\\d\{3\}/g, "999"],
    [/\\d\{4\}/g, "9999"],
    [/\\d\{5\}/g, "99999"],
    [/\\d\{6\}/g, "999999"],
    [/\[0-9\]\{1\}/g, "9"],
    [/\[0-9\]\{2\}/g, "99"],
    [/\[0-9\]\{3\}/g, "999"],
    [/\[0-9\]\{4\}/g, "9999"],
    [/\[0-9\]\{5\}/g, "99999"],
    [/\[0-9\]\{6\}/g, "999999"],
    [/\\d\{\d+,\d+\}/g, "999999"], // rango variable
    
    // Letras mayúsculas
    [/\[A-Z\]\{1\}/g, "A"],
    [/\[A-Z\]\{2\}/g, "AA"],
    [/\[A-Z\]\{3\}/g, "AAA"],
    [/\[A-Z\]\{4\}/g, "AAAA"],
    [/\[A-Z\]\{5\}/g, "AAAAA"],
    [/\[A-Z\]\{0,1\}/g, "a"],  // opcional (minúscula en la máscara)
    [/\[A-Z\]\{0,2\}/g, "aa"],
    [/\[A-Z\]\{0,3\}/g, "aaa"],
    [/\[A-Z\]\{0,4\}/g, "aaaa"],
    [/\[A-Z\]\{0,5\}/g, "aaaaa"],
    
    // Letras minúsculas
    [/\[a-z\]\{1\}/g, "a"],
    [/\[a-z\]\{2\}/g, "aa"],
    [/\[a-z\]\{3\}/g, "aaa"],
    [/\[a-z\]\{4\}/g, "aaaa"],
    [/\[a-z\]\{0,1\}/g, "a"],
    [/\[a-z\]\{0,2\}/g, "aa"],
    [/\[a-z\]\{0,3\}/g, "aaa"],
    
    // Letras mixtas
    [/\[a-zA-Z\]\{1\}/g, "A"],
    [/\[a-zA-Z\]\{2\}/g, "AA"],
    [/\[a-zA-Z\]\{3\}/g, "AAA"],
    [/\[a-zA-Z\]\{0,1\}/g, "a"],
    [/\[a-zA-Z\]\{0,2\}/g, "aa"],
    [/\[a-zA-Z\]\{0,3\}/g, "aaa"],
    
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
