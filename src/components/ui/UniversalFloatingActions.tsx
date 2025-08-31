import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ExpandableFloatingActions } from '@/components/ui/ExpandableFloatingActions';
import { PeriodFilter } from '@/components/loads/PeriodFilter';
import { FilterX, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  UniversalFloatingActionsProps, 
  BaseFilters, 
  ActionTabType,
  ContextKey
} from './UniversalFilterTypes';
import { CONTEXT_CONFIGS } from './filterConfigs';

interface UniversalFloatingActionsGenericProps<T extends BaseFilters> 
  extends UniversalFloatingActionsProps<T> {
  // Handlers específicos opcionales
  onSyncHandler?: () => Promise<void>;
  onExportHandler?: (format: string) => Promise<void>;
  // Loading states
  syncLoading?: boolean;
  exportLoading?: boolean;
}

export function UniversalFloatingActions<T extends BaseFilters>({
  contextKey,
  filters,
  onFiltersChange,
  additionalData = {},
  position = "bottom-right",
  customConfig,
  onSyncHandler,
  onExportHandler,
  syncLoading = false,
  exportLoading = false
}: UniversalFloatingActionsGenericProps<T>) {
  const config = CONTEXT_CONFIGS[contextKey as ContextKey];
  const { t } = useTranslation([config.namespace, 'common']);
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionTabType>('filters');

  // Merge custom config if provided
  const finalConfig = customConfig ? { ...config, ...customConfig } : config;
  
  // Calculate active filters
  const hasActiveFilters = finalConfig.filterConfig.hasActiveFilters(filters);
  const activeFilterBadges = finalConfig.filterConfig.getActiveFilterBadges(filters, additionalData);

  const openSheet = (tab: ActionTabType) => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const clearFilters = () => {
    const clearedFilters = finalConfig.filterConfig.clearFilters();
    onFiltersChange(clearedFilters as T);
  };

  const handleFilterChange = (key: keyof T, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // Build floating actions based on config
  const floatingActions = finalConfig.actions.map(action => ({
    icon: action.icon,
    label: t(action.labelKey, { ns: 'common' }), // ← Cambiado a 'common'
    onClick: () => openSheet(action.key),
    variant: action.variant || 'secondary' as const,
    className: cn(
      action.className,
      action.key === 'filters' && hasActiveFilters ? 
        '!bg-blue-500 !hover:bg-blue-600 !text-white !border-blue-500' : ''
    )
  }));

  // Render filter field based on type
  const renderFilterField = (field: any) => {
    const fieldValue = filters[field.key as keyof T];
    
    switch (field.type) {
      case 'search':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">
              {t(field.labelKey, { ns: finalConfig.namespace })}
            </Label>
            <Input
              type="text"
              placeholder={field.placeholder || t(field.labelKey, { ns: finalConfig.namespace })}
              value={fieldValue as string || ''}
              onChange={(e) => handleFilterChange(field.key as keyof T, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case 'select':
        // Build options including additional data if available
        let options = [...field.options];
        
        if (field.key === 'driverId' && additionalData.drivers) {
          options = [
            ...options,
            ...additionalData.drivers.map(driver => ({
              value: driver.user_id,
              label: `${driver.first_name} ${driver.last_name}`
            }))
          ];
        } else if (field.key === 'vehicleId' && additionalData.vehicles) {
          options = [
            ...options,
            ...additionalData.vehicles.map(vehicle => ({
              value: vehicle.id,
              label: vehicle.plate_number
            }))
          ];
        } else if (field.key === 'brokerId' && additionalData.brokers) {
          options = [
            ...options,
            ...additionalData.brokers.map(broker => ({
              value: broker.id,
              label: broker.name
            }))
          ];
        } else if (field.key === 'expenseTypeId' && additionalData.expenseTypes) {
          options = [
            ...options,
            ...additionalData.expenseTypes.map(expenseType => ({
              value: expenseType.id,
              label: expenseType.name
            }))
          ];
        }

        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">
              {t(field.labelKey, { ns: finalConfig.namespace })}
            </Label>
            <Select 
              value={fieldValue as string || 'all'} 
              onValueChange={(value) => handleFilterChange(field.key as keyof T, value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.labelKey ? t(option.labelKey, { ns: finalConfig.namespace }) : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'period':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">
              {t(field.labelKey, { ns: 'common' })}
            </Label>
            <PeriodFilter
              value={fieldValue as any}
              onChange={(value) => handleFilterChange(field.key as keyof T, value)}
            />
          </div>
        );

      case 'dateRange':
        // DateRange functionality will be implemented later
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">
              {t(field.labelKey, { ns: finalConfig.namespace })}
            </Label>
            <div className="p-3 border rounded-md text-sm text-muted-foreground bg-muted">
              Selector de rango de fechas disponible próximamente
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render stats if enabled
  const renderStats = () => {
    if (!finalConfig.statsConfig?.enabled || !additionalData.stats) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {finalConfig.statsConfig.fields.map((field) => {
            const value = additionalData.stats?.[field.key];
            const formattedValue = field.formatter 
              ? field.formatter(value) 
              : value?.toString() || '0';

            return (
              <div key={field.key} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {t(field.labelKey, { ns: 'common' })}
                  </span>
                </div>
                <div className="text-2xl font-bold">{formattedValue}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render export options
  const renderExportOptions = () => {
    if (!finalConfig.customActions?.export?.enabled) return null;

    const formats = finalConfig.customActions.export.formats || ['pdf'];

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {formats.includes('pdf') && (
            <Button 
              className="w-full justify-start" 
              variant="outline"
              disabled={exportLoading}
              onClick={() => onExportHandler?.('pdf')}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {t('floating_actions.export.pdf', { ns: 'common' }) || 'Exportar como PDF'}
            </Button>
          )}
          
          {formats.includes('excel') && (
            <Button 
              className="w-full justify-start" 
              variant="outline"
              disabled={exportLoading}
              onClick={() => onExportHandler?.('excel')}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {t('floating_actions.export.excel', { ns: 'common' }) || 'Exportar como Excel'}
            </Button>
          )}
          
          {formats.includes('csv') && (
            <Button 
              className="w-full justify-start" 
              variant="outline"
              disabled={exportLoading}
              onClick={() => onExportHandler?.('csv')}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {t('floating_actions.export.csv', { ns: 'common' }) || 'Exportar como CSV'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render sync content (for fuel)
  const renderSyncContent = () => {
    if (!finalConfig.customActions?.sync?.enabled) return null;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium mb-3">
            {t('floating_actions.sync.title', { ns: 'common' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('floating_actions.sync.description', { ns: 'common' })}
          </p>
          <Button
            onClick={() => onSyncHandler?.()}
            disabled={syncLoading}
            className="w-full"
          >
            {syncLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('floating_actions.sync.syncing', { ns: 'common' })}
              </>
            ) : (
              t('floating_actions.sync.sync_transactions', { ns: 'common' })
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Actions */}
      <ExpandableFloatingActions
        actions={floatingActions}
        mainLabel={t('floating_actions.title', { ns: 'common' })}
        position={position}
      />

      {/* Sheet Modal */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] bg-white dark:bg-gray-900">
          <SheetHeader>
            <SheetTitle>
              {finalConfig.actions.find(a => a.key === activeTab)?.titleKey && 
                t(finalConfig.actions.find(a => a.key === activeTab)!.titleKey, { ns: 'common' })
              }
            </SheetTitle>
            <SheetDescription>
              {finalConfig.actions.find(a => a.key === activeTab)?.descriptionKey && 
                t(finalConfig.actions.find(a => a.key === activeTab)!.descriptionKey!, { ns: 'common' })
              }
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Filters Content */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {t('floating_actions.applied_filters', { ns: 'common' }) || 'Filtros Aplicados'}
                  </h3>
                  {hasActiveFilters && (
                     <Button variant="outline" size="sm" onClick={clearFilters}>
                       <FilterX className="h-3 w-3 mr-1" />
                       {t('floating_actions.filters.clear', { ns: 'common' }) || 'Limpiar'}
                     </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {finalConfig.filterConfig.fields.map(renderFilterField)}

                  {/* Active Filters Display */}
                  {hasActiveFilters && (
                    <div className="space-y-2">
                      <Separator />
                       <h4 className="text-sm font-medium">
                         {t('floating_actions.filters.active_filters', { ns: 'common' }) || 'Filtros Activos'}
                       </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeFilterBadges.map((badge) => (
                          <Badge key={badge.key} variant="secondary">
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export Content */}
            {activeTab === 'export' && renderExportOptions()}

            {/* Stats Content */}
            {activeTab === 'stats' && renderStats()}

            {/* Sync Content */}
            {activeTab === 'sync' && renderSyncContent()}

            {/* View Content (placeholder) */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                <h3 className="text-sm font-medium mb-3">
                  {t('floating_actions.view.title', { ns: 'common' })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('floating_actions.view.description', { ns: 'common' }) || 
                   'Opciones de vista disponibles próximamente.'}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}