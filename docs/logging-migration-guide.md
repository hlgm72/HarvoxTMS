# Guía de Migración al Sistema de Logging

Esta guía te ayudará a migrar del logging tradicional (`console.log`) al nuevo sistema que evita spam en Sentry.

## 🎯 Objetivo

**Antes**: Logs enviaban spam a Sentry causando errores 429 (Too Many Requests)
**Después**: Solo errores críticos van a Sentry, debug solo en desarrollo

## 📋 Checklist de Migración

### 1. Reemplazar console.log básicos

```typescript
// ❌ ANTES - Va a Sentry en producción
console.log('🔥 User clicked button:', userId);
console.log('🔍 Debug info:', debugData);

// ✅ DESPUÉS - Solo desarrollo
import { useLogger } from '@/lib/logger';
const log = useLogger('ComponentName');

log.debug('User clicked button', { userId });
log.debug('Debug info', { debugData });
```

### 2. Convertir console.error críticos

```typescript
// ❌ ANTES - Sin contexto útil
console.error('❌ API failed:', error);

// ✅ DESPUÉS - Con contexto rico para Sentry
import { handleAsyncError } from '@/lib/logger';

handleAsyncError(error, 'ComponentName.apiCall', {
  userId,
  endpoint: '/api/payments',
  retryCount: 3,
  timestamp: new Date().toISOString()
});
```

### 3. Actualizar logs de performance

```typescript
// ❌ ANTES - Medición manual
const start = Date.now();
await processData();
console.log('⏱️ Processing took:', Date.now() - start);

// ✅ DESPUÉS - Sistema automático
import { performance } from '@/lib/logger';

const timer = performance.start('data_processing');
await processData();
performance.end('data_processing', timer);
// Auto-warn si > 1s, auto-log en desarrollo
```

### 4. Logs de negocio especializados

```typescript
// ❌ ANTES - Logs genéricos
console.log('Payment created:', paymentData);
console.log('Period changed:', newPeriod);

// ✅ DESPUÉS - Logs estructurados
import { business } from '@/lib/logger';

business.payment('payment_created', {
  paymentId: result.id,
  amount: paymentData.amount,
  driverId: paymentData.driverId
});

business.payment('period_filter_changed', {
  filterType: newPeriod.type,
  periodId: newPeriod.id
});
```

## 🔄 Patrones de Migración Comunes

### Componente de Lista/Filtro

```typescript
// ANTES
export function ItemList() {
  const handleFilter = (filter) => {
    console.log('🔥 Filter applied:', filter);
    applyFilter(filter);
  };
  
  return <FilterComponent onFilter={handleFilter} />;
}

// DESPUÉS
import { useLogger, business } from '@/lib/logger';

export function ItemList() {
  const log = useLogger('ItemList');
  
  const handleFilter = (filter) => {
    log.debug('Filter applied', { filterType: filter.type, value: filter.value });
    business.payment('filter_changed', { filterType: filter.type });
    applyFilter(filter);
  };
  
  return <FilterComponent onFilter={handleFilter} />;
}
```

### Hook de Datos

```typescript
// ANTES
export function useApiData(url) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    console.log('🔍 Fetching data from:', url);
    
    fetch(url)
      .then(res => {
        console.log('✅ Data loaded:', res);
        return res.json();
      })
      .then(setData)
      .catch(err => {
        console.error('❌ Fetch failed:', err);
      });
  }, [url]);
  
  return data;
}

// DESPUÉS
import { useLogger, handleAsyncError } from '@/lib/logger';

export function useApiData(url) {
  const log = useLogger('useApiData');
  const [data, setData] = useState(null);
  
  useEffect(() => {
    log.debug('Fetching data', { endpoint: url.split('/').pop() });
    
    fetch(url)
      .then(res => {
        log.info('Data loaded successfully', { 
          endpoint: url.split('/').pop(),
          size: res.headers.get('content-length') 
        });
        return res.json();
      })
      .then(setData)
      .catch(err => {
        handleAsyncError(err, 'useApiData.fetch', {
          endpoint: url.split('/').pop(),
          retryPossible: true
        });
      });
  }, [url]);
  
  return data;
}
```

