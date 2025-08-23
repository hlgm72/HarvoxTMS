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
import { 
  Filter, 
  FilterX, 
  CalendarIcon, 
  Download, 
  Settings, 
  BarChart3,
  FileText,
  FileSpreadsheet,
  History,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { formatMediumDate, formatCurrency } from '@/lib/dateFormatting';
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "floating_actions.status_options.all" },
  { value: "planned", label: "floating_actions.status_options.planned" },
  { value: "applied", label: "floating_actions.status_options.applied" },
  { value: "deferred", label: "floating_actions.status_options.deferred" }
];


interface DeductionsFloatingActionsProps {
  filters: {
    status: string;
    driver: string;
    expenseType: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  onFiltersChange: (filters: any) => void;
  onViewConfigChange?: (config: any) => void;
  drivers?: Array<{ user_id: string; first_name: string; last_name: string }>;
  expenseTypes?: Array<{ id: string; name: string }>;
}

export function DeductionsFloatingActions({ 
  filters, 
  onFiltersChange,
  onViewConfigChange,
  drivers = [], 
  expenseTypes = [] 
}: DeductionsFloatingActionsProps) {
  const { t } = useTranslation(['common', 'payments']);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'export' | 'view' | 'history'>('filters');
  
  // View configuration state
  const [viewConfig, setViewConfig] = useState({
    density: 'normal',
    sortBy: 'date_desc',
    groupBy: 'none',
    showDriverInfo: true,
    showAmounts: true,
    showDates: true,
    showExpenseType: true
  });

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleViewConfigChange = (key: string, value: any) => {
    const newConfig = { ...viewConfig, [key]: value };
    setViewConfig(newConfig);
    onViewConfigChange?.(newConfig);
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "planned",
      driver: "all",
      expenseType: "all",
      dateRange: { from: undefined, to: undefined }
    });
  };

  const hasActiveFilters = filters.status !== "planned" || 
                          filters.driver !== "all" || 
                          filters.expenseType !== "all" || 
                          filters.dateRange.from || 
                          filters.dateRange.to;

  const mockStats = {
    totalDeductions: 45,
    totalAmount: 12500,
    averageAmount: 278,
    planned: 23,
    applied: 18,
    deferred: 4
  };

  const openSheet = (tab: 'filters' | 'export' | 'view' | 'history') => {
    setActiveTab(tab);
    setIsOpen(true);
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
      icon: History,
      label: t('floating_actions.history.history'),
      onClick: () => openSheet('history'),
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
              {activeTab === 'history' && t('floating_actions.history.title')}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && t('floating_actions.filters.description')}
              {activeTab === 'export' && t('floating_actions.export.description')}
              {activeTab === 'view' && t('floating_actions.view.description')}
              {activeTab === 'history' && t('floating_actions.history.description')}
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
                            {t(option.label)}
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('floating_actions.filters.placeholders.driver')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('floating_actions.filters.options.driver.all')}</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.user_id} value={driver.user_id}>
                            {driver.first_name} {driver.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expense Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.expense_type')}</label>
                    <Select 
                      value={filters.expenseType} 
                      onValueChange={(value) => handleFilterChange("expenseType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('floating_actions.filters.placeholders.expense_type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('floating_actions.filters.all_types')}</SelectItem>
                        {expenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>


                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('floating_actions.filters.expense_date')}</label>
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
                                {formatMediumDate(filters.dateRange.from)} -{" "}
                                {formatMediumDate(filters.dateRange.to)}
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
                        <div className="p-3">
                          {/* Month and Year selectors */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <Select
                              value={filters.dateRange.from ? 
                                ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                [filters.dateRange.from.getMonth()] : 
                                ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                [new Date().getMonth()]}
                              onValueChange={(monthName) => {
                                const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                                  .indexOf(monthName.toLowerCase());
                                if (monthIndex !== -1) {
                                  const currentYear = filters.dateRange.from?.getFullYear() || new Date().getFullYear();
                                  const newDate = new Date(currentYear, monthIndex, 1);
                                  handleFilterChange("dateRange", { from: newDate, to: filters.dateRange.to });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="enero">{t('months.january', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="febrero">{t('months.february', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="marzo">{t('months.march', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="abril">{t('months.april', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="mayo">{t('months.may', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="junio">{t('months.june', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="julio">{t('months.july', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="agosto">{t('months.august', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="septiembre">{t('months.september', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="octubre">{t('months.october', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="noviembre">{t('months.november', { ns: 'payments' })}</SelectItem>
                                <SelectItem value="diciembre">{t('months.december', { ns: 'payments' })}</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={filters.dateRange.from?.getFullYear()?.toString() || new Date().getFullYear().toString()}
                              onValueChange={(year) => {
                                const currentMonth = filters.dateRange.from?.getMonth() || new Date().getMonth();
                                const newDate = new Date(parseInt(year), currentMonth, 1);
                                handleFilterChange("dateRange", { from: newDate, to: filters.dateRange.to });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Calendar */}
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={filters.dateRange.from}
                            selected={filters.dateRange}
                            onSelect={(range) => handleFilterChange("dateRange", range || { from: undefined, to: undefined })}
                            className="p-0 pointer-events-auto"
                          />
                        </div>
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
            )}

            {/* View Content */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.title')}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">{t('floating_actions.view.sort_by')}</label>
                    <Select 
                      value={viewConfig.sortBy} 
                      onValueChange={(value) => handleViewConfigChange("sortBy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">{t('floating_actions.view.options.sort.date_desc')}</SelectItem>
                        <SelectItem value="date_asc">{t('floating_actions.view.options.sort.date_asc')}</SelectItem>
                        <SelectItem value="amount_desc">{t('floating_actions.view.options.sort.amount_desc')}</SelectItem>
                        <SelectItem value="amount_asc">{t('floating_actions.view.options.sort.amount_asc')}</SelectItem>
                        <SelectItem value="status">{t('floating_actions.view.options.sort.status')}</SelectItem>
                        <SelectItem value="priority">{t('floating_actions.view.options.sort.priority')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">{t('floating_actions.view.group_by')}</label>
                    <Select 
                      value={viewConfig.groupBy} 
                      onValueChange={(value) => handleViewConfigChange("groupBy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('floating_actions.view.options.group.none')}</SelectItem>
                        <SelectItem value="driver">{t('floating_actions.view.options.group.driver')}</SelectItem>
                        <SelectItem value="expense_type">{t('floating_actions.view.options.group.expense_type')}</SelectItem>
                        <SelectItem value="status">{t('floating_actions.view.options.group.status')}</SelectItem>
                        <SelectItem value="month">{t('floating_actions.view.options.group.month')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">{t('floating_actions.view.density')}</label>
                    <Select 
                      value={viewConfig.density} 
                      onValueChange={(value) => handleViewConfigChange("density", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">{t('floating_actions.view.options.density.compact')}</SelectItem>
                        <SelectItem value="normal">{t('floating_actions.view.options.density.normal')}</SelectItem>
                        <SelectItem value="comfortable">{t('floating_actions.view.options.density.comfortable')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('floating_actions.view.visible_info')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.options.visibility.driver_info')}</label>
                      <Switch 
                        checked={viewConfig.showDriverInfo}
                        onCheckedChange={(checked) => handleViewConfigChange("showDriverInfo", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.options.visibility.expense_type')}</label>
                      <Switch 
                        checked={viewConfig.showExpenseType}
                        onCheckedChange={(checked) => handleViewConfigChange("showExpenseType", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.options.visibility.dates')}</label>
                      <Switch 
                        checked={viewConfig.showDates}
                        onCheckedChange={(checked) => handleViewConfigChange("showDates", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{t('floating_actions.view.options.visibility.amounts')}</label>
                      <Switch 
                        checked={viewConfig.showAmounts}
                        onCheckedChange={(checked) => handleViewConfigChange("showAmounts", checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Content */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Estadísticas Rápidas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-primary">{mockStats.totalDeductions}</div>
                      <div className="text-xs text-muted-foreground">Total Deducciones</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">${formatCurrency(mockStats.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">Monto Total</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{mockStats.planned}</div>
                      <div className="text-xs text-muted-foreground">Planificadas</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{mockStats.applied}</div>
                      <div className="text-xs text-muted-foreground">Aplicadas</div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Estados de Deducción</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Planificadas</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        {mockStats.planned}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Aplicadas</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        {mockStats.applied}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Diferidas</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {mockStats.deferred}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Historial de Cambios</h3>
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Funcionalidad del historial próximamente...
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