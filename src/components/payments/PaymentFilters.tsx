import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { PeriodFilter, PeriodFilterValue } from '@/components/loads/PeriodFilter';

export interface PaymentFiltersType {
  search: string;
  driverId: string;
  status: string;
  periodFilter: PeriodFilterValue;
}

interface PaymentFiltersProps {
  filters: PaymentFiltersType;
  onFiltersChange: (filters: PaymentFiltersType) => void;
  drivers: Array<{ user_id: string; first_name: string; last_name: string }>;
  compact?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'calculated', label: 'Calculados' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'paid', label: 'Pagados' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'negative', label: 'Balance Negativo' }
];

export function PaymentFilters({ filters, onFiltersChange, drivers, compact = false }: PaymentFiltersProps) {
  const handleFilterChange = (key: keyof PaymentFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      driverId: 'all',
      status: 'all',
      periodFilter: { type: 'current' }
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.driverId && filters.driverId !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.periodFilter && filters.periodFilter.type !== 'current') count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conductor..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros de selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={filters.driverId} onValueChange={(value) => handleFilterChange('driverId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Conductor" />
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

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
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

        {/* Filtro de período */}
        <PeriodFilter
          value={filters.periodFilter}
          onChange={(value) => handleFilterChange('periodFilter', value)}
        />

        {/* Botón limpiar filtros */}
        {activeCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar Filtros ({activeCount})
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </CardTitle>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conductor..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Conductor</label>
            <Select value={filters.driverId} onValueChange={(value) => handleFilterChange('driverId', value)}>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
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
        </div>

        {/* Filtro de período */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <PeriodFilter
            value={filters.periodFilter}
            onChange={(value) => handleFilterChange('periodFilter', value)}
          />
        </div>

        {/* Filtros activos */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Filtros activos:</span>
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Búsqueda: {filters.search}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('search', '')}
                />
              </Badge>
            )}
            {filters.driverId && filters.driverId !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Conductor: {(() => {
                  const driver = drivers.find(d => d.user_id === filters.driverId);
                  return driver ? `${driver.first_name} ${driver.last_name}` : 'Seleccionado';
                })()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('driverId', 'all')}
                />
              </Badge>
            )}
            {filters.status && filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Estado: {statusOptions.find(s => s.value === filters.status)?.label || filters.status}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('status', 'all')}
                />
              </Badge>
            )}
            {filters.periodFilter && filters.periodFilter.type !== 'current' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Período: {filters.periodFilter.label || filters.periodFilter.type}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('periodFilter', { type: 'current' })}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}