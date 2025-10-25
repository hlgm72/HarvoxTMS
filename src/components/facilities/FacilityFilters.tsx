import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FacilityFiltersProps {
  filters: {
    status: string;
    type: string;
    state: string;
    city: string;
  };
  onFiltersChange: (filters: { 
    status: string; 
    type: string;
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
      status: "all",
      type: "all",
      state: "",
      city: "",
    });
  };

  const hasActiveFilters = 
    filters.status !== "all" || 
    filters.type !== "all" ||
    filters.state !== "" ||
    filters.city !== "";

  const activeFilterCount = [
    filters.status !== "all",
    filters.type !== "all",
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
          {/* Status */}
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

          {/* Facility Type */}
          <div className="space-y-2">
            <Label htmlFor="type">{t('filters.labels.type')}</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.placeholders.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.options.type.all')}</SelectItem>
                <SelectItem value="shipper">{t('filters.options.type.shipper')}</SelectItem>
                <SelectItem value="receiver">{t('filters.options.type.receiver')}</SelectItem>
                <SelectItem value="both">{t('filters.options.type.both')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
