import { FloatingActionsSheet, FloatingActionTab } from "@/components/ui/FloatingActionsSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Download, Settings, BarChart3, FileText, FileSpreadsheet, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/dateFormatting";

interface UsersFloatingActionsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  stats?: {
    totalUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    recentUsers: number;
  };
}

const ROLE_OPTIONS = [
  { value: 'company_owner', label: 'Propietario de Empresa' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'senior_dispatcher', label: 'Despachador Senior' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'driver', label: 'Conductor' },
];

export function UsersFloatingActions({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  stats
}: UsersFloatingActionsProps) {
  const { t } = useTranslation(['users', 'common']);

  const hasActiveFilters = searchTerm || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all');

  const clearAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const tabs: FloatingActionTab[] = [
    {
      id: 'filters',
      label: t('common:floating_actions.filters.title'),
      icon: Filter,
      badge: hasActiveFilters ? '●' : undefined,
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('common:floating_actions.filters.applied_filters')}</h3>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-3 w-3 mr-1" />
                {t('common:floating_actions.filters.clear')}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Búsqueda por nombre/email */}
            <div className="space-y-2">
              <Label htmlFor="search-input">{t('filters.search', { ns: 'users' })}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder={t('filters.search_placeholder', { ns: 'users' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 px-2 h-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filtro por rol */}
            <div className="space-y-2">
              <Label htmlFor="role-filter">{t('filters.role', { ns: 'users' })}</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder={t('filters.filter_by_role', { ns: 'users' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all_roles', { ns: 'users' })}</SelectItem>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por estado */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">{t('filters.status', { ns: 'users' })}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder={t('filters.status_placeholder', { ns: 'users' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all_statuses', { ns: 'users' })}</SelectItem>
                  <SelectItem value="active">{t('filters.active', { ns: 'users' })}</SelectItem>
                  <SelectItem value="pending">{t('filters.pending', { ns: 'users' })}</SelectItem>
                  <SelectItem value="inactive">{t('filters.inactive', { ns: 'users' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'export',
      label: t('common:floating_actions.export.title'),
      icon: Download,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">{t('common:floating_actions.export.title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('export.description', { ns: 'users' })}
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                {t('common:floating_actions.export.pdf')}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('common:floating_actions.export.excel')}
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'view',
      label: t('common:floating_actions.view.title'),
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">{t('common:floating_actions.view.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('view.description', { ns: 'users' })}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'stats',
      label: t('common:floating_actions.stats.title'),
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">{t('common:floating_actions.stats.title')}</h3>
            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xl font-bold text-primary">{stats.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">{t('stats.total_users', { ns: 'users' })}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xl font-bold text-primary">{stats.activeUsers}</div>
                  <div className="text-xs text-muted-foreground">{t('stats.active_users', { ns: 'users' })}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xl font-bold text-primary">{stats.pendingInvitations}</div>
                  <div className="text-xs text-muted-foreground">{t('stats.pending_invitations', { ns: 'users' })}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xl font-bold text-primary">{stats.recentUsers}</div>
                  <div className="text-xs text-muted-foreground">{t('stats.recent_users', { ns: 'users' })}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('stats.no_stats', { ns: 'users' })}
              </p>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <FloatingActionsSheet 
      tabs={tabs}
      buttonLabel={t('common:floating_actions.title')}
      defaultTab="filters"
    />
  );
}