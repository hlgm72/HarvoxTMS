import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Fuel, CreditCard, FileText, RefreshCw } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { FuelStatsCards } from '@/components/fuel/FuelStatsCards';
import { FuelFloatingActions } from '@/components/fuel/FuelFloatingActions';
import { FuelFiltersType } from '@/components/fuel/FuelFilters';
import { PeriodFilterValue } from '@/components/loads/PeriodFilter';
import { FuelExpensesList } from '@/components/fuel/FuelExpensesList';
import { FuelExpenseDialog } from '@/components/fuel/FuelExpenseDialog';
import { ViewFuelExpenseDialog } from '@/components/fuel/ViewFuelExpenseDialog';
import { DriverCardsManager } from '@/components/fuel/DriverCardsManager';
import { FleetOneSync } from '@/components/fuel/FleetOneSync';
import { formatDateInUserTimeZone, formatCurrency, formatPaymentPeriodBadge, formatDetailedPaymentPeriod } from '@/lib/dateFormatting';
import { PDFAnalyzer } from '@/components/fuel/PDFAnalyzer';
import { useCurrentPaymentPeriod, usePaymentPeriods } from '@/hooks/usePaymentPeriods';
import { useConsolidatedDrivers } from '@/hooks/useConsolidatedDrivers';
import { useGeotabVehicles } from '@/hooks/useGeotabVehicles';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';
import { useFuelStats } from '@/hooks/useFuelStats';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useCompanyFinancialData } from '@/hooks/useSecureCompanyData';

