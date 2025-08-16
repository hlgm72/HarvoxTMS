import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X, User, Clock, Car, Fuel } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { formatShortDate, formatMediumDate } from '@/lib/dateFormatting';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useGeotabVehicles } from '@/hooks/useGeotabVehicles';
import { cn } from '@/lib/utils';

export interface FuelFiltersType {
  driverId: string;
  status: string;
  vehicleId: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

interface FuelFiltersProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
  compact?: boolean;
}

export function FuelFilters({ filters, onFiltersChange, compact = false }: FuelFiltersProps) {
  const { drivers = [] } = useCompanyDrivers();
  const { geotabVehicles: vehicles = [] } = useGeotabVehicles();

  const handleFilterChange = (key: keyof FuelFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      driverId: 'all',
      status: 'all',
      vehicleId: 'all',
      dateRange: { from: undefined, to: undefined }
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.driverId !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.vehicleId !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return compact ? (
    <div className="space-y-4">
      {/* Conductor */}
      <div>
        <label className="text-sm font-medium mb-2 block">Conductor</label>
        <Select
          value={filters.driverId}
          onValueChange={(value) => handleFilterChange('driverId', value)}
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

      {/* Estado */}
      <div>
        <label className="text-sm font-medium mb-2 block">Estado</label>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
            <SelectItem value="verified">Verificado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vehículo */}
      <div>
        <label className="text-sm font-medium mb-2 block">Vehículo</label>
        <Select
          value={filters.vehicleId}
          onValueChange={(value) => handleFilterChange('vehicleId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar vehículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vehículos</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
                {vehicle.license_plate && (
                  <span className="text-muted-foreground ml-1">
                    ({vehicle.license_plate})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rango de Fechas */}
      <div>
        <label className="text-sm font-medium mb-2 block">Rango de Fechas</label>
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
                <span>Seleccionar rango</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange.from}
              selected={{
                from: filters.dateRange.from,
                to: filters.dateRange.to,
              }}
              onSelect={(range) => {
                handleFilterChange('dateRange', {
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  ) : (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Conductor */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              Conductor
            </label>
            <Select
              value={filters.driverId}
              onValueChange={(value) => handleFilterChange('driverId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los conductores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los conductores</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.user_id} value={driver.user_id}>
                    {driver.first_name} {driver.last_name}
                    <span className="text-muted-foreground ml-1">
                      (#{driver.id})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Estado
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="verified">Verificado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehículo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Car className="h-4 w-4" />
              Vehículo
            </label>
            <Select
              value={filters.vehicleId}
              onValueChange={(value) => handleFilterChange('vehicleId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los vehículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vehículos</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                    {vehicle.license_plate && (
                      <span className="text-muted-foreground ml-1">
                        ({vehicle.license_plate})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de Fechas */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              Rango de Fechas
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.from && !filters.dateRange.to && "text-muted-foreground"
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
                    "Seleccionar fechas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={{
                    from: filters.dateRange.from,
                    to: filters.dateRange.to,
                  }}
                  onSelect={(range) => {
                    handleFilterChange('dateRange', {
                      from: range?.from,
                      to: range?.to,
                    });
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filtros Activos */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.driverId !== 'all' && (
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" />
                Conductor: {drivers.find(d => d.user_id === filters.driverId)?.first_name || 'Desconocido'}
                <button
                  onClick={() => handleFilterChange('driverId', 'all')}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {filters.status !== 'all' && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Estado: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', 'all')}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {filters.vehicleId !== 'all' && (
              <Badge variant="outline" className="gap-1">
                <Car className="h-3 w-3" />
                Vehículo: {vehicles.find(v => v.id === filters.vehicleId)?.name || 'Desconocido'}
                <button
                  onClick={() => handleFilterChange('vehicleId', 'all')}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {(filters.dateRange.from || filters.dateRange.to) && (
              <Badge variant="outline" className="gap-1">
                <CalendarIcon className="h-3 w-3" />
                Fechas: {filters.dateRange.from && formatShortDate(filters.dateRange.from)}
                {filters.dateRange.to && ` - ${formatShortDate(filters.dateRange.to)}`}
                <button
                  onClick={() => handleFilterChange('dateRange', { from: undefined, to: undefined })}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}