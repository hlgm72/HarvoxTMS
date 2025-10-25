import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FacilityFiltersProps {
  filters: {
    state: string;
    city: string;
  };
  onFiltersChange: (filters: { 
    state: string;
    city: string;
  }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacilityFilters({ filters, onFiltersChange, open, onOpenChange }: FacilityFiltersProps) {
  const { t } = useTranslation('facilities');
  
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      state: "",
      city: "",
    });
  };

  const hasActiveFilters = 
    filters.state !== "" ||
    filters.city !== "";

  const activeFilterCount = [
    filters.state !== "",
    filters.city !== "",
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
          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">{t('filters.labels.state')}</Label>
            <Input
              id="state"
              placeholder={t('filters.placeholders.state')}
              value={filters.state}
              onChange={(e) => handleFilterChange("state", e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">{t('filters.labels.city')}</Label>
            <Input
              id="city"
              placeholder={t('filters.placeholders.city')}
              value={filters.city}
              onChange={(e) => handleFilterChange("city", e.target.value)}
            />
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