export default function FuelManagement() {
  const { t } = useTranslation(['fuel', 'common']);
  
  // Obtener compañía y datos financieros
  const { userCompany } = useCompanyCache();
  const { data: companyData } = useCompanyFinancialData(userCompany?.company_id);
  
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
      }
    }
  }, [currentPeriod, filters.periodFilter.type, filters.periodFilter.periodId]);
  
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setSyncLoading(false);
    }
  };

  // Handler para exportar datos
  const handleExport = async (format: string) => {
    setExportLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    // ✅ CORREGIDO: Siempre usar fechas del periodFilter si están disponibles
    ...((() => {
      const pf = filters.periodFilter;
      
      // 1. Si el filtro ya tiene fechas explícitas, usarlas directamente
      if (pf?.startDate && pf?.endDate) {
        return {
          startDate: pf.startDate,
          endDate: pf.endDate
        };
      }
      
      // 2. Si es tipo 'all', no filtrar por período
      if (pf?.type === 'all') {
        return {};
      }
      
      // 3. Si es tipo 'current', usar período calculado
      if (pf?.type === 'current' && calculatedPeriods?.current) {
        return {
          startDate: calculatedPeriods.current.period_start_date,
          endDate: calculatedPeriods.current.period_end_date
        };
      }
      
      // 4. Si es tipo 'previous', usar período calculado
      if (pf?.type === 'previous' && calculatedPeriods?.previous) {
        return {
          startDate: calculatedPeriods.previous.period_start_date,
          endDate: calculatedPeriods.previous.period_end_date
        };
      }
      
      // 5. Si hay un periodId específico de BD (no calculado), usarlo
      if (pf?.periodId && !pf.periodId.startsWith('calculated-')) {
        return { periodId: pf.periodId };
      }
      
      // 6. Por defecto, usar período actual calculado si está disponible
      if (calculatedPeriods?.current) {
        return {
          startDate: calculatedPeriods.current.period_start_date,
          endDate: calculatedPeriods.current.period_end_date
        };
      }
      
      return {};
    })())
  };

  // Obtener estadísticas con los filtros aplicados
  const { data: stats, isLoading: statsLoading } = useFuelStats(queryFilters);

  // ✅ Generar descripción de filtros activos
  const getFilterDescription = () => {
    const parts: string[] = [];
    
    // Filtro de período
    if (filters.periodFilter) {
      const pf = filters.periodFilter as any;
      
      // ✅ PRIMERO verificar current/previous para SIEMPRE usar cálculo dinámico
      if (pf.type === 'current') {
        // ✅ SIEMPRE usar período calculado dinámico
        const displayCurrentPeriod = calculatedPeriods?.current;
        if (displayCurrentPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayCurrentPeriod.period_start_date, 
            displayCurrentPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
          const dateRange = formatPaymentPeriodBadge(displayCurrentPeriod.period_start_date, displayCurrentPeriod.period_end_date);
          parts.push(`Current: ${periodNumber} (${dateRange})`);
        } else {
          parts.push(t("common:periods.current"));
        }
      } else if (pf.type === 'previous') {
        // ✅ SIEMPRE usar período calculado dinámico
        const displayPreviousPeriod = calculatedPeriods?.previous;
        if (displayPreviousPeriod) {
          const periodLabel = formatDetailedPaymentPeriod(
            displayPreviousPeriod.period_start_date, 
            displayPreviousPeriod.period_end_date, 
            Array.isArray(companyData) ? companyData[0]?.default_payment_frequency : companyData?.default_payment_frequency
          );
          const periodNumber = periodLabel.split(':')[0].replace('Week ', 'W');
          const dateRange = formatPaymentPeriodBadge(displayPreviousPeriod.period_start_date, displayPreviousPeriod.period_end_date);
          parts.push(`Previous: ${periodNumber} (${dateRange})`);
        } else {
          parts.push(t("common:periods.previous"));
        }
      } else if (pf.type === 'all') {
        parts.push(t("common:periods.all"));
      } else if (pf.label) {
        parts.push(pf.label);
      } else if (pf.type === 'specific' && pf.periodId) {
        parts.push(t("common:periods.specific"));
      }
    }
    
    // Filtro de conductor
    if (filters.driverId && filters.driverId !== 'all') {
      const driver = drivers.find(d => d.user_id === filters.driverId);
      parts.push(`${t("common:filters.driver")}: ${driver ? `${driver.first_name} ${driver.last_name}` : t("fuel:filters.selected")}`);
    }
    
    // Filtro de vehículo
    if (filters.vehicleId && filters.vehicleId !== 'all') {
      const vehicle = vehicles.find(v => v.id === filters.vehicleId);
      parts.push(`${t("common:filters.vehicle")}: ${vehicle ? vehicle.plate_number : t("fuel:filters.selected")}`);
    }
    
    // Filtro de estado
    if (filters.status && filters.status !== 'all') {
      const statusLabels: Record<string, string> = {
        pending: t('fuel:filters.pending'),
        approved: t('fuel:filters.approved'),
        verified: t('fuel:filters.verified')
      };
      parts.push(`${t("common:filters.status")}: ${statusLabels[filters.status] || filters.status}`);
    }
    
    if (parts.length === 0) {
      return t("common:filters.noFilters");
    }
    
    return parts.join(' • ');
  };

  // ✅ Generar subtitle dinámico con estadísticas y filtros
  const getSubtitle = () => {
    // ✅ Esperar a que calculatedPeriods esté cargado para Current/Previous
    const needsCalculatedPeriods = filters.periodFilter?.type === 'current' || filters.periodFilter?.type === 'previous';
    
    if (statsLoading || !stats || (needsCalculatedPeriods && !calculatedPeriods)) {
      return <div>{t("fuel:page.loading")}</div>;
    }

    const { totalExpenses, totalAmount, totalGallons, pending } = stats;
    
    // Primera línea: estadísticas
    const statsLine = `${totalExpenses || 0} ${t("fuel:stats.transactions")} • ${formatCurrency(totalAmount || 0)} ${t("fuel:stats.total")} • ${totalGallons?.toFixed(1) || '0.0'} gal • ${pending || 0} ${t("fuel:stats.pending")}`;
    
    // Segunda línea: filtros activos
    const filterDescription = getFilterDescription();
    
    return (
      <>
        <div>{statsLine}</div>
        <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
          <span className="font-medium">{t("filters.active_filters")}</span>
          <span>{filterDescription}</span>
        </div>
      </>
    );
  };

  const handleEdit = (expenseId: string) => {
    setEditExpenseId(expenseId);
  };

  const handleView = (expenseId: string) => {
    setViewExpenseId(expenseId);
  };

  return (
    <>
      {/* Header */}
      <PageToolbar
        title={t('fuel:page.title')}
        subtitle={getSubtitle()}
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
          <TabsList className="grid w-full grid-cols-4 h-auto gap-1">
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
            <TabsTrigger value="sync" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">FleetOne Sync</span>
              <span className="sm:hidden">Sync</span>
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

          <TabsContent value="sync" className="mt-6">
            {/* FleetOne Sync */}
            <FleetOneSync />
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