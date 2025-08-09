# 📧 FleetNest Email Templates

Sistema moderno de templates de email usando React Email para invitaciones profesionales y elegantes.

## 🎨 Características del Diseño

### Elementos Visuales
- **Gradientes modernos**: Header con gradiente de azul a púrpura
- **Tipografía**: Fuente Inter para un aspecto profesional
- **Responsive**: Optimizado para dispositivos móviles y desktop
- **Iconos**: SVG embebidos para mejor rendimiento
- **Sombras sutiles**: Efectos visuales elegantes

### Branding Consistente
- Logo FleetNest en el header
- Colores corporativos (#667eea, #764ba2)
- Footer informativo con enlaces legales
- Identidad visual cohesiva

## 📁 Estructura de Archivos

```
_shared/email-templates/
├── components/
│   ├── EmailHeader.tsx      # Header con logo y gradientes
│   ├── EmailButton.tsx      # Botones con estilos modernos
│   └── EmailFooter.tsx      # Footer con información legal
├── InvitationBase.tsx       # Template base reutilizable
├── CompanyOwnerInvite.tsx   # Específico para propietarios
├── DriverInvite.tsx         # Específico para conductores
├── UserInvite.tsx           # Para otros roles (dispatcher, etc.)
└── README.md               # Esta documentación
```

## 🚀 Templates Disponibles

### 1. **CompanyOwnerInvite**
- **Uso**: Invitaciones para propietarios de empresa
- **Enfoque**: Gestión completa y control total
- **Características especiales**:
  - Dashboard ejecutivo
  - Control financiero
  - Gestión de equipo
  - Primeros pasos detallados

### 2. **DriverInvite**
- **Uso**: Invitaciones para conductores
- **Enfoque**: Facilidad de uso y beneficios operativos
- **Características especiales**:
  - App móvil destacada
  - Gestión de cargas simplificada
  - Información de fecha de contratación
  - Soporte y ayuda

### 3. **UserInvite**
- **Uso**: Otros roles (dispatcher, operations_manager, etc.)
- **Enfoque**: Funcionalidades específicas del rol
- **Características especiales**:
  - Descripción dinámica según el rol
  - Permisos y responsabilidades
  - Colaboración en equipo

## 🛠️ Uso en Edge Functions

### Importación
```typescript
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { CompanyOwnerInvite } from "../_shared/email-templates/CompanyOwnerInvite.tsx";
```

### Renderizado
```typescript
const emailHtml = await renderAsync(
  React.createElement(CompanyOwnerInvite, {
    recipientName: "Juan Pérez",
    companyName: "Transportes ABC",
    invitationUrl: "https://app.fleetnest.com/invitation/xyz"
  })
);
```

### Envío con Resend
```typescript
const emailResponse = await resend.emails.send({
  from: "FleetNest TMS <noreply@fleetnest.app>",
  to: [email],
  subject: `Invitación para administrar ${companyName} - FleetNest`,
  html: emailHtml,
});
```

## 🎯 Personalización por Rol

### Propietario de Empresa
- **Color principal**: Azul empresarial
- **Íconos**: Dashboard, financiero, gestión
- **Enfoque**: Control total y gestión estratégica

### Conductor
- **Color principal**: Verde operativo
- **Íconos**: Móvil, cargas, combustible
- **Enfoque**: Facilidad de uso y beneficios prácticos

### Otros Roles
- **Color principal**: Azul estándar
- **Íconos**: Colaboración, reportes, específicos del rol
- **Enfoque**: Funcionalidades y responsabilidades específicas

## 🔧 Mantenimiento

### Actualizar Estilos
- Modificar variables de color en cada template
- Actualizar componentes base en `/components/`
- Mantener consistencia visual

### Agregar Nuevos Roles
1. Actualizar `UserInvite.tsx`
2. Agregar descripción en `getRoleDescription()`
3. Probar con diferentes roles

### Debugging
- Los templates se renderizan server-side
- Logs disponibles en las edge functions
- Probar con diferentes clientes de email

## 📱 Compatibilidad

### Clientes de Email Soportados
- ✅ Gmail (web, móvil)
- ✅ Outlook (web, desktop, móvil)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Principales apps móviles

### Características Responsive
- Layout adaptable desde 320px hasta escritorio
- Imágenes optimizadas
- Botones táctiles amigables
- Texto legible en todas las pantallas