import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FilterX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { formatShortDate, formatMediumDate } from '@/lib/dateFormatting';
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "created", label: "Creada" },
  { value: "route_planned", label: "Ruta Planificada" },
  { value: "assigned", label: "Asignada" },
  { value: "in_transit", label: "En Tránsito" },
  { value: "delivered", label: "Entregada" },
  { value: "completed", label: "Completada" }
];

// Mock data - will be replaced with real data
const driverOptions = [
  { value: "all", label: "Todos los conductores" },
  { value: "driver1", label: "María García" },
  { value: "driver2", label: "Carlos Rodríguez" },
  { value: "driver3", label: "Ana Martínez" }
];

const brokerOptions = [
  { value: "all", label: "Todos los brokers" },
  { value: "broker1", label: "ABC Logistics" },
  { value: "broker2", label: "XYZ Freight" },
  { value: "broker3", label: "Global Transport" }
];

interface LoadFiltersProps {
  filters: {
    status: string;
    driver: string;
    broker: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  onFiltersChange: (filters: any) => void;
}

export function LoadFilters({ filters, onFiltersChange }: LoadFiltersProps) {
  const { t } = useTranslation();

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      driver: "all",
      broker: "all",
      dateRange: { from: undefined, to: undefined }
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
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

          {/* Driver Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Conductor</label>
            <Select 
              value={filters.driver} 
              onValueChange={(value) => handleFilterChange("driver", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conductor" />
              </SelectTrigger>
              <SelectContent>
                {driverOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Broker Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Broker / Cliente</label>
            <Select 
              value={filters.broker} 
              onValueChange={(value) => handleFilterChange("broker", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar broker" />
              </SelectTrigger>
              <SelectContent>
                {brokerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de Pickup</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {formatShortDate(filters.dateRange.from)} -{" "}
                        {formatShortDate(filters.dateRange.to)}
                      </>
                    ) : (
                      formatMediumDate(filters.dateRange.from)
                    )
                  ) : (
                    "Seleccionar fechas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={filters.dateRange}
                  onSelect={(range) => handleFilterChange("dateRange", range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Filters Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium invisible">Acciones</label>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full"
            >
              <FilterX className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}