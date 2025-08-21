import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EquipmentFiltersProps {
  onFiltersChange?: (filters: EquipmentFilters) => void;
}

export interface EquipmentFilters {
  status: string[];
  equipmentType: string[];
  fuelType: string[];
  hasExpiring: boolean;
}

export function EquipmentFilters({ onFiltersChange }: EquipmentFiltersProps) {
  const { t } = useTranslation('equipment');
  const { t: tCommon } = useTranslation('common');
  const [filters, setFilters] = useState<EquipmentFilters>({
    status: [],
    equipmentType: [],
    fuelType: [],
    hasExpiring: false,
  });

  const statusOptions = [
    { value: "active", label: t("status.active") },
    { value: "maintenance", label: t("status.maintenance") },
    { value: "inactive", label: t("status.inactive") },
  ];

  const equipmentTypeOptions = [
    { value: "truck", label: t("type.truck") },
    { value: "trailer", label: t("type.trailer") },
    { value: "van", label: t("type.van") },
    { value: "car", label: t("type.car") },
  ];

  const fuelTypeOptions = [
    { value: "diesel", label: t("fuel.diesel") },
    { value: "gasoline", label: t("fuel.gasoline") },
    { value: "hybrid", label: t("fuel.hybrid") },
    { value: "electric", label: t("fuel.electric") },
  ];

  const handleFilterChange = (category: keyof EquipmentFilters, value: any) => {
    const newFilters = { ...filters, [category]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleArrayFilterChange = (category: "status" | "equipmentType" | "fuelType", value: string, checked: boolean) => {
    const currentArray = filters[category];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleFilterChange(category, newArray);
  };

  const clearFilters = () => {
    const clearedFilters: EquipmentFilters = {
      status: [],
      equipmentType: [],
      fuelType: [],
      hasExpiring: false,
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("filters.title")}</h3>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-3 w-3" />
            {tCommon("clearFilters")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Estado */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t("filters.status")}
          </Label>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.status.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleArrayFilterChange("status", option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`status-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de Equipo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t("filters.type")}
          </Label>
          <div className="space-y-2">
            {equipmentTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${option.value}`}
                  checked={filters.equipmentType.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleArrayFilterChange("equipmentType", option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`type-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de Combustible */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t("filters.fuel")}
          </Label>
          <div className="space-y-2">
            {fuelTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`fuel-${option.value}`}
                  checked={filters.fuelType.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleArrayFilterChange("fuelType", option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`fuel-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones Especiales */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t("filters.special")}
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasExpiring"
                checked={filters.hasExpiring}
                onCheckedChange={(checked) =>
                  handleFilterChange("hasExpiring", checked as boolean)
                }
              />
              <Label
                htmlFor="hasExpiring"
                className="text-sm font-normal cursor-pointer"
              >
                {t("filters.expiring")}
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}