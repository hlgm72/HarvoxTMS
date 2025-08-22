import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ClientFiltersProps {
  filters: {
    status: string;
    location: string;
    hasLogo: string;
    hasAlias: string;
    hasNotes: string;
    dateRange: string;
    emailDomain: string;
  };
  onFiltersChange: (filters: { 
    status: string; 
    location: string;
    hasLogo: string;
    hasAlias: string;
    hasNotes: string;
    dateRange: string;
    emailDomain: string;
  }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientFilters({ filters, onFiltersChange, open, onOpenChange }: ClientFiltersProps) {
  const { t } = useTranslation('clients');
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      location: "",
      hasLogo: "all",
      hasAlias: "all", 
      hasNotes: "all",
      dateRange: "all",
      emailDomain: "",
    });
  };

  const hasActiveFilters = 
    filters.status !== "all" || 
    filters.location !== "" ||
    filters.hasLogo !== "all" ||
    filters.hasAlias !== "all" ||
    filters.hasNotes !== "all" ||
    filters.dateRange !== "all" ||
    filters.emailDomain !== "";

  const activeFilterCount = [
    filters.status !== "all",
    filters.location !== "",
    filters.hasLogo !== "all",
    filters.hasAlias !== "all",
    filters.hasNotes !== "all",
    filters.dateRange !== "all",
    filters.emailDomain !== "",
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={hasActiveFilters ? "bg-muted" : ""}
        >
          <Filter className="h-4 w-4 mr-2" />
          {t('filters.button')}
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('filters.title')}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('filters.labels.status')}</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.status.all')}</SelectItem>
                <SelectItem value="active">{t('filters.options.status.active')}</SelectItem>
                <SelectItem value="inactive">{t('filters.options.status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <Label htmlFor="location">{t('filters.labels.location')}</Label>
            <Input
              id="location"
              placeholder={t('filters.placeholders.location')}
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
            />
          </div>

          {/* Dominio de Email */}
          <div className="space-y-2">
            <Label htmlFor="emailDomain">{t('filters.labels.email_domain')}</Label>
            <Input
              id="emailDomain"
              placeholder={t('filters.placeholders.email_domain')}
              value={filters.emailDomain}
              onChange={(e) => handleFilterChange("emailDomain", e.target.value)}
            />
          </div>

          {/* Tiene Logo */}
          <div className="space-y-2">
            <Label htmlFor="hasLogo">{t('filters.labels.logo')}</Label>
            <Select
              value={filters.hasLogo}
              onValueChange={(value) => handleFilterChange("hasLogo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.logo')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.logo.all')}</SelectItem>
                <SelectItem value="yes">{t('filters.options.logo.yes')}</SelectItem>
                <SelectItem value="no">{t('filters.options.logo.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiene Alias */}
          <div className="space-y-2">
            <Label htmlFor="hasAlias">{t('filters.labels.alias')}</Label>
            <Select
              value={filters.hasAlias}
              onValueChange={(value) => handleFilterChange("hasAlias", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.alias')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.alias.all')}</SelectItem>
                <SelectItem value="yes">{t('filters.options.alias.yes')}</SelectItem>
                <SelectItem value="no">{t('filters.options.alias.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiene Notas */}
          <div className="space-y-2">
            <Label htmlFor="hasNotes">{t('filters.labels.notes')}</Label>
            <Select
              value={filters.hasNotes}
              onValueChange={(value) => handleFilterChange("hasNotes", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.notes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.notes.all')}</SelectItem>
                <SelectItem value="yes">{t('filters.options.notes.yes')}</SelectItem>
                <SelectItem value="no">{t('filters.options.notes.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Creación */}
          <div className="space-y-2">
            <Label htmlFor="dateRange">{t('filters.labels.creation_date')}</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.date_range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.date_range.all')}</SelectItem>
                <SelectItem value="today">{t('filters.options.date_range.today')}</SelectItem>
                <SelectItem value="week">{t('filters.options.date_range.week')}</SelectItem>
                <SelectItem value="month">{t('filters.options.date_range.month')}</SelectItem>
                <SelectItem value="quarter">{t('filters.options.date_range.quarter')}</SelectItem>
                <SelectItem value="year">{t('filters.options.date_range.year')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters} className="flex-1">
              {t('filters.actions.clear')}
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              {t('filters.actions.apply')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}