import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingActionsSheet, FloatingActionTab } from "@/components/ui/FloatingActionsSheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useDriversList } from "@/hooks/useDriversList";
import { PeriodFilter } from "@/components/loads/PeriodFilter";
import { ClientCombobox } from "@/components/ui/ClientCombobox";
import { 
  Filter, 
  FilterX, 
  Download, 
  Settings, 
  BarChart3,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { formatCurrency } from '@/lib/dateFormatting';


interface LoadsFloatingActionsProps {
  filters: {
    status: string;
    driver: string;
    broker: string;
    brokerName?: string; // Añadir brokerName al tipo
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  periodFilter?: { 
    type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'month' | 'quarter' | 'week' | 'year';
    periodId?: string; 
    startDate?: string;
    endDate?: string;
    label?: string;
    selectedYear?: number;
    selectedQuarter?: number;
    selectedMonth?: number;
    selectedWeek?: number;
  };
  onFiltersChange: (filters: any) => void;
  onPeriodFilterChange?: (filter: any) => void;
}

// Estado local para mantener el nombre del cliente seleccionado
let selectedClientName = "";

export function LoadsFloatingActions({ filters, periodFilter, onFiltersChange, onPeriodFilterChange }: LoadsFloatingActionsProps) {
  const { t } = useTranslation(['loads', 'common']);
  
  const statusOptions = [
    { value: "all", label: t('floating_actions.filters.options.status.all') },
    { value: "created", label: t('common:status.created') },
    { value: "route_planned", label: t('common:status.route_planned') },
    { value: "assigned", label: t('common:status.assigned') },
    { value: "in_transit", label: t('common:status.in_transit') },
    { value: "delivered", label: t('common:status.delivered') },
    { value: "completed", label: t('common:status.completed') }
  ];


  const sortOptions = [
    { value: "date_desc", label: t('floating_actions.view.options.sort.date_desc') },
    { value: "date_asc", label: t('floating_actions.view.options.sort.date_asc') },
    { value: "amount_desc", label: t('floating_actions.view.options.sort.amount_desc') },
    { value: "amount_asc", label: t('floating_actions.view.options.sort.amount_asc') },
    { value: "status", label: t('floating_actions.view.options.sort.status') }
  ];
  
  // Obtener lista de conductores reales
  const { data: driversData = [], isLoading: driversLoading } = useDriversList();
  
  // View configuration state
  const [viewConfig, setViewConfig] = useState({
    density: 'normal',
    sortBy: 'date_desc',
    showBrokerInfo: true,
    showDriverInfo: true,
    showDates: true,
    showAmounts: true
  });

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      driver: "all",
      broker: "all",
      dateRange: { from: undefined, to: undefined }
    });
    // Reset period filter to week
    onPeriodFilterChange?.({ type: 'week' });
  };

  const hasActiveFilters = filters.status !== "all" || 
                          filters.driver !== "all" || 
                          filters.broker !== "all" ||
                          periodFilter?.type !== 'week';

  const mockStats = {
    totalLoads: 156,
    totalValue: 425000,
    averageValue: 2724,
    inTransit: 23,
    completed: 89,
    pending: 44
  };

  // Define tabs for FloatingActionsSheet
  const tabs: FloatingActionTab[] = [
    {
      id: 'filters',
      label: t('floating_actions.filters.title'),
      icon: Filter,
      content: (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('floating_actions.filters.applied_filters')}</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <FilterX className="h-3 w-3 mr-1" />
                      {t('floating_actions.filters.clear')}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Period Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.period')}</label>
                    <PeriodFilter
                      value={periodFilter || { type: 'current' }}
                      onChange={(newFilter) => onPeriodFilterChange?.(newFilter)}
                    />
                  </div>

                  {/* Driver Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.driver')}</label>
                    <Select 
                      value={filters.driver} 
                      onValueChange={(value) => handleFilterChange("driver", value)}
                      disabled={driversLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={driversLoading ? t('floating_actions.filters.placeholders.loading') : t('floating_actions.filters.placeholders.driver')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('floating_actions.filters.options.driver.all')}</SelectItem>
                        {driversData.map((driver) => (
                          <SelectItem key={driver.value} value={driver.value}>
                            {driver.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client/Broker Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client/Broker</label>
                    <ClientCombobox
                      value={filters.broker}
                      displayLabel={filters.brokerName}
                      onValueChange={(value, name) => {
                        onFiltersChange({
                          ...filters,
                          broker: value,
                          brokerName: name
                        });
                      }}
                      placeholder="Type to search by name, DOT, or MC..."
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.status')}</label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('floating_actions.filters.placeholders.status')} />
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
                </div>
              </div>
      )
    },
    {
      id: 'export',
      label: t('floating_actions.export.title'),
      icon: Download,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.export.title')}</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      {t('floating_actions.export.pdf')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {t('floating_actions.export.excel')}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.export.options_title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.export.include_filters')}</label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.export.visible_only')}</label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.export.include_stats')}</label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
      )
    },
    {
      id: 'view',
      label: t('floating_actions.view.title'),
      icon: Settings,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.title')}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">{t('floating_actions.view.sort_by')}</label>
                    <Select 
                      value={viewConfig.sortBy} 
                      onValueChange={(value) => setViewConfig({...viewConfig, sortBy: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">{t('floating_actions.view.density')}</label>
                    <Select 
                      value={viewConfig.density} 
                      onValueChange={(value) => setViewConfig({...viewConfig, density: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">{t('floating_actions.view.density_options.compact')}</SelectItem>
                        <SelectItem value="normal">{t('floating_actions.view.density_options.normal')}</SelectItem>
                        <SelectItem value="comfortable">{t('floating_actions.view.density_options.comfortable')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.visible_columns')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.columns.broker_info')}</label>
                      <Switch 
                        checked={viewConfig.showBrokerInfo}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showBrokerInfo: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.columns.driver_info')}</label>
                      <Switch 
                        checked={viewConfig.showDriverInfo}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showDriverInfo: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.columns.dates')}</label>
                      <Switch 
                        checked={viewConfig.showDates}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showDates: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.columns.amounts')}</label>
                      <Switch 
                        checked={viewConfig.showAmounts}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showAmounts: checked})}
                      />
                    </div>
                  </div>
                </div>
              </div>
      )
    },
    {
      id: 'stats',
      label: t('floating_actions.stats.title'),
      icon: BarChart3,
      content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.stats.title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-primary">{mockStats.totalLoads}</div>
                      <div className="text-xs text-muted-foreground">{t('floating_actions.stats.total_loads')}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(mockStats.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">{t('floating_actions.stats.total_value')}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{mockStats.inTransit}</div>
                      <div className="text-xs text-muted-foreground">{t('floating_actions.stats.in_transit')}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{mockStats.pending}</div>
                      <div className="text-xs text-muted-foreground">{t('floating_actions.stats.pending')}</div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.stats.load_status')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('floating_actions.stats.completed')}</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {mockStats.completed}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('floating_actions.stats.in_transit')}</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {mockStats.inTransit}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('floating_actions.stats.pending')}</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                        {mockStats.pending}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.stats.average_per_load')}</h3>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xl font-bold text-primary">{formatCurrency(mockStats.averageValue)}</div>
                    <div className="text-xs text-muted-foreground">{t('floating_actions.stats.average_value')}</div>
                  </div>
                </div>
              </div>
      )
    }
  ];

  return (
    <FloatingActionsSheet 
      tabs={tabs}
      buttonLabel="Actions"
      defaultTab="filters"
    />
  );
}
