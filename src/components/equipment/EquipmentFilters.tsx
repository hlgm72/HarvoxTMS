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
  const { t } = useTranslation(['common', 'equipment']);
  const [filters, setFilters] = useState<EquipmentFilters>({
    status: [],
    equipmentType: [],
    fuelType: [],
    hasExpiring: false,
  });

  const statusOptions = [
    { value: "active", label: t("equipment.status.active", "Activo") },
    { value: "maintenance", label: t("equipment.status.maintenance", "Mantenimiento") },
    { value: "inactive", label: t("equipment.status.inactive", "Inactivo") },
  ];

  const equipmentTypeOptions = [
    { value: "truck", label: t("equipment.type.truck", "Camión") },
    { value: "trailer", label: t("equipment.type.trailer", "Remolque") },
    { value: "van", label: t("equipment.type.van", "Camioneta") },
    { value: "car", label: t("equipment.type.car", "Automóvil") },
  ];

  const fuelTypeOptions = [
    { value: "diesel", label: t("equipment.fuel.diesel", "Diésel") },
    { value: "gasoline", label: t("equipment.fuel.gasoline", "Gasolina") },
    { value: "hybrid", label: t("equipment.fuel.hybrid", "Híbrido") },
    { value: "electric", label: t("equipment.fuel.electric", "Eléctrico") },
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
        <h3 className="text-lg font-semibold">{t("equipment.filters.title", "Filtros")}</h3>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-3 w-3" />
            {t("common.clearFilters", "Limpiar filtros")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Estado */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t("equipment.filters.status", "Estado")}
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
            {t("equipment.filters.type", "Tipo de Equipo")}
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
            {t("equipment.filters.fuel", "Combustible")}
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
            {t("equipment.filters.special", "Opciones Especiales")}
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
                {t("equipment.filters.expiring", "Con documentos por vencer")}
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}