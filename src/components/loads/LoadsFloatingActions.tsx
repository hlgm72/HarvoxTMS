import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExpandableFloatingActions } from "@/components/ui/ExpandableFloatingActions";
import { useDriversList } from "@/hooks/useDriversList";
import { 
  Filter, 
  FilterX, 
  CalendarIcon, 
  Download, 
  Settings, 
  BarChart3,
  FileText,
  FileSpreadsheet,
  Plus,
  Clock,
  CalendarDays
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns";
import { formatShortDate, formatMediumDate, formatCurrency, formatDateInUserTimeZone, formatMonthName } from '@/lib/dateFormatting';
import { cn } from "@/lib/utils";


interface LoadsFloatingActionsProps {
  filters: {
    status: string;
    driver: string;
    broker: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  periodFilter?: { 
    type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
    periodId?: string; 
    startDate?: string;
    endDate?: string;
    label?: string;
  };
  onFiltersChange: (filters: any) => void;
  onPeriodFilterChange?: (filter: any) => void;
}

export function LoadsFloatingActions({ filters, periodFilter, onFiltersChange, onPeriodFilterChange }: LoadsFloatingActionsProps) {
  const { t } = useTranslation('loads');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'export' | 'view' | 'stats'>('filters');
  
  const statusOptions = [
    { value: "all", label: t('floating_actions.filters.options.status.all') },
    { value: "created", label: t('status.created') },
    { value: "route_planned", label: t('status.route_planned') },
    { value: "assigned", label: t('status.assigned') },
    { value: "in_transit", label: t('status.in_transit') },
    { value: "delivered", label: t('status.delivered') },
    { value: "completed", label: t('status.completed') }
  ];

  const brokerOptions = [
    { value: "all", label: t('floating_actions.filters.options.broker.all') },
    { value: "broker1", label: "ABC Logistics" },
    { value: "broker2", label: "XYZ Freight" },
    { value: "broker3", label: "Global Transport" }
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
  };

  const hasActiveFilters = filters.status !== "all" || 
                          filters.driver !== "all" || 
                          filters.broker !== "all" || 
                          filters.dateRange.from || 
                          filters.dateRange.to;

  const mockStats = {
    totalLoads: 156,
    totalValue: 425000,
    averageValue: 2724,
    inTransit: 23,
    completed: 89,
    pending: 44
  };

  const openSheet = (tab: 'filters' | 'export' | 'view' | 'stats') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const getPeriodLabel = (type?: string) => {
    switch (type) {
      case 'current': return t('periods.current');
      case 'previous': return t('periods.previous');
      case 'next': return t('periods.next');
      case 'all': return t('periods.all');
      case 'this_month': return t('periods.this_month');
      case 'last_month': return t('periods.last_month');
      case 'this_quarter': return t('periods.this_quarter');
      case 'last_quarter': return t('periods.last_quarter');
      case 'this_year': return t('periods.this_year');
      case 'last_year': return t('periods.last_year');
      case 'specific': return t('periods.specific');
      case 'custom': return t('periods.custom');
      default: return t('periods.current');
    }
  };

  // Definir las acciones para el componente expandible
  const floatingActions = [
    {
      icon: Filter,
      label: hasActiveFilters ? t('floating_actions.filters.filters_active') : t('floating_actions.filters.filters'),
      onClick: () => openSheet('filters'),
      variant: (hasActiveFilters ? 'default' : 'secondary') as 'default' | 'secondary' | 'outline' | 'destructive',
      className: hasActiveFilters ? 'bg-blue-600 hover:bg-blue-700' : ''
    },
    {
      icon: Download,
      label: t('floating_actions.export.export'),
      onClick: () => openSheet('export'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Settings,
      label: t('floating_actions.view.view'),
      onClick: () => openSheet('view'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: BarChart3,
      label: t('floating_actions.stats.statistics'),
      onClick: () => openSheet('stats'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    }
  ];

  return (
    <>
      {/* Botones Flotantes Expandibles */}
      <ExpandableFloatingActions
        actions={floatingActions}
        mainLabel={t('floating_actions.title')}
        position="bottom-right"
      />

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && t('floating_actions.filters.title')}
              {activeTab === 'export' && t('floating_actions.export.title')}
              {activeTab === 'view' && t('floating_actions.view.title')}
              {activeTab === 'stats' && t('floating_actions.stats.title')}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && t('floating_actions.filters.description')}
              {activeTab === 'export' && t('floating_actions.export.description')}
              {activeTab === 'view' && t('floating_actions.view.description')}
              {activeTab === 'stats' && t('floating_actions.stats.description')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Filters Content */}
            {activeTab === 'filters' && (
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

                  {/* Broker Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.broker')}</label>
                    <Select 
                      value={filters.broker} 
                      onValueChange={(value) => handleFilterChange("broker", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('floating_actions.filters.placeholders.broker')} />
                      </SelectTrigger>
                      <SelectContent>
                        {brokerOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Period Filter - Complete Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.period')}</label>
                    <Select 
                      value={periodFilter?.type || 'current'} 
                      onValueChange={(value) => {
                        // Create a proper PeriodFilterValue using the same logic as PeriodFilter
                        const newFilter: any = { type: value };
                        
                        // Use the same date calculation logic as PeriodFilter
                        const getDateRangeForType = (type: string) => {
                          const now = new Date();
                          
                          switch (type) {
                            case 'this_month':
                              return {
                                startDate: formatDateInUserTimeZone(startOfMonth(now)),
                                endDate: formatDateInUserTimeZone(endOfMonth(now)),
                                label: `${t('periods.this_month')} (${formatMonthName(now)} ${now.getFullYear()})`
                              };
                            case 'last_month':
                              const lastMonth = subMonths(now, 1);
                              return {
                                startDate: formatDateInUserTimeZone(startOfMonth(lastMonth)),
                                endDate: formatDateInUserTimeZone(endOfMonth(lastMonth)),
                                label: `${t('periods.last_month')} (${formatMonthName(lastMonth)} ${lastMonth.getFullYear()})`
                              };
                            case 'this_quarter':
                              return {
                                startDate: formatDateInUserTimeZone(startOfQuarter(now)),
                                endDate: formatDateInUserTimeZone(endOfQuarter(now)),
                                label: `${t('periods.this_quarter')} (Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()})`
                              };
                            case 'last_quarter':
                              const lastQuarter = subQuarters(now, 1);
                              return {
                                startDate: formatDateInUserTimeZone(startOfQuarter(lastQuarter)),
                                endDate: formatDateInUserTimeZone(endOfQuarter(lastQuarter)),
                                label: `${t('periods.last_quarter')} (Q${Math.ceil((lastQuarter.getMonth() + 1) / 3)} ${lastQuarter.getFullYear()})`
                              };
                            case 'this_year':
                              return {
                                startDate: formatDateInUserTimeZone(startOfYear(now)),
                                endDate: formatDateInUserTimeZone(endOfYear(now)),
                                label: `${t('periods.this_year')} (${now.getFullYear()})`
                              };
                            case 'last_year':
                              const lastYear = subYears(now, 1);
                              return {
                                startDate: formatDateInUserTimeZone(startOfYear(lastYear)),
                                endDate: formatDateInUserTimeZone(endOfYear(lastYear)),
                                label: `${t('periods.last_year')} (${lastYear.getFullYear()})`
                              };
                            default:
                              return null;
                          }
                        };
                        
                        // Calculate dates for date-based periods
                        const dateRange = getDateRangeForType(value);
                        if (dateRange) {
                          newFilter.startDate = dateRange.startDate;
                          newFilter.endDate = dateRange.endDate;
                          newFilter.label = dateRange.label;
                        }
                        
                        // Close the sheet after selection and trigger change
                        onPeriodFilterChange?.(newFilter);
                        setIsOpen(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('floating_actions.filters.placeholders.period')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">{t('periods.current')}</SelectItem>
                        <SelectItem value="previous">{t('periods.previous')}</SelectItem>
                        <SelectItem value="next">{t('periods.next')}</SelectItem>
                        <SelectItem value="all">{t('periods.all')}</SelectItem>
                        <SelectItem value="this_month">{t('periods.this_month')}</SelectItem>
                        <SelectItem value="last_month">{t('periods.last_month')}</SelectItem>
                        <SelectItem value="this_quarter">{t('periods.this_quarter')}</SelectItem>
                        <SelectItem value="last_quarter">{t('periods.last_quarter')}</SelectItem>
                        <SelectItem value="this_year">{t('periods.this_year')}</SelectItem>
                        <SelectItem value="last_year">{t('periods.last_year')}</SelectItem>
                        <SelectItem value="specific">{t('periods.specific')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {periodFilter?.type && periodFilter.type !== 'current' && (
                      <div className="text-xs text-muted-foreground">
                        {getPeriodLabel(periodFilter.type)}
                        {periodFilter.label && ` - ${periodFilter.label}`}
                      </div>
                    )}
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.date_range')}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.from ? (
                            filters.dateRange.to ? (
                              <>
                                {formatShortDate(filters.dateRange.from)} -{" "}
                                {formatShortDate(filters.dateRange.to)}
                              </>
                            ) : (
                              formatMediumDate(filters.dateRange.from)
                            )
                          ) : (
                            t('floating_actions.filters.placeholders.date_range')
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={filters.dateRange.from}
                          selected={filters.dateRange}
                          onSelect={(range) => handleFilterChange("dateRange", range || { from: undefined, to: undefined })}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* Export Content */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Exportar Datos</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar a PDF
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar a Excel
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Opciones de Exportación</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Incluir filtros aplicados</label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Solo cargas visibles</label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Incluir estadísticas</label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Content */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Configuración de Vista</h3>
                  
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Ordenar por</label>
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
                    <label className="text-sm font-medium">Densidad</label>
                    <Select 
                      value={viewConfig.density} 
                      onValueChange={(value) => setViewConfig({...viewConfig, density: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compacta</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="comfortable">Confortable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Columnas Visibles</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Información del Broker</label>
                      <Switch 
                        checked={viewConfig.showBrokerInfo}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showBrokerInfo: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Información del Conductor</label>
                      <Switch 
                        checked={viewConfig.showDriverInfo}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showDriverInfo: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Fechas</label>
                      <Switch 
                        checked={viewConfig.showDates}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showDates: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Montos</label>
                      <Switch 
                        checked={viewConfig.showAmounts}
                        onCheckedChange={(checked) => setViewConfig({...viewConfig, showAmounts: checked})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Content */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Estadísticas Rápidas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-primary">{mockStats.totalLoads}</div>
                      <div className="text-xs text-muted-foreground">Total Cargas</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">${formatCurrency(mockStats.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">Valor Total</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{mockStats.inTransit}</div>
                      <div className="text-xs text-muted-foreground">En Tránsito</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{mockStats.pending}</div>
                      <div className="text-xs text-muted-foreground">Pendientes</div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Estados de Carga</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completadas</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {mockStats.completed}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">En Tránsito</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {mockStats.inTransit}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pendientes</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                        {mockStats.pending}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Promedio por Carga</h3>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xl font-bold text-primary">${formatCurrency(mockStats.averageValue)}</div>
                    <div className="text-xs text-muted-foreground">Valor promedio por carga</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
