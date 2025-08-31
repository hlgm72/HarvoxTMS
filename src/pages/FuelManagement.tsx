import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Fuel, CreditCard, FileText } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { FuelStatsCards } from '@/components/fuel/FuelStatsCards';
import { UniversalFloatingActions } from '@/components/ui/UniversalFloatingActions';
import { FuelFilters, FuelFiltersType } from '@/components/fuel/FuelFilters';
import { FuelExpensesList } from '@/components/fuel/FuelExpensesList';
import { CreateFuelExpenseDialog } from '@/components/fuel/CreateFuelExpenseDialog';
import { EditFuelExpenseDialog } from '@/components/fuel/EditFuelExpenseDialog';
import { ViewFuelExpenseDialog } from '@/components/fuel/ViewFuelExpenseDialog';
import { DriverCardsManager } from '@/components/fuel/DriverCardsManager';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { PDFAnalyzer } from '@/components/fuel/PDFAnalyzer';
import { useCurrentPaymentPeriod } from '@/hooks/usePaymentPeriods';

export default function FuelManagement() {
  const { t } = useTranslation(['fuel', 'common']);
  
  // Obtener el período actual para configurar filtros por defecto
  const { data: currentPeriod } = useCurrentPaymentPeriod();

  // Estado de filtros con período actual por defecto
  const [filters, setFilters] = useState({
    search: '',
    driverId: 'all',
    status: 'all',
    vehicleId: 'all',
    periodFilter: { type: 'current' as const, periodId: undefined as string | undefined }
  });

  // Actualizar periodId cuando se carga el período actual
  useEffect(() => {
    if (currentPeriod && filters.periodFilter.type === 'current' && !filters.periodFilter.periodId) {
      setFilters(prev => ({
        ...prev,
        periodFilter: {
          ...prev.periodFilter,
          periodId: currentPeriod.id
        }
      }));
    }
  }, [currentPeriod, filters.periodFilter.type, filters.periodFilter.periodId]);

  console.log('🔍 Filtros activos en Fuel Management:', filters);
  
  // Estado de tabs
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
    driverId: filters.driverId !== 'all' ? filters.driverId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : undefined,
    // Usar período seleccionado o actual por defecto
    periodId: filters.periodFilter?.periodId || currentPeriod?.id
  };

  console.log('🔍 Query filters aplicados:', queryFilters);

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
      <CreateFuelExpenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      <EditFuelExpenseDialog
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
        <UniversalFloatingActions
          contextKey="fuel"
          filters={filters}
          onFiltersChange={(newFilters: any) => {
            setFilters(newFilters);
          }}
          additionalData={{
            // drivers y vehicles se obtendrán de los hooks correspondientes
            stats: {
              totalTransactions: 0, // TODO: obtener de hook de stats
              totalAmount: 0,       // TODO: obtener de hook de stats
              driversCount: 0       // TODO: obtener de hook de stats
            }
          }}
          onSyncHandler={handleFleetOneSync}
          onExportHandler={handleExport}
          syncLoading={syncLoading}
          exportLoading={exportLoading}
        />
      )}
    </>
  );
}