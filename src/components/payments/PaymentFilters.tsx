import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { PeriodFilter, PeriodFilterValue } from '@/components/loads/PeriodFilter';
import { useTranslation } from 'react-i18next';

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

export function PaymentFilters({ filters, onFiltersChange, drivers, compact = false }: PaymentFiltersProps) {
  const { t } = useTranslation('payments');
  
  const statusOptions = [
    { value: 'all', label: t('filters.status_options.all') },
    { value: 'pending', label: t('filters.status_options.pending') },
    { value: 'calculated', label: t('filters.status_options.calculated') },
    { value: 'approved', label: t('filters.status_options.approved') },
    { value: 'paid', label: t('filters.status_options.paid') },
    { value: 'failed', label: t('filters.status_options.failed') },
    { value: 'negative', label: t('filters.status_options.negative') }
  ];
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
            placeholder={t('filters.search_placeholder')}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros de selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={filters.driverId} onValueChange={(value) => handleFilterChange('driverId', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('filters.driver_label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all_drivers')}</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.user_id} value={driver.user_id}>
                  {driver.first_name} {driver.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('filters.status_label')} />
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
            {t('filters.clear_filters')} ({activeCount})
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
            {t('filters.title')}
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
              {t('filters.clear')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filters.search_placeholder')}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.driver_label')}</label>
            <Select value={filters.driverId} onValueChange={(value) => handleFilterChange('driverId', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.select_driver')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all_drivers')}</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.user_id} value={driver.user_id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.status_label')}</label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
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
        </div>

        {/* Filtro de período */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('filters.period_label')}</label>
          <PeriodFilter
            value={filters.periodFilter}
            onChange={(value) => handleFilterChange('periodFilter', value)}
          />
        </div>

        {/* Filtros activos */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">{t('filters.active_filters')}</span>
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {t('filters.active_badges.search')} {filters.search}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('search', '')}
                />
              </Badge>
            )}
            {filters.driverId && filters.driverId !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {t('filters.active_badges.driver')} {(() => {
                  const driver = drivers.find(d => d.user_id === filters.driverId);
                  return driver ? `${driver.first_name} ${driver.last_name}` : t('filters.active_badges.selected');
                })()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('driverId', 'all')}
                />
              </Badge>
            )}
            {filters.status && filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {t('filters.active_badges.status')} {statusOptions.find(s => s.value === filters.status)?.label || filters.status}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('status', 'all')}
                />
              </Badge>
            )}
            {filters.periodFilter && filters.periodFilter.type !== 'current' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {t('filters.active_badges.period')} {filters.periodFilter.label || filters.periodFilter.type}
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