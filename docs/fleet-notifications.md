# Sistema de Notificaciones Harvox

## 🎨 **Características del Nuevo Sistema**

### **Diseño Atractivo y Profesional**
- ✅ **Gradientes con colores Harvox** (Transport Orange, Fleet Blue, Fleet Green, Fleet Red)
- ✅ **Iconos contextuales** para cada tipo de notificación
- ✅ **Animaciones suaves** (fade-in, hover scale, backdrop blur)
- ✅ **Sombras temáticas** que coinciden con el color de la notificación

### **Tipos de Notificación**
1. **Success** 🟢 - Verde Fleet con CheckCircle
2. **Error** 🔴 - Rojo Fleet con XCircle  
3. **Warning** 🟡 - Amarillo con AlertTriangle
4. **Info** 🔵 - Azul Fleet con Info

### **Funcionalidades**
- ✅ **Auto-dismiss** configurable (5 segundos por defecto)
- ✅ **Notificaciones persistentes** (no se cierran automáticamente)
- ✅ **Botón de acción** opcional para interacciones
- ✅ **Cierre manual** con botón X
- ✅ **Posicionamiento** top-right responsivo
- ✅ **Hover effects** profesionales

## 📖 **Cómo Usar**

### **Importar el Hook**
```typescript
import { useFleetNotifications } from '@/components/notifications';

// En tu componente
const { showSuccess, showError, showWarning, showInfo, showNotification } = useFleetNotifications();
```

### **Métodos Disponibles**

#### **Métodos Rápidos**
```typescript
// Éxito
showSuccess("¡Operación exitosa!", "La empresa ha sido creada correctamente");

// Error
showError("Error de conexión", "No se pudo conectar con el servidor");

// Advertencia  
showWarning("Datos incompletos", "Faltan algunos campos obligatorios");

// Información
showInfo("Sincronización iniciada", "Los datos se están actualizando...");
```

#### **Método Completo con Opciones**
```typescript
showNotification('success', 'Título', 'Mensaje', {
  duration: 8000,           // 8 segundos antes de auto-cerrar
  persistent: false,        // No persistente
  showAction: true,         // Mostrar botón de acción
  actionText: 'Ver detalles',
  onAction: () => {
    // Función a ejecutar al hacer clic en el botón
    console.log('Acción ejecutada');
  }
});
```

### **Ejemplos Prácticos**

#### **Notificaciones de Autenticación**
```typescript
// Login exitoso
showSuccess(
  "¡Bienvenido de vuelta!",
  "Has iniciado sesión exitosamente en Harvox"
);

// Error de login
showError(
  "Error de autenticación", 
  "Email o contraseña incorrectos"
);
```

#### **Notificaciones de CRUD**
```typescript
// Crear empresa
showSuccess(
  "¡Empresa creada exitosamente!",
  `${companyName} ha sido añadida al sistema Harvox`
);

// Error al crear
showError(
  "Error al crear empresa",
  "Ocurrió un error inesperado. Por favor intenta de nuevo."
);
```

#### **Notificaciones con Acción**
```typescript
showNotification('info', 'Datos sincronizados', 'Se encontraron nuevos vehículos', {
  showAction: true,
  actionText: 'Ver vehículos',
  persistent: true,
  onAction: () => {
    navigate('/vehicles');
  }
});
```

#### **Notificaciones Persistentes**
```typescript
showNotification('warning', 'Configuración requerida', 'Completa tu perfil', {
  persistent: true,
  showAction: true,
  actionText: 'Ir a configuración'
});
```

## 🎯 **Implementación Actual**

### **Archivos Creados**
- `src/components/notifications/NotificationItem.tsx` - Componente individual
- `src/components/notifications/NotificationProvider.tsx` - Provider y hook
- `src/components/notifications/index.ts` - Exportaciones

### **Integrado en:**
- ✅ **App.tsx** - Provider global
- ✅ **Auth.tsx** - Notificaciones de autenticación  
- ✅ **SuperAdminDashboard.tsx** - Notificaciones de gestión

## 🎨 **Personalización**

### **Colores Disponibles**
- **fleet-orange** - Transport Orange (#FF6B35)
- **fleet-blue** - Fleet Blue (#2563EB)  
- **fleet-green** - Success Green (#059669)
- **fleet-red** - Error Red (#DC2626)

### **Configuración por Tipo**
Cada tipo tiene su propia configuración de colores, iconos y sombras definida en `notificationConfig`.

## 🚀 **Ventajas vs Sistema Anterior**

### **Antes (shadcn toast)**
- ❌ Diseño básico y poco atractivo
- ❌ Colores genéricos
- ❌ Sin gradientes ni efectos visuales
- ❌ Funcionalidad limitada

### **Ahora (Harvox Notifications)**
- ✅ **Diseño profesional** con identidad Harvox
- ✅ **Colores corporativos** Transport Orange & Fleet Blue
- ✅ **Efectos visuales** gradientes, sombras, animaciones
- ✅ **Funcionalidad avanzada** acciones, persistencia, auto-dismiss
- ✅ **Mejor UX** más atractivo pero manteniendo profesionalidad

## 🧪 **Testing**

### **Para probar las notificaciones:**
1. **Ir a /auth** y hacer login/signup
2. **Ir a SuperAdmin** y crear una empresa  
3. **Ver notificaciones** aparecer en top-right con animaciones
4. **Verificar auto-dismiss** después de 5 segundos
5. **Probar cerrar manualmente** con botón X

¡El nuevo sistema está listo para usar en toda la aplicación Harvox!