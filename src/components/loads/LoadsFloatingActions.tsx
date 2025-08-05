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
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "created", label: "Creada" },
  { value: "route_planned", label: "Ruta Planificada" },
  { value: "assigned", label: "Asignada" },
  { value: "in_transit", label: "En Tránsito" },
  { value: "delivered", label: "Entregada" },
  { value: "completed", label: "Completada" }
];

const driverOptions = [
  { value: "all", label: "Todos los conductores" },
  { value: "driver1", label: "María García" },
  { value: "driver2", label: "Carlos Rodríguez" },
  { value: "driver3", label: "Ana Martínez" }
];

const brokerOptions = [
  { value: "all", label: "Todos los brokers" },
  { value: "broker1", label: "ABC Logistics" },
  { value: "broker2", label: "XYZ Freight" },
  { value: "broker3", label: "Global Transport" }
];

const sortOptions = [
  { value: "date_desc", label: "Fecha (más reciente)" },
  { value: "date_asc", label: "Fecha (más antigua)" },
  { value: "amount_desc", label: "Monto (mayor a menor)" },
  { value: "amount_asc", label: "Monto (menor a mayor)" },
  { value: "status", label: "Estado" }
];

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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'export' | 'view' | 'stats'>('filters');
  
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
      case 'current': return 'Período Actual';
      case 'previous': return 'Período Anterior';
      case 'next': return 'Período Siguiente';
      case 'all': return 'Todos los Períodos';
      case 'this_month': return 'Este Mes';
      case 'last_month': return 'Mes Pasado';
      case 'this_quarter': return 'Este Trimestre';
      case 'last_quarter': return 'Trimestre Pasado';
      case 'this_year': return 'Este Año';
      case 'last_year': return 'Año Pasado';
      case 'specific': return 'Período Específico';
      case 'custom': return 'Rango Personalizado';
      default: return 'Período Actual';
    }
  };

  // Definir las acciones para el componente expandible
  const floatingActions = [
    {
      icon: Filter,
      label: hasActiveFilters ? 'Filtros (activos)' : 'Filtros',
      onClick: () => openSheet('filters'),
      variant: (hasActiveFilters ? 'default' : 'secondary') as 'default' | 'secondary' | 'outline' | 'destructive',
      className: hasActiveFilters ? 'bg-blue-600 hover:bg-blue-700' : ''
    },
    {
      icon: Download,
      label: 'Exportar',
      onClick: () => openSheet('export'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: Settings,
      label: 'Vista',
      onClick: () => openSheet('view'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    },
    {
      icon: BarChart3,
      label: 'Estadísticas',
      onClick: () => openSheet('stats'),
      variant: 'secondary' as 'default' | 'secondary' | 'outline' | 'destructive'
    }
  ];

  return (
    <>
      {/* Botones Flotantes Expandibles */}
      <ExpandableFloatingActions
        actions={floatingActions}
        mainIcon={Plus}
        mainLabel="Acciones de Cargas"
        position="bottom-right"
      />

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && 'Filtros de Cargas'}
              {activeTab === 'export' && 'Exportar Datos'}
              {activeTab === 'view' && 'Configuración de Vista'}
              {activeTab === 'stats' && 'Estadísticas'}
            </SheetTitle>
            <SheetDescription>
              {activeTab === 'filters' && 'Filtra las cargas por estado, conductor, broker y fechas'}
              {activeTab === 'export' && 'Exporta los datos de cargas en diferentes formatos'}
              {activeTab === 'view' && 'Personaliza cómo se muestran las cargas'}
              {activeTab === 'stats' && 'Ve estadísticas rápidas de tus cargas'}
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
                        {driverOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Broker Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Broker / Cliente</label>
                    <Select 
                      value={filters.broker} 
                      onValueChange={(value) => handleFilterChange("broker", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar broker" />
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

                  {/* Period Filter - Enhanced */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Período de Pago</label>
                    <Select 
                      value={periodFilter?.type || 'current'} 
                      onValueChange={(value) => onPeriodFilterChange?.({ type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar período" />
                      </SelectTrigger>
                       <SelectContent>
                        <SelectItem value="current">Período Actual</SelectItem>
                        <SelectItem value="previous">Período Anterior</SelectItem>
                        <SelectItem value="next">Período Siguiente</SelectItem>
                        <SelectItem value="all">Todos los Períodos</SelectItem>
                        <SelectItem value="this_month">Este Mes</SelectItem>
                        <SelectItem value="last_month">Mes Pasado</SelectItem>
                        <SelectItem value="this_quarter">Este Trimestre</SelectItem>
                        <SelectItem value="last_quarter">Trimestre Pasado</SelectItem>
                        <SelectItem value="this_year">Este Año</SelectItem>
                        <SelectItem value="last_year">Año Pasado</SelectItem>
                        <SelectItem value="specific">Período Específico...</SelectItem>
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
                    <label className="text-sm font-medium">Fecha de Pickup</label>
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
                                {format(filters.dateRange.from, "dd/MM/yy", { locale: es })} -{" "}
                                {format(filters.dateRange.to, "dd/MM/yy", { locale: es })}
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
                      <div className="text-2xl font-bold text-green-600">${mockStats.totalValue.toLocaleString()}</div>
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
                    <div className="text-xl font-bold text-primary">${mockStats.averageValue.toLocaleString()}</div>
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
