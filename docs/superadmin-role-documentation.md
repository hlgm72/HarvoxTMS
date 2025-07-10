# SuperAdmin Role - Documentación Completa

## 🎯 Descripción General

El **SuperAdmin** es el rol de más alto nivel en FleetNest, diseñado para administrar el sistema global y gestionar empresas en un entorno **multi-tenant**. Su función principal es la gestión comercial y administrativa del sistema, manteniendo el aislamiento total entre empresas.

---

## ✅ Funciones y Permisos del SuperAdmin

### 🏢 **Gestión de Empresas** (Función Principal)
- ✅ **Crear nuevas empresas** en el sistema
- ✅ **Ver listado completo de empresas registradas**
- ✅ **Editar información básica de empresas**
- ✅ **Gestionar estados de empresas** (activa/inactiva)
- ✅ **Ver información de contacto** de propietarios
- ✅ **Asignar planes de suscripción** (basic, premium, enterprise)
- ✅ **Configurar límites por empresa** (usuarios, vehículos)

### 📊 **Estadísticas del Sistema**
- ✅ **Métricas globales agregadas**:
  - Total de empresas registradas
  - Total de usuarios en el sistema
  - Total de vehículos registrados
  - Total de conductores activos
- ✅ **Estadísticas de ventas y crecimiento**
- ✅ **Reportes de uso del sistema**
- ✅ **Dashboard de administración global**

### 👥 **Gestión de Accesos**
- ✅ **Asignar rol `company_owner`** a usuarios
- ✅ **Gestionar accesos de nivel sistema**
- ✅ **Ver usuarios registrados** (información básica)
- ✅ **Activar/desactivar empresas**

### ⚙️ **Configuración del Sistema**
- ✅ **Configurar parámetros globales**
- ✅ **Gestionar integraciones del sistema**
- ✅ **Administrar configuraciones de seguridad**
- ✅ **Gestionar backups y mantenimiento**

---

## ❌ Limitaciones y Restricciones (Multi-Tenant)

### 🚫 **NO puede acceder a datos operativos internos**:

#### **Datos de Conductores**:
- ❌ Ver conductores específicos de empresas
- ❌ Acceder a perfiles de conductores
- ❌ Ver información personal de empleados
- ❌ Gestionar horarios o asignaciones de conductores

#### **Datos Operativos**:
- ❌ Ver cargas específicas de empresas
- ❌ Acceder a rutas y despachos
- ❌ Ver documentos de cargas
- ❌ Gestionar asignaciones operativas

#### **Información Financiera Detallada**:
- ❌ Ver períodos de pago específicos
- ❌ Acceder a gastos de combustible
- ❌ Ver ingresos detallados por empresa
- ❌ Gestionar pagos a conductores
- ❌ Acceder a reportes financieros internos

#### **Documentos y Comunicaciones**:
- ❌ Ver documentos internos de empresas
- ❌ Acceder a comunicaciones privadas
- ❌ Ver reportes operativos específicos

---

## 🔐 Configuración de Acceso

### **Requisitos para ser SuperAdmin**:
1. **Usuario registrado** en el sistema de autenticación
2. **Rol asignado**: `role = 'superadmin'` en tabla `user_company_roles`
3. **Estado activo**: `is_active = true`
4. **Empresa del sistema**: Vinculado a empresa `SYSTEM_SUPERADMIN`

### **Proceso de Asignación**:
```sql
-- Solo se puede crear UN SuperAdmin usando la función:
SELECT public.assign_first_superadmin('user_id_here');
```

### **Verificación de Rol**:
```sql
-- Función para verificar si un usuario es SuperAdmin:
SELECT public.is_superadmin(); -- Retorna true/false
```

---

## 🛡️ Políticas de Seguridad (RLS)

### **Políticas que le dan acceso**:
- ✅ `system_stats` - Solo SuperAdmin puede ver estadísticas del sistema
- ✅ `companies` - Puede ver información básica de todas las empresas
- ✅ `profiles` - Puede ver información básica de usuarios

### **Políticas que lo excluyen**:
- ❌ Todas las tablas operativas incluyen: `NOT public.is_superadmin()`
- ❌ `company_drivers`, `driver_profiles`, `loads`, `payment_periods`
- ❌ `fuel_expenses`, `expense_instances`, `other_income`

---

## 🔄 Flujos de Trabajo Típicos

### **1. Registro de Nueva Empresa**:
1. SuperAdmin crea empresa en el sistema
2. Configura plan y límites
3. Asigna Company Owner inicial
4. Empresa queda operativa para uso independiente

### **2. Gestión de Suscripciones**:
1. Revisa métricas de uso por empresa
2. Ajusta planes según necesidades
3. Modifica límites de usuarios/vehículos
4. Gestiona renovaciones y pagos

### **3. Soporte Técnico**:
1. Revisa estadísticas del sistema
2. Identifica problemas globales
3. Configura parámetros del sistema
4. NO accede a datos específicos de empresas

---

## 📊 Dashboard SuperAdmin

### **Métricas Principales**:
- **Total Empresas**: Contador global de empresas registradas
- **Total Usuarios**: Todos los usuarios del sistema
- **Total Vehículos**: Agregado de todos los vehículos
- **Total Conductores**: Suma de conductores activos

### **Funcionalidades del Dashboard**:
- **Vista de empresas**: Lista con información básica
- **Estadísticas del sistema**: Métricas agregadas y anonimizadas
- **Acciones rápidas**: Crear empresa, configurar sistema
- **Reportes de ventas**: Crecimiento y adopción

---

## 🚨 Principios de Aislamiento Multi-Tenant

### **Regla de Oro**:
> *"El SuperAdmin administra el SISTEMA, no las OPERACIONES de las empresas"*

### **Separación Clara**:
- **SuperAdmin** = Gestión del sistema y ventas
- **Company Owner** = Gestión operativa de SU empresa
- **Otros roles** = Funciones específicas dentro de cada empresa

### **Verificación de Cumplimiento**:
```sql
-- Esta consulta NO debe retornar datos para SuperAdmin:
SELECT * FROM loads WHERE driver_user_id = auth.uid();

-- Esta consulta SÍ debe funcionar para SuperAdmin:
SELECT COUNT(*) FROM companies;
```

---

## 📋 Lista de Verificación

### **✅ Implementación Correcta**:
- [ ] SuperAdmin puede crear empresas
- [ ] SuperAdmin ve estadísticas globales
- [ ] SuperAdmin NO ve datos operativos específicos
- [ ] Un solo SuperAdmin por sistema
- [ ] Aislamiento multi-tenant funcionando
- [ ] Políticas RLS correctamente configuradas

### **🔍 Puntos de Verificación**:
1. **¿Puede el SuperAdmin ver conductores específicos?** → NO
2. **¿Puede crear empresas?** → SÍ
3. **¿Ve el total de empresas del sistema?** → SÍ
4. **¿Puede acceder a cargas específicas?** → NO
5. **¿Puede asignar Company Owners?** → SÍ

---

## 📞 Contacto y Soporte

Para dudas sobre el rol SuperAdmin o modificaciones al sistema:
- Revisar esta documentación
- Verificar políticas RLS en la base de datos
- Consultar logs del sistema para troubleshooting

---

*Última actualización: Enero 2025*
*Versión del sistema: FleetNest v1.0*