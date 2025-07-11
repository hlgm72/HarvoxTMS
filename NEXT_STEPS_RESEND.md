# 🚀 Configuración de Resend para Sistema de Invitaciones

## Pasos para Activar el Sistema de Invitaciones

### 1. Crear Cuenta en Resend
- Ve a https://resend.com
- Crea una cuenta gratuita
- Verifica tu dominio (importante para deliverability)

### 2. Obtener API Key
- Ve a https://resend.com/api-keys
- Crea una nueva API key
- Cópiala para el siguiente paso

### 3. Configurar en Supabase
- El sistema necesita la variable `RESEND_API_KEY` en Supabase Secrets
- Una vez configurada, las invitaciones funcionarán automáticamente

### 4. Flujo Completo
```
Superadmin → Crear Empresa → Botón "Invitar Owner" → 
Email Enviado → Usuario crea contraseña → Login automático
```

### 5. Características Implementadas
✅ Validación de empresa sin owner
✅ Tokens seguros con expiración
✅ Email profesional con diseño responsive  
✅ Página de registro personalizada
✅ Asignación automática de roles
✅ Prevención de invitaciones duplicadas

### 6. Beneficios del Sistema
- **Seguro**: No se almacenan contraseñas temporales
- **Profesional**: Emails con marca FleetNest
- **Automático**: Asignación de roles sin intervención
- **Escalable**: Funciona para cualquier número de empresas
- **Auditable**: Tracking completo de invitaciones