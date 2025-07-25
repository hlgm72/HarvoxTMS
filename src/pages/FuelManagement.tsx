import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, Fuel, BarChart3, Settings, Filter } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { FuelStatsCards } from '@/components/fuel/FuelStatsCards';
import { FuelFloatingActions } from '@/components/fuel/FuelFloatingActions';
import { FuelFilters, FuelFiltersType } from '@/components/fuel/FuelFilters';
import { FuelExpensesList } from '@/components/fuel/FuelExpensesList';
import { CreateFuelExpenseDialog } from '@/components/fuel/CreateFuelExpenseDialog';
import { EditFuelExpenseDialog } from '@/components/fuel/EditFuelExpenseDialog';
import { ViewFuelExpenseDialog } from '@/components/fuel/ViewFuelExpenseDialog';

export default function FuelManagement() {
  const { t } = useTranslation();

  // Estado de filtros
  const [filters, setFilters] = useState<FuelFiltersType>({
    driverId: 'all',
    status: 'all',
    vehicleId: 'all',
    dateRange: { from: undefined, to: undefined }
  });

  // Estado de modales
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [viewExpenseId, setViewExpenseId] = useState<string | null>(null);

  // Convertir filtros para las consultas
  const queryFilters = {
    driverId: filters.driverId !== 'all' ? filters.driverId : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : undefined,
    startDate: filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : undefined,
    endDate: filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : undefined,
  };

  const handleEdit = (expenseId: string) => {
    setEditExpenseId(expenseId);
  };

  const handleView = (expenseId: string) => {
    setViewExpenseId(expenseId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageToolbar
        title="Gestión de Combustible"
        subtitle="Administra y monitorea los gastos de combustible de la flota"
        icon={Fuel}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reportes
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Gasto
            </Button>
          </div>
        }
      />

      {/* Estadísticas */}
      <div className="pr-16 md:pr-20">
        <FuelStatsCards filters={queryFilters} />
      </div>

      {/* Lista de Gastos */}
      <div className="pr-16 md:pr-20">
        <FuelExpensesList 
          filters={queryFilters}
          onEdit={handleEdit}
          onView={handleView}
        />
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

      {/* Floating Actions */}
      <FuelFloatingActions 
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}