### Form con Validación

```typescript
// ANTES
export function PaymentForm() {
  const handleSubmit = async (data) => {
    console.log('🚀 Submitting form:', data);
    
    try {
      const result = await submitPayment(data);
      console.log('✅ Success:', result);
    } catch (error) {
      console.error('❌ Submit failed:', error);
    }
  };
}

// DESPUÉS
import { useLogger, business, handleAsyncError } from '@/lib/logger';

export function PaymentForm() {
  const log = useLogger('PaymentForm');
  
  const handleSubmit = async (data) => {
    log.debug('Form submission started', { 
      driverId: data.driverId, 
      amount: data.amount 
    });
    
    try {
      const result = await submitPayment(data);
      
      log.info('Payment submitted successfully', { 
        paymentId: result.id 
      });
      
      business.payment('payment_form_submitted', {
        driverId: data.driverId,
        amount: data.amount,
        success: true
      });
      
    } catch (error) {
      handleAsyncError(error, 'PaymentForm.handleSubmit', {
        formData: { driverId: data.driverId, amount: data.amount },
        step: 'payment_submission'
      });
      
      business.payment('payment_form_submitted', {
        driverId: data.driverId,
        amount: data.amount,
        success: false
      });
    }
  };
}
```

## 🎯 Identificar Qué Migrar Primero

### Alta Prioridad (Causan más spam):
1. ✅ **Clicks frecuentes** - Filtros, botones, selecciones
2. ✅ **Loops de procesamiento** - Análisis de PDFs, cálculos masivos  
3. ✅ **Estados de componentes** - Mount/unmount, updates
4. ✅ **Validaciones en tiempo real** - Form inputs, validaciones

### Media Prioridad:
5. **Logs de carga inicial** - useEffect una sola vez
6. **Logs de navegación** - Route changes
7. **Logs de configuración** - Settings updates

### Baja Prioridad:
8. **Logs de desarrollo puro** - Ya comentados o raramente ejecutados

## 🔍 Herramientas para Identificar Logs Problemáticos

### Buscar patrones problemáticos:
```bash
# Logs con emojis (probables debug logs)
grep -r "console\.log.*🔥\|console\.log.*🔍\|console\.log.*✅" src/

# Logs en loops o maps
grep -r "\.map.*console\|\.forEach.*console" src/

# Logs de clicks y eventos
grep -r "onClick.*console\|onSelect.*console" src/
```

### Priorizar por frecuencia:
```typescript
// ❌ ALTA FRECUENCIA - Migrar primero
const handleClick = () => {
  console.log('🔥 User clicked'); // Se ejecuta cada click
};

// ❌ MEDIA FRECUENCIA - Migrar después  
useEffect(() => {
  console.log('Component mounted'); // Solo una vez por mount
}, []);

// ✅ BAJA FRECUENCIA - Puede esperar
const handleRareAction = () => {
  console.log('Rare action executed'); // Muy ocasional
};
```

## ✅ Validar la Migración

### Verificar en desarrollo:
```typescript
// Los debug logs deben aparecer en consola
log.debug('This should appear in dev console');

// Los logs de negocio también
business.payment('test_event', { data: 'test' });
```

### Verificar en producción:
```typescript
// Los debug NO deben aparecer en prod
log.debug('This should NOT appear in prod console');

// Solo errors y warns van a Sentry
log.error('This WILL go to Sentry', error, { context: 'important' });
log.warn('This WILL go to Sentry', { context: 'warning' });
```

## 📊 Medir el Impacto

**Antes de la migración:**
- Sentry: 1000+ eventos/día con muchos logs de debug
- Errores 429 frecuentes

**Después de la migración:**
- Sentry: Solo errores reales (~50-100 eventos/día)
- Sin errores 429
- Mejor signal-to-noise ratio en Sentry

Esta migración es gradual - puedes hacerla componente por componente sin romper la aplicación.