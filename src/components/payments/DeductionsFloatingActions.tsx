import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FloatingActionsSheet } from "@/components/ui/FloatingActionsSheet";
import { 
  Filter, 
  FilterX, 
  Download, 
  BarChart3,
  FileText,
  DollarSign,
  Users,
  Receipt
} from "lucide-react";
import { formatCurrency } from '@/lib/dateFormatting';
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";

export interface DeductionsFiltersType {
  driverId: string;
  status: string;
  expenseTypeId: string;
  periodFilter: PeriodFilterValue;
}

interface DeductionsFloatingActionsProps {
  filters: DeductionsFiltersType;
  onFiltersChange: (filters: DeductionsFiltersType) => void;
  drivers: Array<{ id: string; first_name: string; last_name: string }>;
  expenseTypes: Array<{ id: string; name: string }>;
  stats?: {
    totalDeductions: number;
    totalAmount: number;
    pendingCount: number;
  };
}

export function DeductionsFloatingActions({ 
  filters, 
  onFiltersChange, 
  drivers,
  expenseTypes,
  stats
}: DeductionsFloatingActionsProps) {
  const { t } = useTranslation(['payments', 'common']);

  const statusOptions = [
    { value: "all", label: t('deductions.status_options.all', 'Todos') },
    { value: "planned", label: t('deductions.status_labels.planned', 'Planificado') },
    { value: "applied", label: t('deductions.status_labels.applied', 'Aplicado') },
    { value: "deferred", label: t('deductions.status_labels.deferred', 'Diferido') }
  ];

  const handleFilterChange = (key: keyof DeductionsFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      driverId: 'all',
      status: 'all',
      expenseTypeId: 'all',
      periodFilter: { type: 'week' } // Will be populated by parent component
    });
  };

  const hasActiveFilters = filters.driverId !== 'all' || 
                          filters.status !== 'all' ||
                          filters.expenseTypeId !== 'all' ||
                          filters.periodFilter.type !== 'week';

  const activeFiltersCount = [
    filters.driverId !== 'all',
    filters.status !== 'all',
    filters.expenseTypeId !== 'all',
    filters.periodFilter.type !== 'week'
  ].filter(Boolean).length;

  // Define tabs
  const tabs = [
    {
      id: 'filters',
      label: t('floating_actions.filters', 'Filtros'),
      icon: Filter,
      badge: activeFiltersCount > 0 ? activeFiltersCount : undefined,
      content: (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('floating_actions.applied_filters', 'Filtros Aplicados')}</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <FilterX className="h-3 w-3 mr-1" />
                      {t('filters.clear')}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Period Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('filters.period_label')}</label>
                    <PeriodFilter
                      value={filters.periodFilter}
                      onChange={(periodFilter) => handleFilterChange('periodFilter', periodFilter)}
                    />
                  </div>

                  {/* Driver Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('filters.driver_label')}</label>
                    <Select 
                      value={filters.driverId} 
                      onValueChange={(value) => handleFilterChange('driverId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('filters.select_driver')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('filters.all_drivers')}</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {`${driver.first_name} ${driver.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expense Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('deductions.filters.expenseType', 'Tipo de Gasto')}</label>
                    <Select 
                      value={filters.expenseTypeId} 
                      onValueChange={(value) => handleFilterChange('expenseTypeId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('deductions.filters.select_expense_type', 'Seleccionar tipo')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('deductions.filters.all_types', 'Todos los tipos')}</SelectItem>
                        {expenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('filters.status_label')}</label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('filters.select_status')} />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active Filters Display */}
                  {hasActiveFilters && (
                    <div className="space-y-2">
                      <Separator />
                      <h4 className="text-sm font-medium">{t('filters.active_filters')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {filters.driverId !== 'all' && (
                          <Badge variant="secondary">
                            {t('filters.active_badges.driver')} {(() => {
                              const driver = drivers.find(d => d.id === filters.driverId);
                              return driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId;
                            })()}
                          </Badge>
                        )}
                        {filters.expenseTypeId !== 'all' && (
                          <Badge variant="secondary">
                            {t('deductions.filters.expenseType')} {(() => {
                              const type = expenseTypes.find(t => t.id === filters.expenseTypeId);
                              return type ? type.name : filters.expenseTypeId;
                            })()}
                          </Badge>
                        )}
                        {filters.status !== 'all' && (
                          <Badge variant="secondary">
                            {t('filters.active_badges.status')} {statusOptions.find(s => s.value === filters.status)?.label}
                          </Badge>
                        )}
                        {(filters.periodFilter.type !== 'week' || filters.periodFilter.label) && (
                          <Badge variant="secondary">
                            {t('filters.active_badges.period')} {filters.periodFilter.label || filters.periodFilter.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
      )
    },
    {
      id: 'export',
      label: t('floating_actions.export', 'Exportar'),
      icon: Download,
      content: (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('floating_actions.export_pdf', 'Exportar como PDF')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('floating_actions.export_excel', 'Exportar como Excel')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('floating_actions.export_csv', 'Exportar como CSV')}
                  </Button>
                </div>
              </div>
      )
    },
    {
      id: 'stats',
      label: t('floating_actions.stats', 'Estadísticas'),
      icon: BarChart3,
      content: stats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg space-y-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{t('deductions.stats.total_deductions', 'Total Deducciones')}</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalDeductions}</div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{t('deductions.stats.total_amount', 'Monto Total')}</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">{t('deductions.stats.affected_drivers', 'Conductores Afectados')}</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.pendingCount}</div>
                  </div>
                </div>
              </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {t('floating_actions.no_stats', 'No hay estadísticas disponibles')}
        </div>
      )
    }
  ];

  return (
    <FloatingActionsSheet
      tabs={tabs}
      buttonLabel={t('floating_actions.main_label', 'ACCIONES')}
      defaultTab="filters"
    />
  );
}
