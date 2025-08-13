import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Fuel, CreditCard, FileText } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { FuelStatsCards } from '@/components/fuel/FuelStatsCards';
import { FuelFloatingActions } from '@/components/fuel/FuelFloatingActions';
import { FuelFilters, FuelFiltersType } from '@/components/fuel/FuelFilters';
import { FuelExpensesList } from '@/components/fuel/FuelExpensesList';
import { CreateFuelExpenseDialog } from '@/components/fuel/CreateFuelExpenseDialog';
import { EditFuelExpenseDialog } from '@/components/fuel/EditFuelExpenseDialog';
import { ViewFuelExpenseDialog } from '@/components/fuel/ViewFuelExpenseDialog';
import { DriverCardsManager } from '@/components/fuel/DriverCardsManager';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { PDFAnalyzer } from '@/components/fuel/PDFAnalyzer';

export default function FuelManagement() {
  const { t } = useTranslation();

  // Estado de filtros
  const [filters, setFilters] = useState<FuelFiltersType>({
    driverId: 'all',
    status: 'all',
    vehicleId: 'all',
    dateRange: { from: undefined, to: undefined }
  });

  // Estado de tabs
  const [activeTab, setActiveTab] = useState('expenses');

  // Estado de modales
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [viewExpenseId, setViewExpenseId] = useState<string | null>(null);

  // Convertir filtros para las consultas
  const queryFilters = {
    driverId: filters.driverId !== 'all' ? filters.driverId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : undefined,
    startDate: filters.dateRange.from ? formatDateInUserTimeZone(filters.dateRange.from) : undefined,
    endDate: filters.dateRange.to ? formatDateInUserTimeZone(filters.dateRange.to) : undefined,
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
        title="Gestión de Combustible"
        subtitle="Administra y monitorea los gastos de combustible de la flota"
        icon={Fuel}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Registrar Combustible</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <div className="p-2 md:p-4 md:pr-20 space-y-4 md:space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger value="expenses" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Gastos de Combustible</span>
              <span className="sm:hidden">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Tarjetas de Combustible</span>
              <span className="sm:hidden">Tarjetas</span>
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Analizador PDF</span>
              <span className="sm:hidden">PDF</span>
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
        <FuelFloatingActions 
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </>
  );
}