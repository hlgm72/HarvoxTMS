import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FloatingActionsSheet } from "@/components/ui/FloatingActionsSheet";
import { 
  Filter, 
  FilterX, 
  Download, 
  BarChart3,
  FileText,
  DollarSign,
  Users,
  Clock,
  Plus,
  CheckCircle
} from "lucide-react";
import { formatCurrency } from '@/lib/dateFormatting';
import { PeriodFilter, PeriodFilterValue } from "@/components/loads/PeriodFilter";

export interface AdditionalPaymentsFiltersType {
  userId: string;
  status: string;
  periodFilter: PeriodFilterValue;
  userType: 'all' | 'driver' | 'dispatcher';
}

interface AdditionalPaymentsFloatingActionsProps {
  filters: AdditionalPaymentsFiltersType;
  onFiltersChange: (filters: AdditionalPaymentsFiltersType) => void;
  onAddIncome: () => void;
  drivers: Array<{ user_id: string; first_name: string; last_name: string }>;
  dispatchers: Array<{ id: string; first_name?: string; last_name?: string; full_name?: string }>;
  stats?: {
    totalItems: number;
    totalAmount: number;
    totalApproved: number;
    totalPending: number;
  };
}

export function AdditionalPaymentsFloatingActions({ 
  filters, 
  onFiltersChange, 
  onAddIncome,
  drivers,
  dispatchers,
  stats
}: AdditionalPaymentsFloatingActionsProps) {
  const { t } = useTranslation(['payments', 'common']);

  const statusOptions = [
    { value: "all", label: t('filters.status_options.all') },
    { value: "pending", label: t('filters.status_options.pending') },
    { value: "approved", label: t('filters.status_options.approved') },
    { value: "rejected", label: t('filters.status_options.rejected') }
  ];

  const userTypeOptions = [
    { value: "all", label: t('payments:additional_payments.filters.all_users') },
    { value: "driver", label: t('payments:additional_payments.filters.drivers_only') },
    { value: "dispatcher", label: t('payments:additional_payments.filters.dispatchers_only') }
  ];

  const handleFilterChange = (key: keyof AdditionalPaymentsFiltersType, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    
    // Si cambia el userType, resetear userId
    if (key === 'userType' && value !== 'all') {
      newFilters.userId = 'all';
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      userId: 'all',
      status: 'all',
      userType: 'all',
      periodFilter: { type: 'week' }
    });
  };

  const hasActiveFilters = filters.userId !== 'all' || 
                          filters.status !== 'all' ||
                          filters.userType !== 'all' ||
                          filters.periodFilter.type !== 'week';

  const activeFiltersCount = [
    filters.userId !== 'all',
    filters.status !== 'all',
    filters.userType !== 'all',
    filters.periodFilter.type !== 'week'
  ].filter(Boolean).length;

  // Get current user list based on userType
  const getCurrentUsers = () => {
    if (filters.userType === 'driver') return drivers;
    if (filters.userType === 'dispatcher') return dispatchers;
    return [...drivers, ...dispatchers];
  };

  const currentUsers = getCurrentUsers();

  // Define tabs
  const tabs = [
    {
      id: 'filters',
      label: t('floating_actions.filters', 'Filtros'),
      icon: Filter,
      badge: activeFiltersCount > 0 ? activeFiltersCount : undefined,
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('floating_actions.applied_filters', 'Filtros Aplicados')}</h3>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <FilterX className="h-3 w-3 mr-1" />
                {t('filters.clear')}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Period Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('filters.period_label')}</label>
              <PeriodFilter
                value={filters.periodFilter}
                onChange={(periodFilter) => handleFilterChange('periodFilter', periodFilter)}
              />
            </div>

            {/* User Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('payments:additional_payments.filters.user_type')}</label>
              <Select 
                value={filters.userType} 
                onValueChange={(value) => handleFilterChange('userType', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('payments:additional_payments.filters.select_user_type')} />
                </SelectTrigger>
                <SelectContent>
                  {userTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            {filters.userType !== 'all' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {filters.userType === 'driver' ? t('filters.driver_label') : t('payments:additional_payments.filters.dispatcher')}
                </label>
                <Select 
                  value={filters.userId} 
                  onValueChange={(value) => handleFilterChange('userId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.select_user')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filters.all_drivers')}</SelectItem>
                  {currentUsers.map((user: any) => (
                    <SelectItem key={user.user_id || user.id} value={user.user_id || user.id}>
                      {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('filters.status_label')}</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
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

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="space-y-2">
                <Separator />
                <h4 className="text-sm font-medium">{t('filters.active_filters')}</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.userType !== 'all' && (
                    <Badge variant="secondary">
                      {t('filters.active_badges.type')} {userTypeOptions.find(u => u.value === filters.userType)?.label}
                    </Badge>
                  )}
                  {filters.userId !== 'all' && (
                    <Badge variant="secondary">
                      {t('filters.active_badges.user')} {(() => {
                        const user = currentUsers.find((u: any) => (u.user_id || u.id) === filters.userId);
                        if (!user) return filters.userId;
                        const fullName = 'full_name' in user ? user.full_name : undefined;
                        return fullName || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                      })()}
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="secondary">
                      {t('filters.active_badges.status')} {statusOptions.find(s => s.value === filters.status)?.label}
                    </Badge>
                  )}
                  {(filters.periodFilter.type !== 'week' || filters.periodFilter.label) && (
                    <Badge variant="secondary">
                      {t('filters.active_badges.period')} {filters.periodFilter.label || filters.periodFilter.type}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      label: t('floating_actions.actions', 'Acciones'),
      icon: Plus,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <Button className="w-full justify-start" onClick={onAddIncome}>
              <Plus className="h-4 w-4 mr-2" />
              {t('payments:additional_payments.actions.add_income')}
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'stats',
      label: t('floating_actions.stats', 'Estadísticas'),
      icon: BarChart3,
      content: stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{t('payments:additional_payments.stats.total_items')}</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </div>

            <div className="p-4 border rounded-lg space-y-2 col-span-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{t('payments:additional_payments.stats.total_amount')}</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{t('payments:additional_payments.stats.approved')}</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalApproved)}</div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">{t('payments:additional_payments.stats.pending')}</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {t('floating_actions.no_stats', 'No hay estadísticas disponibles')}
        </div>
      )
    }
  ];

  return (
    <FloatingActionsSheet
      tabs={tabs}
      buttonLabel={t('floating_actions.main_label', 'ACCIONES')}
      defaultTab="filters"
    />
  );
}
