import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X, User, Clock, Car } from 'lucide-react';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useGeotabVehicles } from '@/hooks/useGeotabVehicles';
import { PeriodFilter, PeriodFilterValue } from '@/components/loads/PeriodFilter';
import { cn } from '@/lib/utils';

export interface FuelFiltersType {
  periodFilter: PeriodFilterValue;
  driverId: string;
  status: string;
  vehicleId: string;
}

interface FuelFiltersProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
  compact?: boolean;
}

export function FuelFilters({ filters, onFiltersChange, compact = false }: FuelFiltersProps) {
  const { drivers = [] } = useCompanyDrivers();
  const { geotabVehicles: vehicles = [] } = useGeotabVehicles();
  const { t } = useTranslation(['fuel', 'common']);

  const handleFilterChange = (key: keyof FuelFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      periodFilter: { type: 'current' },
      driverId: 'all',
      status: 'all',
      vehicleId: 'all'
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.periodFilter.type !== 'current') count++;
    if (filters.driverId !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.vehicleId !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return compact ? (
    <div className="space-y-4">
      {/* Payment Period */}
      <div>
        <label className="text-sm font-medium mb-2 block">{t('fuel:filters.payment_period')}</label>
        <PeriodFilter
          value={filters.periodFilter}
          onChange={(periodFilter) => handleFilterChange('periodFilter', periodFilter)}
        />
      </div>

      {/* Conductor */}
      <div>
        <label className="text-sm font-medium mb-2 block">{t('fuel:filters.driver')}</label>
        <Select
          value={filters.driverId}
          onValueChange={(value) => handleFilterChange('driverId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('fuel:filters.select_driver')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fuel:filters.all_drivers')}</SelectItem>
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
        <label className="text-sm font-medium mb-2 block">{t('fuel:filters.status')}</label>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('fuel:filters.select_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fuel:filters.all_statuses')}</SelectItem>
            <SelectItem value="pending">{t('fuel:filters.pending')}</SelectItem>
            <SelectItem value="approved">{t('fuel:filters.approved')}</SelectItem>
            <SelectItem value="verified">{t('fuel:filters.verified')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vehículo */}
      <div>
        <label className="text-sm font-medium mb-2 block">{t('fuel:filters.vehicle')}</label>
        <Select
          value={filters.vehicleId}
          onValueChange={(value) => handleFilterChange('vehicleId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('fuel:filters.select_vehicle')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('fuel:filters.all_vehicles')}</SelectItem>
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
    </div>
  ) : (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('fuel:filters.title')}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t('fuel:filters.clear')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Payment Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('fuel:filters.payment_period')}</label>
            <PeriodFilter
              value={filters.periodFilter}
              onChange={(periodFilter) => handleFilterChange('periodFilter', periodFilter)}
            />
          </div>

          {/* Conductor */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              {t('fuel:filters.driver')}
            </label>
            <Select
              value={filters.driverId}
              onValueChange={(value) => handleFilterChange('driverId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fuel:filters.all_drivers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fuel:filters.all_drivers')}</SelectItem>
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
              {t('fuel:filters.status')}
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fuel:filters.all_statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fuel:filters.all_statuses')}</SelectItem>
                <SelectItem value="pending">{t('fuel:filters.pending')}</SelectItem>
                <SelectItem value="approved">{t('fuel:filters.approved')}</SelectItem>
                <SelectItem value="verified">{t('fuel:filters.verified')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehículo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Car className="h-4 w-4" />
              {t('fuel:filters.vehicle')}
            </label>
            <Select
              value={filters.vehicleId}
              onValueChange={(value) => handleFilterChange('vehicleId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fuel:filters.all_vehicles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fuel:filters.all_vehicles')}</SelectItem>
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
        </div>

        {/* Filtros Activos */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.periodFilter.type !== 'current' && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {t('fuel:filters.payment_period')}: {filters.periodFilter.label || filters.periodFilter.type}
                <button
                  onClick={() => handleFilterChange('periodFilter', { type: 'current' })}
                  className="ml-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {filters.driverId !== 'all' && (
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" />
                {t('fuel:filters.driver')}: {drivers.find(d => d.user_id === filters.driverId)?.first_name || t('fuel:filters.unknown')}
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
                {t('fuel:filters.status')}: {filters.status}
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
                {t('fuel:filters.vehicle')}: {vehicles.find(v => v.id === filters.vehicleId)?.name || t('fuel:filters.unknown')}
                <button
                  onClick={() => handleFilterChange('vehicleId', 'all')}
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