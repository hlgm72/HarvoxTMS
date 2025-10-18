import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Fuel, CreditCard, FileText } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { FuelStatsCards } from '@/components/fuel/FuelStatsCards';
import { FuelFloatingActions } from '@/components/fuel/FuelFloatingActions';
import { FuelFiltersType } from '@/components/fuel/FuelFilters';
import { PeriodFilterValue } from '@/components/loads/PeriodFilter';
import { CurrentFiltersDisplay } from '@/components/fuel/CurrentFiltersDisplay';
import { CONTEXT_CONFIGS } from '@/components/ui/filterConfigs';
import { FuelExpensesList } from '@/components/fuel/FuelExpensesList';
import { FuelExpenseDialog } from '@/components/fuel/FuelExpenseDialog';
import { ViewFuelExpenseDialog } from '@/components/fuel/ViewFuelExpenseDialog';
import { DriverCardsManager } from '@/components/fuel/DriverCardsManager';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { PDFAnalyzer } from '@/components/fuel/PDFAnalyzer';
import { useCurrentPaymentPeriod, usePaymentPeriods } from '@/hooks/usePaymentPeriods';
import { useConsolidatedDrivers } from '@/hooks/useConsolidatedDrivers';
import { useGeotabVehicles } from '@/hooks/useGeotabVehicles';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';

