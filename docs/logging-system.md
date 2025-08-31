# Sistema de Logging Condicional

Este sistema evita el spam de logs a Sentry en producción, enviando solo errores y advertencias críticas.

## 🎯 Comportamiento por Entorno

### Desarrollo
- ✅ DEBUG: Se muestran (útil para debugging)
- ✅ INFO: Se muestran (eventos importantes)
- ✅ WARN: Se muestran y van a Sentry
- ✅ ERROR: Se muestran y van a Sentry

### Producción
- ❌ DEBUG: Se omiten (NO van a Sentry)
- ❌ INFO: Se omiten (NO van a Sentry)
- ✅ WARN: Se muestran y van a Sentry
- ✅ ERROR: Se muestran y van a Sentry

## 📝 Uso Básico

```typescript
import { logger, useLogger } from '@/lib/logger';

// Logs directos
logger.debug('Estado del componente', { userId: '123', action: 'click' });
logger.info('Operación completada', { duration: '250ms' });
logger.warn('Rendimiento lento detectado', { duration: '2000ms' });
logger.error('Error crítico', error, { component: 'PaymentForm' });

// Hook para componentes React
function MyComponent() {
  const log = useLogger('MyComponent');
  
  useEffect(() => {
    log.debug('Componente montado');
    
    fetchData()
      .then(() => log.info('Datos cargados exitosamente'))
      .catch(error => log.error('Error cargando datos', error));
  }, []);
}
```

## 🏢 Logs de Negocio Especializados

```typescript
import { business } from '@/lib/logger';

// Operaciones de pago
business.payment('period_created', { 
  periodId: 'xxx', 
  companyId: 'yyy', 
  startDate: '2024-01-01' 
});

// Operaciones de cargas
business.load('status_updated', 'load-123', { 
  from: 'assigned', 
  to: 'in_transit' 
});

// Operaciones de combustible
business.fuel('expense_created', { 
  amount: 150.50, 
  driverId: 'driver-456' 
});

// Operaciones de auth (solo en desarrollo)
business.auth('user_login', { userId: 'user-789' });
```

## ⚡ Medición de Performance

```typescript
import { performance } from '@/lib/logger';

function expensiveOperation() {
  const timer = performance.start('data_processing');
  
  // ... operación costosa ...
  
  performance.end('data_processing', timer);
  // Solo en desarrollo: muestra duración
  // Si > 1s: envía warning a Sentry
}
```

## 🛠️ Manejo de Errores Async

```typescript
import { handleAsyncError } from '@/lib/logger';

async function fetchUserData(userId: string) {
  try {
    const data = await api.getUser(userId);
    return data;
  } catch (error) {
    handleAsyncError(error, 'fetchUserData', { userId });
    throw error; // Re-lanzar si es necesario
  }
}
```

## 🎯 Mejores Prácticas

### ✅ Qué SÍ hacer:

```typescript
// 1. Usar DEBUG para flujos de desarrollo
logger.debug('User clicked period filter', { periodId, userId });

// 2. Usar INFO para eventos importantes de negocio (solo desarrollo)
logger.info('Payment calculation completed', { 
  periodId, 
  totalDrivers: 15, 
  totalAmount: 45000 
});

// 3. Usar WARN para problemas no críticos (van a Sentry)
logger.warn('Slow query detected', { 
  query: 'payment_calculations', 
  duration: '2.5s' 
});

// 4. Usar ERROR para problemas críticos (van a Sentry)
logger.error('Failed to create payment period', error, { 
  companyId, 
  attemptNumber: 3 
});

// 5. Incluir contexto útil
logger.error('Database connection failed', error, {
  component: 'PaymentForm',
  userId: user?.id,
  action: 'save_payment',
  retryCount: 2
});
```

### ❌ Qué NO hacer:

```typescript
// ❌ No usar console.log directo (irá a Sentry)
console.log('Debug info');

// ❌ No loggar información sensible
logger.debug('User logged in', { password: 'secret123' });

// ❌ No usar ERROR para cosas no críticas
logger.error('User clicked button'); // Usar debug o info

// ❌ No loggar en loops sin control
transactions.forEach(t => {
  logger.debug('Processing transaction', t); // Spam en desarrollo
});

// ✅ Mejor: Log resumido
logger.debug(`Processing ${transactions.length} transactions`);
```

## 🔧 Configuración en Componentes

### Componente con mucha interacción:
```typescript
import { useLogger, business } from '@/lib/logger';

export function PeriodFilter({ onChange }: Props) {
  const log = useLogger('PeriodFilter');
  
  const handlePeriodSelect = (period: Period) => {
    // Solo en desarrollo - no irá a Sentry en prod
    log.debug('Period selected', { 
      periodId: period.id, 
      dateRange: `${period.start} - ${period.end}` 
    });
    
    // Log de negocio (desarrollo solamente)
    business.payment('period_filter_changed', {
      newPeriodId: period.id,
      filterType: 'specific'
    });
    
    onChange(period);
  };
  
  return (
    <Select onValueChange={handlePeriodSelect}>
      {/* ... */}
    </Select>
  );
}
```

### Manejo de errores en forms:
```typescript
import { useLogger, handleAsyncError } from '@/lib/logger';

export function PaymentForm() {
  const log = useLogger('PaymentForm');
  
  const handleSubmit = async (data: FormData) => {
    try {
      log.info('Submitting payment form', { 
        driverId: data.driverId,
        amount: data.amount 
      });
      
      await createPayment(data);
      
      log.info('Payment created successfully', { paymentId: result.id });
    } catch (error) {
      // Esto SÍ irá a Sentry con contexto útil
      handleAsyncError(error, 'PaymentForm.handleSubmit', {
        formData: { driverId: data.driverId, amount: data.amount },
        step: 'payment_creation'
      });
    }
  };
}
```

## 📊 Monitoreo y Alertas

El sistema permite:

1. **Desarrollo**: Ver todos los logs para debugging
2. **Producción**: Solo errores críticos van a Sentry
3. **Performance**: Detectar operaciones lentas automáticamente
4. **Contexto rico**: Cada log incluye información útil para debugging

## 🚀 Migración Gradual

Para migrar logs existentes:

```typescript
// Antes
console.log('🔥 User clicked:', data);
console.error('❌ API failed:', error);

// Después
import { useLogger } from '@/lib/logger';
const log = useLogger('ComponentName');

log.debug('User clicked', { data });
log.error('API failed', error, { endpoint: '/api/users' });
```

Este sistema garantiza que solo la información crítica llegue a Sentry en producción, eliminando el ruido de debug y mejorando la experiencia de monitoreo.