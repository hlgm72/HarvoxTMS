# FleetNest TMS - Security Guidelines

## Overview
Este documento describe las medidas de seguridad implementadas en FleetNest TMS y las mejores prácticas para mantener la aplicación segura.

## Medidas de Seguridad Implementadas

### 1. Row Level Security (RLS)
- **Estado**: ✅ Implementado en 42/42 tablas
- **Descripción**: Todas las tablas tienen políticas RLS que restringen el acceso basado en roles de usuario y empresa
- **Auditoría**: Se ejecuta el linter de Supabase regularmente para verificar la integridad

### 2. Autenticación y Autorización
- **Supabase Auth**: Sistema de autenticación robusto con JWT tokens
- **Roles de Usuario**: Sistema jerárquico (superadmin > company_owner > operations_manager > dispatcher > driver)
- **Protección contra Escalación**: Triggers que previenen auto-asignación de roles privilegiados

### 3. Validación de Entrada
- **Sanitización**: Todos los inputs son sanitizados para prevenir XSS
- **Validación de Email**: Formato y patrones maliciosos
- **Validación de Archivos**: Tipo, tamaño y contenido
- **Rate Limiting**: Implementado para operaciones críticas

### 4. Protección de Base de Datos
- **Search Path Inmutable**: Todas las funciones tienen search_path fijo para prevenir inyección SQL
- **Auditoría de Cambios**: Log completo de modificaciones de roles
- **Bloqueo de Períodos**: Previene modificaciones de datos financieros una vez procesados

## Configuración de Seguridad

### Variables de Entorno
```env
# No usar variables VITE_* para datos sensibles
# Solo usar claves públicas necesarias para el frontend
SUPABASE_URL=https://htaotttcnjxqzpsrqwll.supabase.co
SUPABASE_ANON_KEY=[clave pública - OK para frontend]
```

### Supabase Configuration
- **Site URL**: Configurado correctamente para producción
- **Redirect URLs**: Limitados a dominios autorizados
- **RLS**: Habilitado en todas las tablas sensibles

## Mejores Prácticas para Desarrolladores

### 1. Manejo de Autenticación
```typescript
// ✅ CORRECTO: Verificar autenticación antes de operaciones sensibles
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Usuario no autenticado');

// ❌ INCORRECTO: Confiar solo en el estado del frontend
if (isLoggedIn) { /* operación sensible */ }
```

### 2. Validación de Entrada
```typescript
// ✅ CORRECTO: Usar utilidades de seguridad
import { validateEmail, sanitizeText } from '@/lib/securityUtils';

const email = validateEmail(inputEmail) ? inputEmail : null;
const name = sanitizeText(inputName);

// ❌ INCORRECTO: Usar datos sin validar
const email = userInput.email;
```

### 3. Manejo de Roles
```typescript
// ✅ CORRECTO: Verificar permisos en el backend también
const isAuthorized = await checkUserPermission(user.id, 'company_owner');

// ❌ INCORRECTO: Solo verificar en frontend
if (userRole === 'company_owner') { /* operación sensible */ }
```

### 4. Gestión de Sesiones
```typescript
// ✅ CORRECTO: Limpiar completamente al cerrar sesión
import { cleanupAuthState } from '@/lib/authUtils';
await cleanupAuthState();
await supabase.auth.signOut();

// ❌ INCORRECTO: Solo llamar signOut
await supabase.auth.signOut();
```

## Monitoreo y Alertas

### Logs de Auditoría
- **security_audit_log**: Tabla para cambios críticos de roles
- **system_stats**: Registro de operaciones del sistema
- **Postgres Logs**: Monitoreo de errores de base de datos

### Indicadores de Seguridad a Monitorear
1. Intentos de login fallidos repetidos
2. Cambios de roles no autorizados
3. Accesos a datos de otras empresas
4. Operaciones en períodos bloqueados
5. Subida de archivos sospechosos

## Procedimientos de Emergencia

### Brecha de Seguridad Detectada
1. **Inmediato**: Desactivar usuarios comprometidos
2. **5 minutos**: Revisar logs de auditoría
3. **15 minutos**: Cambiar claves si es necesario
4. **30 minutos**: Evaluar impacto en datos
5. **1 hora**: Comunicar a usuarios afectados

### Comandos de Emergencia
```sql
-- Desactivar usuario comprometido
UPDATE user_company_roles 
SET is_active = false 
WHERE user_id = 'USUARIO_ID';

-- Revisar actividad reciente
SELECT * FROM security_audit_log 
WHERE user_id = 'USUARIO_ID' 
AND created_at > now() - interval '24 hours';

-- Bloquear acceso a empresa específica
UPDATE companies 
SET status = 'suspended' 
WHERE id = 'EMPRESA_ID';
```

## Checklist de Seguridad (Revisión Mensual)

- [ ] Ejecutar linter de Supabase
- [ ] Revisar logs de auditoría
- [ ] Verificar políticas RLS
- [ ] Actualizar dependencias
- [ ] Revisar usuarios inactivos
- [ ] Verificar configuración de autenticación
- [ ] Probar procedimientos de emergencia
- [ ] Revisar permisos de roles

## Contacto de Seguridad
Para reportar vulnerabilidades de seguridad, contactar al equipo de desarrollo con el prefijo [SECURITY] en el asunto.

---
*Última actualización: Enero 2025*
*Próxima revisión: Febrero 2025*