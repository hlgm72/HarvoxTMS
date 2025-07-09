# FleetNest TMS - Optimización de Rendimiento

## 🚀 **Estrategias de Performance para Datos Complejos**

### **1. Query Optimization para TMS**

#### **Índices Estratégicos**
```sql
-- Índices principales para performance TMS
CREATE INDEX idx_vehicles_company_active ON vehicles(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_loads_company_status ON loads(company_id, status, pickup_date);
CREATE INDEX idx_vehicle_positions_vehicle_time ON vehicle_positions(vehicle_id, date_time DESC);
CREATE INDEX idx_driver_payments_company_week ON driver_payments(company_id, week_ending DESC);
CREATE INDEX idx_invoices_company_status_date ON invoices(company_id, status, sent_date DESC);

-- Índices compuestos para queries complejas
CREATE INDEX idx_loads_dispatch_search ON loads(company_id, status, pickup_date, delivery_date) 
  WHERE status IN ('pending', 'assigned', 'in_transit');
```

#### **Query Patterns Optimizados**
```typescript
// ❌ MALO - Trae todo
const { data } = await supabase
  .from('vehicles')
  .select('*')

// ✅ BUENO - Solo campos necesarios + joins optimizados
const { data } = await supabase
  .from('vehicles')
  .select(`
    id, name, license_plate, status,
    driver:drivers(id, name),
    current_load:loads!loads_vehicle_id_fkey(id, load_number, status)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name')
  .limit(50)
```

### **2. Caching Inteligente con TanStack Query**

#### **Estructura de Cache Keys**
```typescript
// Cache keys jerárquicos para invalidación eficiente
export const queryKeys = {
  // Nivel 1: Entidad principal
  vehicles: ['vehicles'] as const,
  loads: ['loads'] as const,
  drivers: ['drivers'] as const,
  
  // Nivel 2: Por compañía
  vehiclesByCompany: (companyId: string) => 
    [...queryKeys.vehicles, 'company', companyId] as const,
  
  // Nivel 3: Filtros específicos
  activeVehicles: (companyId: string) => 
    [...queryKeys.vehiclesByCompany(companyId), 'active'] as const,
  
  // Nivel 4: Tiempo real
  vehiclePositions: (vehicleId: string) => 
    [...queryKeys.vehicles, vehicleId, 'positions'] as const,
}
```

#### **Cache Strategies por Tipo de Dato**
```typescript
// Datos estáticos (configuración) - Cache largo
const useCompanySettings = (companyId: string) => 
  useQuery({
    queryKey: ['company', companyId, 'settings'],
    queryFn: () => fetchCompanySettings(companyId),
    staleTime: 30 * 60 * 1000, // 30 minutos
    cacheTime: 60 * 60 * 1000, // 1 hora
  })

// Datos semi-dinámicos (flota) - Cache medio
const useFleetStatus = (companyId: string) => 
  useQuery({
    queryKey: queryKeys.activeVehicles(companyId),
    queryFn: () => fetchActiveVehicles(companyId),
    staleTime: 5 * 60 * 1000,  // 5 minutos
    refetchInterval: 10 * 60 * 1000, // 10 minutos background
  })

// Datos tiempo real (posiciones) - Cache corto
const useVehiclePositions = (vehicleId: string) => 
  useQuery({
    queryKey: queryKeys.vehiclePositions(vehicleId),
    queryFn: () => fetchVehiclePositions(vehicleId),
    staleTime: 30 * 1000,     // 30 segundos
    refetchInterval: 60 * 1000, // 1 minuto
  })
```

### **3. Real-time Optimizado**

#### **Subscriptions Selectivas**
```typescript
// Solo suscribirse a datos visibles/relevantes
const useRealtimeFleetUpdates = (companyId: string, visibleVehicleIds: string[]) => {
  useEffect(() => {
    if (visibleVehicleIds.length === 0) return;
    
    const channel = supabase
      .channel(`fleet-updates-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_positions',
          filter: `vehicle_id=in.(${visibleVehicleIds.join(',')})`,
        },
        (payload) => {
          // Invalidar cache solo de vehículos afectados
          queryClient.invalidateQueries({
            queryKey: queryKeys.vehiclePositions(payload.new.vehicle_id)
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [companyId, visibleVehicleIds]);
};
```

#### **Debounced Updates**
```typescript
// Agrupar updates frecuentes
const useDebouncedRealtimeUpdates = (callback: Function, delay = 2000) => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );

  return debouncedCallback;
};
```

### **4. Pagination y Virtualization**

#### **Infinite Scroll para Tablas Grandes**
```typescript
const useInfiniteLoads = (companyId: string, filters: LoadFilters) => 
  useInfiniteQuery({
    queryKey: ['loads', companyId, 'infinite', filters],
    queryFn: ({ pageParam = 0 }) => 
      supabase
        .from('loads')
        .select(`
          id, load_number, pickup_date, delivery_date, status,
          pickup_location, delivery_location, rate
        `)
        .eq('company_id', companyId)
        .range(pageParam * 50, (pageParam + 1) * 50 - 1)
        .order('pickup_date', { ascending: false }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.data?.length === 50 ? pages.length : undefined,
  });
```

#### **Virtual Scrolling para Performance**
```typescript
// Para listas muy grandes (1000+ items)
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualizedFleetTable = ({ vehicles }: { vehicles: Vehicle[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Altura estimada de fila
    overscan: 10, // Renderizar 10 items extra
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <VehicleRow vehicle={vehicles[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### **5. Loading States Progresivos**

#### **Skeleton Loading Contextual**
```typescript
// Skeletons específicos para cada tipo de dato TMS
const FleetTableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded">
        <Skeleton className="h-12 w-12 rounded-full" /> {/* Avatar */}
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />  {/* Truck number */}
          <Skeleton className="h-3 w-32" />  {/* Status */}
        </div>
        <Skeleton className="h-4 w-20" />    {/* Location */}
        <Skeleton className="h-8 w-16" />    {/* Actions */}
      </div>
    ))}
  </div>
);

