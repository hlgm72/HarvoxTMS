import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, X } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface CompanyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  stateFilter: string;
  onStateFilterChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CompanyFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  planFilter,
  onPlanFilterChange,
  stateFilter,
  onStateFilterChange,
  onClearFilters,
  hasActiveFilters,
}: CompanyFiltersProps) {
  const { t } = useTranslation('admin');
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('pages.companies.filters.search_placeholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.companies.filters.all_companies')}</SelectItem>
              <SelectItem value="active">{t('pages.companies.status.active')}</SelectItem>
              <SelectItem value="inactive">{t('pages.companies.status.inactive')}</SelectItem>
              <SelectItem value="suspended">{t('pages.companies.status.suspended')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={onPlanFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('common.plan')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.companies.filters.all_companies')}</SelectItem>
              <SelectItem value="trial">{t('pages.companies.plans.trial')}</SelectItem>
              <SelectItem value="basic">{t('pages.companies.plans.basic')}</SelectItem>
              <SelectItem value="premium">{t('pages.companies.plans.premium')}</SelectItem>
              <SelectItem value="enterprise">{t('pages.companies.plans.enterprise')}</SelectItem>
              <SelectItem value="demo">{t('pages.companies.plans.demo')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stateFilter} onValueChange={onStateFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('pages.companies.form.state')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.companies.filters.all_companies')}</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-2" />
              {t('pages.companies.filters.clear', { defaultValue: "Clear" })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}