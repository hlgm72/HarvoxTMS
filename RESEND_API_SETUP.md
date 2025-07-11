# 🚀 Configurar Resend API Key

El sistema de invitaciones está completamente implementado y solo necesita la configuración de Resend para enviar emails.

## Pasos para activar:

1. **Ir a Resend**: https://resend.com
2. **Crear cuenta gratuita**
3. **Obtener API Key**: https://resend.com/api-keys
4. **Configurar en Supabase**: Añadir `RESEND_API_KEY` en los secrets

## Una vez configurado:
- El botón "Invite Company Owner" estará funcional
- Se enviarán emails profesionales automáticamente  
- Los usuarios podrán crear sus cuentas de forma segura
- Se asignarán roles automáticamente

## Flujo completo:
```
Superadmin → Crea empresa → Invita owner → Email enviado → 
Usuario configura contraseña → Acceso como Company Owner
```