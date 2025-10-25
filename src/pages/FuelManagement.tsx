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
import { formatDateInUserTimeZone, formatCurrency, formatPaymentPeriodBadge, formatDetailedPaymentPeriod, formatMonthName } from '@/lib/dateFormatting';
import { PDFAnalyzer } from '@/components/fuel/PDFAnalyzer';
import { useCurrentPaymentPeriod, usePaymentPeriods } from '@/hooks/usePaymentPeriods';
import { useConsolidatedDrivers } from '@/hooks/useConsolidatedDrivers';
import { useGeotabVehicles } from '@/hooks/useGeotabVehicles';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';
import { useFuelStats } from '@/hooks/useFuelStats';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useCompanyFinancialData } from '@/hooks/useSecureCompanyData';
import { useAvailableWeeks } from '@/hooks/useAvailableWeeks';
import { getISOWeek } from 'date-fns';

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
  const { data: currentPeriod } = useCurrentPaymentPeriod(userCompany?.company_id);
  const { data: periods = [] } = usePaymentPeriods();
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);
  const { data: availableWeeks } = useAvailableWeeks(userCompany?.company_id);
  
  // Initialize with current week
  const getCurrentWeek = (): PeriodFilterValue => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeekNumber = getISOWeek(today);
    const currentMonth = today.getMonth() + 1;
    
    // Find current week in availableWeeks
    const weekData = availableWeeks
      ?.find(w => w.year === currentYear)
      ?.months.find(m => m.month === currentMonth)
      ?.weeks.find(w => w.weekNumber === currentWeekNumber);
    
    if (weekData) {
      return {
        type: 'week',
        selectedYear: currentYear,
        selectedWeek: currentWeekNumber,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
        label: `W${currentWeekNumber}/${currentYear}`
      };
    }
    
    // Fallback if no week data available
    return {
      type: 'week',
      selectedYear: currentYear,
      selectedWeek: currentWeekNumber
    };
  };

  // Estado de filtros con semana actual por defecto
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
    periodFilter: getCurrentWeek()
  });

  // Populate current week dates when available
  useEffect(() => {
    // Only initialize if current week doesn't have dates yet
    if (filters.periodFilter.type === 'week' && !filters.periodFilter.startDate && availableWeeks) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentWeekNumber = getISOWeek(today);
      const currentMonth = today.getMonth() + 1;
      
      // Find current week in availableWeeks
      const weekData = availableWeeks
        ?.find(w => w.year === currentYear)
        ?.months.find(m => m.month === currentMonth)
        ?.weeks.find(w => w.weekNumber === currentWeekNumber);
      
      if (weekData) {
        setFilters(prev => ({
          ...prev,
          periodFilter: {
            type: 'week',
            selectedYear: currentYear,
            selectedWeek: currentWeekNumber,
            startDate: weekData.startDate,
            endDate: weekData.endDate,
            label: `W${currentWeekNumber}/${currentYear}`
          }
        }));
      }
    }
  }, [availableWeeks, filters.periodFilter.type, filters.periodFilter.startDate]);
  
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

  // Get period description (similar to Load Management)
  const getPeriodDescription = () => {
    if (!filters.periodFilter) return '';
    
    const pf = filters.periodFilter;
    
    switch (pf.type) {
      case 'week':
        const weekLabel = pf.selectedWeek && pf.selectedYear 
          ? `W${pf.selectedWeek}/${pf.selectedYear}`
          : 'Week';
        return `Week: ${weekLabel}`;
      case 'month':
        const monthLabel = pf.selectedMonth && pf.selectedYear 
          ? `${formatMonthName(new Date(pf.selectedYear, pf.selectedMonth - 1))} ${pf.selectedYear}`
          : 'Month';
        return `Month: ${monthLabel}`;
      case 'quarter':
        return `Quarter: Q${pf.selectedQuarter || '?'} ${pf.selectedYear || '?'}`;
      case 'year':
        return `Year: ${pf.selectedYear || new Date().getFullYear()}`;
      case 'current':
        return t("common:periods.current");
      case 'previous':
        return t("common:periods.previous");
      case 'all':
        return t("common:periods.all");
      default:
        return '';
    }
  };

  const getPeriodDateRange = () => {
    if (!filters.periodFilter) return '';
    
    if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
      const formatted = formatPaymentPeriodBadge(
        filters.periodFilter.startDate, 
        filters.periodFilter.endDate
      );
      return formatted;
    }
    
    return '';
  };
  
  // ✅ Generar descripción de filtros activos
  const getFilterDescription = () => {
    const parts: string[] = [];
    
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

  // ✅ Generar subtitle dinámico (similar a Load Management)
  const getSubtitle = () => {
    if (statsLoading || !stats) {
      return <div className="text-sm text-muted-foreground">{t("fuel:page.loading")}</div>;
    }

    const { totalExpenses, totalAmount, totalGallons, pending } = stats;
    
    // Stats display (primera línea)
    const statsDisplay = (
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1">
          <span className="font-medium">{totalExpenses || 0}</span>
          <span className="text-muted-foreground">{t("fuel:stats.transactions")}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{formatCurrency(totalAmount || 0)}</span>
          <span className="text-muted-foreground">{t("fuel:stats.total")}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{totalGallons?.toFixed(1) || '0.0'} gal</span>
        </span>
        {pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-orange-600">{pending}</span>
            <span className="text-muted-foreground">{t("fuel:stats.pending")}</span>
          </span>
        )}
      </div>
    );
    
    // Check if there are active filters
    const hasActiveFilters = filters.driverId !== 'all' || 
                            filters.status !== 'all' ||
                            filters.vehicleId !== 'all';
    
    const periodDesc = getPeriodDescription();
    const dateRange = getPeriodDateRange();
    
    if (hasActiveFilters) {
      return (
        <div className="space-y-2">
          {statsDisplay}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('common:active_filters')}:</span>
            {periodDesc && (
              <Badge variant="secondary" className="text-xs font-normal">
                {periodDesc}{dateRange && `: ${dateRange}`}
              </Badge>
            )}
            {filters.driverId !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t("common:filters.driver")}: {(() => {
                  const driver = drivers.find(d => d.user_id === filters.driverId);
                  return driver ? `${driver.first_name} ${driver.last_name}` : t("fuel:filters.selected");
                })()}
              </Badge>
            )}
            {filters.vehicleId !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t("common:filters.vehicle")}: {(() => {
                  const vehicle = vehicles.find(v => v.id === filters.vehicleId);
                  return vehicle ? vehicle.plate_number : t("fuel:filters.selected");
                })()}
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs font-normal">
                {t("common:filters.status")}: {filters.status}
              </Badge>
            )}
          </div>
        </div>
      );
    }
    
    // No active filters - just show period info
    return (
      <div className="space-y-1">
        {statsDisplay}
        {(periodDesc || dateRange) && (
          <div className="text-xs text-muted-foreground">
            {periodDesc} {dateRange && `• ${dateRange}`}
          </div>
        )}
      </div>
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
          <TabsList className="grid w-full grid-cols-4 h-auto gap-1 bg-white/90 dark:bg-gray-900/90 border border-border shadow-sm">
            <TabsTrigger 
              value="expenses" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('fuel:page.tabs.expenses_full')}</span>
              <span className="sm:hidden">{t('fuel:page.tabs.expenses')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cards" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('fuel:page.tabs.fuel_cards_full')}</span>
              <span className="sm:hidden">{t('fuel:page.tabs.cards')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sync" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">FleetOne Sync</span>
              <span className="sm:hidden">Sync</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analyzer" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
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