# Control de Espacios en Blanco - Documentación

## 📋 **Descripción**
Sistema de utilities para controlar espacios en blanco en campos de texto de formularios, mejorando la experiencia de usuario y la calidad de los datos.

## 🎯 **Funcionalidades**

### 1. **Prevención de espacios al inicio**
- Bloquea que los usuarios puedan empezar a escribir con espacios
- Si solo hay espacios, el campo permanece vacío

### 2. **Control de espacios múltiples**
- Reduce múltiples espacios consecutivos a un solo espacio
- Mejora la legibilidad y consistencia

### 3. **Eliminación automática de espacios al final**
- Trim automático cuando el usuario termina de editar (onBlur)
- Evita datos con espacios innecesarios al final

### 4. **Emails completamente limpios**
- Elimina TODOS los espacios de campos de email
- Doble protección: bloqueo de teclas + limpieza automática

### 5. **Formateo automático de teléfonos**
- Formato automático (xxx) xxx-xxxx mientras escribes
- Solo permite números y caracteres de formato
- Limita a 10 dígitos máximo

## 🔧 **Archivo de Utilities**
**Ubicación:** `src/lib/textUtils.ts`

### **Funciones disponibles:**

#### `handleTextInput(value: string): string`
Para campos de texto normales (nombres, títulos, etc.)
```typescript
// Previene espacios al inicio y múltiples consecutivos
const cleanValue = handleTextInput("  Juan   Carlos  "); // → "Juan Carlos"
```

#### `handleEmailInput(value: string): string`
Para campos de email (elimina TODOS los espacios)
```typescript
// Elimina todos los espacios
const cleanEmail = handleEmailInput(" test @ gmail.com "); // → "test@gmail.com"
```

#### `handlePhoneInput(value: string): string`
Para campos de teléfono (formato automático)
```typescript
// Formatea automáticamente a (xxx) xxx-xxxx
const formattedPhone = handlePhoneInput("5551234567"); // → "(555) 123-4567"
```

#### `handleTextBlur(value: string): string`
Para eliminar espacios al final cuando se termina de editar
```typescript
// Elimina espacios al final
const trimmedValue = handleTextBlur("Juan Carlos   "); // → "Juan Carlos"
```

#### `createTextHandlers(setValue, type)`
Función principal que crea handlers completos
```typescript
const handlers = createTextHandlers(
  (value) => setFormData(prev => ({ ...prev, field: value })),
  'text' // 'email', 'phone', o 'text'
);
```

#### `createPhoneHandlers(setValue)`
Función especializada para teléfonos con validación de teclas
```typescript
const phoneHandlers = createPhoneHandlers((value) => 
  setFormData(prev => ({ ...prev, phone: value }))
);
```

## 📖 **Guías de Uso**

### **Método 1: Usando createTextHandlers (Recomendado)**

```typescript
import { createTextHandlers } from '@/lib/textUtils';

// En tu componente
const nameHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, name: value }))
);

const emailHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, email: value })), 'email'
);

const phoneHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, phone: value })), 'phone'
);

// En el JSX
<Input
  value={formData.name}
  {...nameHandlers}
  placeholder="Nombre completo"
/>

<Input
  type="email"
  value={formData.email}
  {...emailHandlers}
  placeholder="correo@ejemplo.com"
/>

<Input
  type="tel"
  value={formData.phone}
  {...phoneHandlers}
  placeholder="(555) 123-4567"
/>
```

### **Método 2: Implementación Directa (Para casos especiales)**

```typescript
import { handleTextInput, handleEmailInput } from '@/lib/textUtils';

// Para campos de texto
<Input
  value={formData.name}
  onChange={(e) => {
    const cleanValue = handleTextInput(e.target.value);
    setFormData(prev => ({ ...prev, name: cleanValue }));
  }}
  onBlur={(e) => {
    const trimmedValue = e.target.value.trim();
    setFormData(prev => ({ ...prev, name: trimmedValue }));
  }}
/>

// Para emails con protección extra
<Input
  type="email"
  value={formData.email}
  onChange={(e) => {
    const cleanValue = handleEmailInput(e.target.value);
    setFormData(prev => ({ ...prev, email: cleanValue }));
  }}
  onKeyPress={(e) => {
    if (e.key === ' ') {
      e.preventDefault(); // Bloquea espacios
    }
  }}
/>
```