// Loading por prioridad de datos
const usePriorityLoading = (companyId: string) => {
  // 1. Datos críticos primero
  const { data: criticalData, isLoading: loadingCritical } = useQuery({
    queryKey: ['critical', companyId],
    queryFn: () => fetchCriticalData(companyId),
  });

  // 2. Datos secundarios después
  const { data: secondaryData } = useQuery({
    queryKey: ['secondary', companyId],
    queryFn: () => fetchSecondaryData(companyId),
    enabled: !loadingCritical, // Esperar a que terminen los críticos
  });

  return { criticalData, secondaryData, isLoading: loadingCritical };
};
```

### **6. Error Handling y Retry Logic**

#### **Retry Strategies Inteligentes**
```typescript
const useResilientQuery = <T>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
  options?: UseQueryOptions<T>
) => 
  useQuery({
    ...options,
    queryKey,
    queryFn,
    retry: (failureCount, error) => {
      // Retry menos para errores 4xx (cliente)
      if (error?.status >= 400 && error?.status < 500) {
        return failureCount < 1;
      }
      // Retry más para errores 5xx (servidor)
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
```

### **7. Performance Monitoring**

#### **Métricas Automáticas**
```typescript
// Hook para monitorear performance de queries
const useQueryPerformance = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.dataUpdatedAt) {
        const duration = Date.now() - event.query.state.dataUpdatedAt;
        
        // Log queries lentas
        if (duration > 2000) {
          console.warn('Slow query detected:', {
            queryKey: event.query.queryKey,
            duration,
            dataSize: JSON.stringify(event.query.state.data).length,
          });
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);
};
```

### **8. Database Optimization Patterns**

#### **Materialized Views para Dashboards**
```sql
-- Vista materializada para KPIs de dashboard
CREATE MATERIALIZED VIEW dashboard_kpis AS
SELECT 
  company_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
  COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_vehicles,
  COUNT(*) FILTER (WHERE status = 'available') as available_vehicles,
  AVG(utilization_rate) as avg_utilization,
  COUNT(DISTINCT driver_id) as total_drivers
FROM vehicles 
WHERE is_active = true
GROUP BY company_id;

-- Refresh automático cada 15 minutos
CREATE OR REPLACE FUNCTION refresh_dashboard_kpis()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_kpis;
END;
$$ LANGUAGE plpgsql;

-- Trigger para refresh en cambios importantes
CREATE OR REPLACE FUNCTION trigger_dashboard_refresh()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('refresh_dashboard', NEW.company_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **Partitioning para Datos Históricos**
```sql
-- Partición por fecha para vehicle_positions
CREATE TABLE vehicle_positions_2024_01 PARTITION OF vehicle_positions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE vehicle_positions_2024_02 PARTITION OF vehicle_positions
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Índices en particiones
CREATE INDEX ON vehicle_positions_2024_01 (vehicle_id, date_time DESC);
CREATE INDEX ON vehicle_positions_2024_02 (vehicle_id, date_time DESC);
```

### **9. Mobile Performance**

#### **Optimizaciones Específicas Mobile**
```typescript
// Queries más agresivos para mobile
const useMobileOptimizedData = (companyId: string) => {
  const isMobile = useMobile();
  
  return useQuery({
    queryKey: ['mobile', companyId, 'optimized'],
    queryFn: () => supabase
      .from('vehicles')
      .select(isMobile 
        ? 'id, name, status' // Campos mínimos en mobile
        : 'id, name, status, location, driver_name, last_update' // Campos completos desktop
      )
      .eq('company_id', companyId),
    staleTime: isMobile ? 2 * 60 * 1000 : 5 * 60 * 1000, // Cache más largo en mobile
  });
};

// Preload crítico para mobile
const useMobilePreload = () => {
  const queryClient = useQueryClient();
  
  // Precargar datos críticos en app start
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['mobile', 'critical'],
      queryFn: () => fetchCriticalMobileData(),
    });
  }, []);
};
```

---

## 📊 **Resultados Esperados**

- **Initial Load**: < 2 segundos para dashboard principal
- **Data Updates**: < 500ms para cambios incrementales  
- **Real-time**: < 1 segundo para updates críticos
- **Large Lists**: Smooth scroll con 1000+ items
- **Mobile**: 50% menos data transfer vs desktop
- **Cache Hit Rate**: > 80% para datos frecuentes

*Todas estas optimizaciones se implementan automáticamente - no requieren configuración manual.*