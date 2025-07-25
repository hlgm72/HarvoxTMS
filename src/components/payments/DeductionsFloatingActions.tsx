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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Filter, 
  FilterX, 
  CalendarIcon, 
  Download, 
  Settings, 
  BarChart3,
  FileText,
  FileSpreadsheet,
  History
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "planned", label: "Planificado" },
  { value: "applied", label: "Aplicado" },
  { value: "deferred", label: "Diferido" }
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
  const { t } = useTranslation();
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

  const actionButtons = [
    {
      id: 'filters',
      icon: Filter,
      label: 'Filtros',
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'hover:bg-blue-50',
      hasIndicator: hasActiveFilters
    },
    {
      id: 'export',
      icon: Download,
      label: 'Exportar',
      color: 'text-green-600 hover:text-green-700',
      bgColor: 'hover:bg-green-50',
      hasIndicator: false
    },
    {
      id: 'view',
      icon: Settings,
      label: 'Vista',
      color: 'text-purple-600 hover:text-purple-700',
      bgColor: 'hover:bg-purple-50',
      hasIndicator: false
    },
    {
      id: 'history',
      icon: History,
      label: 'Historial',
      color: 'text-orange-600 hover:text-orange-700',
      bgColor: 'hover:bg-orange-50',
      hasIndicator: false
    }
  ];

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <TooltipProvider>
          {actionButtons.map((action) => {
            const IconComponent = action.icon;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-14 w-12 rounded-l-xl rounded-r-none border-r-0 shadow-lg transition-all duration-300",
                      "bg-background/95 backdrop-blur-sm",
                      "hover:w-16 hover:shadow-xl hover:-translate-x-1",
                      action.color,
                      action.bgColor,
                      "relative flex flex-col items-center justify-center gap-1 px-2"
                    )}
                    onClick={() => openSheet(action.id as any)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-[8px] font-medium leading-none">{action.label}</span>
                    {action.hasIndicator && (
                      <div className="absolute -top-1 left-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="mr-2">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && 'Filtros de Deducciones'}
              {activeTab === 'export' && 'Exportar Datos'}
              {activeTab === 'view' && 'Configuración de Vista'}
              {activeTab === 'history' && 'Historial de Cambios'}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && 'Filtra las deducciones por estado, conductor, tipo y fechas'}
              {activeTab === 'export' && 'Exporta los datos de deducciones en diferentes formatos'}
              {activeTab === 'view' && 'Personaliza cómo se muestran las deducciones'}
              {activeTab === 'history' && 'Ve el historial de cambios y auditoría'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Filters Content */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Filtros Aplicados</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <FilterX className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
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
                    <label className="text-sm font-medium">Conductor</label>
                    <Select 
                      value={filters.driver} 
                      onValueChange={(value) => handleFilterChange("driver", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar conductor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los conductores</SelectItem>
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
                    <label className="text-sm font-medium">Tipo de Gasto</label>
                    <Select 
                      value={filters.expenseType} 
                      onValueChange={(value) => handleFilterChange("expenseType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
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
                    <label className="text-sm font-medium">Fecha del Gasto</label>
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
                                {format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                                {format(filters.dateRange.to, "dd/MM/yyyy", { locale: es })}
                              </>
                            ) : (
                              format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })
                            )
                          ) : (
                            "Seleccionar fechas"
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
                          className="p-0 pointer-events-auto"
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
                      <label className="text-sm">Solo deducciones visibles</label>
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
                      onValueChange={(value) => handleViewConfigChange("sortBy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">Fecha (más reciente)</SelectItem>
                        <SelectItem value="date_asc">Fecha (más antigua)</SelectItem>
                        <SelectItem value="amount_desc">Monto (mayor a menor)</SelectItem>
                        <SelectItem value="amount_asc">Monto (menor a mayor)</SelectItem>
                        <SelectItem value="status">Estado</SelectItem>
                        <SelectItem value="priority">Prioridad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Agrupar por</label>
                    <Select 
                      value={viewConfig.groupBy} 
                      onValueChange={(value) => handleViewConfigChange("groupBy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin agrupar</SelectItem>
                        <SelectItem value="driver">Por conductor</SelectItem>
                        <SelectItem value="expense_type">Por tipo de gasto</SelectItem>
                        <SelectItem value="status">Por estado</SelectItem>
                        <SelectItem value="month">Por mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Densidad</label>
                    <Select 
                      value={viewConfig.density} 
                      onValueChange={(value) => handleViewConfigChange("density", value)}
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
                  <h3 className="text-sm font-medium mb-3">Información Visible</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Información del Conductor</label>
                      <Switch 
                        checked={viewConfig.showDriverInfo}
                        onCheckedChange={(checked) => handleViewConfigChange("showDriverInfo", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Tipo de Gasto</label>
                      <Switch 
                        checked={viewConfig.showExpenseType}
                        onCheckedChange={(checked) => handleViewConfigChange("showExpenseType", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Fechas</label>
                      <Switch 
                        checked={viewConfig.showDates}
                        onCheckedChange={(checked) => handleViewConfigChange("showDates", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Montos</label>
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
                      <div className="text-2xl font-bold text-green-600">${mockStats.totalAmount.toLocaleString()}</div>
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