export default function FuelManagement() {
  const { t } = useTranslation(['fuel', 'common']);
  
  // Obtener datos necesarios para filtros
  const { drivers = [], loading: driversLoading } = useConsolidatedDrivers();
  const { geotabVehicles: rawVehicles = [] } = useGeotabVehicles();
  
  // Mapear vehículos al formato esperado por los filtros
  const vehicles = rawVehicles.map(vehicle => ({
    id: vehicle.id,
    plate_number: vehicle.license_plate || vehicle.name || `Vehículo ${vehicle.id.slice(0, 8)}`
  }));
  
  // Obtener el período actual y todos los períodos para fallback
  const { data: currentPeriod } = useCurrentPaymentPeriod();
  const { data: periods = [] } = usePaymentPeriods();
  const { data: calculatedPeriods } = useCalculatedPeriods();

  // Estado de filtros con período actual por defecto
  const [filters, setFilters] = useState<{
    search: string;
    driverId: string;
    status: string;
    vehicleId: string;
    periodFilter: PeriodFilterValue;
  }>({
    search: '',
    driverId: 'all',
    status: 'all',
    vehicleId: 'all',
    periodFilter: { 
      type: 'current'
    }
  });

  // Actualizar periodId cuando se carga el período actual
  useEffect(() => {
    if (filters.periodFilter.type === 'current' && !filters.periodFilter.periodId) {
      if (currentPeriod) {
        console.log('✅ Estableciendo período actual desde BD:', currentPeriod);
        setFilters(prev => ({
          ...prev,
          periodFilter: {
            ...prev.periodFilter,
            periodId: currentPeriod.id
          }
        }));
      } else {
        // Si no hay período real, mantener periodId como undefined
        // Esto permitirá filtrar por fechas calculadas sin romper las consultas
        console.log('⚠️ No hay período actual real en BD - usando período calculado solo para display');
      }
    }
  }, [currentPeriod, filters.periodFilter.type, filters.periodFilter.periodId]);

  console.log('🔍 Filtros activos en Fuel Management:', filters);
  console.log('📅 Período actual cargado:', currentPeriod);
  
  const [activeTab, setActiveTab] = useState('expenses');

  // Estado de modales
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [viewExpenseId, setViewExpenseId] = useState<string | null>(null);

  // Estados de carga para sync y export
  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Handler para sincronización con FleetOne
  const handleFleetOneSync = async () => {
    setSyncLoading(true);
    try {
      console.log('🔄 Sincronizando con FleetOne...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Sincronización completada');
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  // Handler para exportar datos
  const handleExport = async (format: string) => {
    setExportLoading(true);
    try {
      console.log(`📄 Exportando datos como ${format}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Export completado');
    } catch (error) {
      console.error('❌ Error en export:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Convertir filtros para las consultas - maneja período actual y seleccionado  
  const queryFilters = {
    search: filters.search || undefined,
    driverId: filters.driverId !== 'all' ? filters.driverId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : undefined,
    // ✅ CORREGIDO: Detectar períodos calculados y usar fechas apropiadas
    ...((() => {
      const periodId = filters.periodFilter?.periodId || currentPeriod?.id;
      
      // Si es un período calculado, usar fechas del filtro o calculadas
      if (periodId?.startsWith('calculated-')) {
        console.log('🔍 Período calculado detectado en queryFilters:', periodId);
        
        // Determinar qué período calculado usar basado en el type
        let targetPeriod;
        if (filters.periodFilter.type === 'current') {
          targetPeriod = calculatedPeriods?.current;
        } else if (filters.periodFilter.type === 'previous') {
          targetPeriod = calculatedPeriods?.previous;
        }
        
        return {
          periodId: undefined, // No pasar periodId calculado
          startDate: filters.periodFilter.startDate || targetPeriod?.period_start_date,
          endDate: filters.periodFilter.endDate || targetPeriod?.period_end_date
        };
      }
      
      // Si es período real de BD, usarlo
      if (periodId && !periodId.startsWith('calculated-')) {
        return { periodId };
      }
      
      // Si no hay período específico pero hay tipo, usar fechas calculadas
      if (filters.periodFilter.type === 'current' && calculatedPeriods?.current) {
        return {
          periodId: undefined,
          startDate: calculatedPeriods.current.period_start_date,
          endDate: calculatedPeriods.current.period_end_date
        };
      }
      
      if (filters.periodFilter.type === 'previous' && calculatedPeriods?.previous) {
        return {
          periodId: undefined,
          startDate: calculatedPeriods.previous.period_start_date,
          endDate: calculatedPeriods.previous.period_end_date
        };
      }
      
      // Por defecto, usar período actual calculado
      return calculatedPeriods?.current ? {
        periodId: undefined,
        startDate: calculatedPeriods.current.period_start_date,
        endDate: calculatedPeriods.current.period_end_date
      } : {};
    })())
  };

  console.log('🔍 Query filters aplicados:', queryFilters);

  const handleEdit = (expenseId: string) => {
    setEditExpenseId(expenseId);
  };

  const handleView = (expenseId: string) => {
    setViewExpenseId(expenseId);
  };

  // Configuración de filtros para el componente ActiveFiltersDisplay
  const fuelFilterConfig = CONTEXT_CONFIGS.fuel.filterConfig;
  
  const handleClearFilters = () => {
    const clearedFilters = fuelFilterConfig.clearFilters();
    setFilters(clearedFilters);
  };

  return (
    <>
      {/* Header */}
      <PageToolbar
        title={t('fuel:page.title')}
        subtitle={t('fuel:page.subtitle')}
        icon={Fuel}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('fuel:page.actions.register_fuel')}</span>
            <span className="sm:hidden">{t('fuel:page.actions.new')}</span>
          </Button>
        }
      />

      <div className="p-2 md:p-4 space-y-4 md:space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger value="expenses" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('fuel:page.tabs.expenses_full')}</span>
              <span className="sm:hidden">{t('fuel:page.tabs.expenses')}</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('fuel:page.tabs.fuel_cards_full')}</span>
              <span className="sm:hidden">{t('fuel:page.tabs.cards')}</span>
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('fuel:page.tabs.pdf_analyzer')}</span>
              <span className="sm:hidden">{t('fuel:page.tabs.pdf')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6 mt-6">
            {/* Estadísticas */}
            <FuelStatsCards filters={queryFilters} />

            {/* Criterios de Filtrado Aplicados */}
            <CurrentFiltersDisplay
              filters={filters}
              drivers={drivers}
              vehicles={vehicles}
              onClearFilters={handleClearFilters}
            />

            {/* Lista de Gastos */}
            <FuelExpensesList 
              filters={queryFilters}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="cards" className="mt-6">
            {/* Gestión de Tarjetas de Combustible */}
            <DriverCardsManager />
          </TabsContent>

          <TabsContent value="analyzer" className="mt-6">
            {/* Analizador de PDF */}
            <PDFAnalyzer />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modales */}
      <FuelExpenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      <FuelExpenseDialog
        expenseId={editExpenseId}
        open={!!editExpenseId}
        onOpenChange={(open) => !open && setEditExpenseId(null)}
      />
      
      <ViewFuelExpenseDialog
        expenseId={viewExpenseId}
        open={!!viewExpenseId}
        onOpenChange={(open) => !open && setViewExpenseId(null)}
      />

      {/* Floating Actions - Solo para tab de gastos */}
      {activeTab === 'expenses' && (
        <FuelFloatingActions
          filters={{
            periodFilter: filters.periodFilter,
            driverId: filters.driverId,
            status: filters.status,
            vehicleId: filters.vehicleId
          }}
          onFiltersChange={(newFilters) => {
            setFilters(prev => ({
              ...prev,
              periodFilter: newFilters.periodFilter,
              driverId: newFilters.driverId,
              status: newFilters.status,
              vehicleId: newFilters.vehicleId
            }));
          }}
        />
      )}
    </>
  );
}