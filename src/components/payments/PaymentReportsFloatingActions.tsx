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
  Clock
} from "lucide-react";
import { formatCurrency } from '@/lib/dateFormatting';
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";

export interface PaymentFiltersType {
  driverId: string;
  status: string;
  periodFilter: PeriodFilterValue;
}

interface PaymentReportsFloatingActionsProps {
  filters: PaymentFiltersType;
  onFiltersChange: (filters: PaymentFiltersType) => void;
  drivers: Array<{ user_id: string; first_name: string; last_name: string }>;
  stats?: {
    totalReports: number;
    totalEarnings: number;
    totalDrivers: number;
    pendingReports: number;
  };
}

export function PaymentReportsFloatingActions({ 
  filters, 
  onFiltersChange, 
  drivers,
  stats
}: PaymentReportsFloatingActionsProps) {
  const { t } = useTranslation(['payments', 'common']);

  const statusOptions = [
    { value: "all", label: t('filters.status_options.all') },
    { value: "pending", label: t('filters.status_options.pending') },
    { value: "calculated", label: t('filters.status_options.calculated') },
    { value: "approved", label: t('filters.status_options.approved') },
    { value: "paid", label: t('filters.status_options.paid') },
    { value: "failed", label: t('filters.status_options.failed') },
    { value: "negative", label: t('filters.status_options.negative') }
  ];

  const handleFilterChange = (key: keyof PaymentFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      driverId: 'all',
      status: 'all',
      periodFilter: { type: 'current' }
    });
  };

  const hasActiveFilters = filters.driverId !== 'all' || 
                          filters.status !== 'all' ||
                          filters.periodFilter.type !== 'current';

  const activeFiltersCount = [
    filters.driverId !== 'all',
    filters.status !== 'all',
    filters.periodFilter.type !== 'current'
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
                          <SelectItem key={driver.user_id} value={driver.user_id}>
                            {`${driver.first_name} ${driver.last_name}`}
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
                              const driver = drivers.find(d => d.user_id === filters.driverId);
                              return driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId;
                            })()}
                          </Badge>
                        )}
                        {filters.status !== 'all' && (
                          <Badge variant="secondary">
                            {t('filters.active_badges.status')} {statusOptions.find(s => s.value === filters.status)?.label}
                          </Badge>
                        )}
                        {(filters.periodFilter.type !== 'current' || filters.periodFilter.label) && (
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
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{t('reports.stats.total_reports')}</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalReports}</div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">{t('reports.stats.drivers')}</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalDrivers}</div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{t('reports.stats.total_net_payment')}</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">{t('reports.stats.pending')}</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.pendingReports}</div>
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