## 🎯 **Casos de Uso**

### **Campos de Texto Normales**
- ✅ Nombres y apellidos
- ✅ Títulos de cargo
- ✅ Nombres de empresa
- ✅ Direcciones
- ✅ Descripciociones

```typescript
const nameHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, name: value }))
);
```

### **Campos de Email**
- ✅ Emails de contacto
- ✅ Emails de login
- ✅ Emails de propietarios

```typescript
const emailHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, email: value })), 'email'
);
```

### **Campos Especiales (Sin Espacios)**
- ✅ Usernames
- ✅ Códigos
- ✅ URLs

```typescript
// Usa 'email' type para eliminar todos los espacios
const usernameHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, username: value })), 'email'
);
```

### **Campos de Teléfono**
- ✅ Teléfonos de empresa
- ✅ Teléfonos de contacto
- ✅ Teléfonos personales

```typescript
const phoneHandlers = createTextHandlers((value) => 
  setFormData(prev => ({ ...prev, phone: value })), 'phone'
);
```

## ✅ **Formularios Implementados**

### **Auth.tsx**
- ✅ Email (sin espacios)
- ✅ Nombre/Apellido (espacios controlados)
- ✅ Nombre empresa (espacios controlados)

### **SuperAdminDashboard.tsx**
- ✅ Todos los campos del formulario de crear empresa
- ✅ Emails sin espacios
- ✅ Teléfonos con formato (xxx) xxx-xxxx
- ✅ Nombres y textos con espacios controlados

### **Setup.tsx**
- ✅ Email del superadmin (sin espacios)
- ✅ Nombre/Apellido (espacios controlados)

## 🔄 **Para Nuevos Formularios**

### **Paso 1: Importar utilities**
```typescript
import { createTextHandlers } from '@/lib/textUtils';
```

### **Paso 2: Crear handlers**
```typescript
// Para cada campo que necesite control de espacios
const fieldHandlers = createTextHandlers(
  (value) => setFormData(prev => ({ ...prev, fieldName: value })),
  'text' // o 'email' para campos sin espacios
);
```

### **Paso 3: Aplicar al Input**
```typescript
<Input
  value={formData.fieldName}
  {...fieldHandlers}
  placeholder="Placeholder apropiado"
/>
```

## 🎨 **Mejores Prácticas**

### **✅ Hacer**
- Usar `'email'` type para campos que NO deben tener espacios (emails, usernames, códigos)
- Usar `'phone'` type para campos de teléfono (formato automático)
- Usar `'text'` type para campos de texto normal (nombres, descripciones)
- Aplicar a TODOS los campos de texto de formularios críticos
- Usar la función `createTextHandlers` para consistencia

### **❌ No hacer**
- No aplicar a campos de texto libre largo (comentarios, descripciones extensas)
- No usar en campos de contraseña (pueden tener espacios intencionalmente)
- No usar en campos numéricos (usar validación específica para números)

## 🧪 **Testing**

### **Para campos de texto normal:**
1. Intentar escribir espacios al inicio → No debe permitir
2. Escribir "Juan    Carlos" → Debe convertirse en "Juan Carlos"
3. Escribir "Juan Carlos   " y salir del campo → Debe quedar "Juan Carlos"

### **Para campos de teléfono:**
1. Escribir "5551234567" → Debe convertirse en "(555) 123-4567"
2. Intentar escribir letras → Debe bloquearse
3. Escribir más de 10 dígitos → Debe limitarse a 10

### **Para campos de email:**
1. Intentar presionar espacio → Debe bloquearse
2. Copiar/pegar " test @ gmail.com " → Debe convertirse en "test@gmail.com"
3. Cualquier intento de espacios debe eliminarse completamente

## 📁 **Archivos Relacionados**
- `src/lib/textUtils.ts` - Utilities principales
- `src/pages/Auth.tsx` - Implementación en autenticación
- `src/pages/SuperAdminDashboard.tsx` - Implementación en admin
- `src/pages/Setup.tsx` - Implementación en setup inicial

## 🚀 **Próximos Pasos**
Aplicar esta funcionalidad a cualquier nuevo formulario que se cree en la aplicación para mantener consistencia y calidad de datos en todo el sistema.