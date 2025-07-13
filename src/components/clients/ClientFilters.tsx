import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

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
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros Inteligentes de Clientes</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">{/* ... keep existing code */}
          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="status">Estado del Cliente</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              placeholder="Ciudad, estado o dirección..."
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
            />
          </div>

          {/* Dominio de Email */}
          <div className="space-y-2">
            <Label htmlFor="emailDomain">Dominio de Email</Label>
            <Input
              id="emailDomain"
              placeholder="ejemplo.com"
              value={filters.emailDomain}
              onChange={(e) => handleFilterChange("emailDomain", e.target.value)}
            />
          </div>

          {/* Tiene Logo */}
          <div className="space-y-2">
            <Label htmlFor="hasLogo">Logo</Label>
            <Select
              value={filters.hasLogo}
              onValueChange={(value) => handleFilterChange("hasLogo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por logo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Con logo</SelectItem>
                <SelectItem value="no">Sin logo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiene Alias */}
          <div className="space-y-2">
            <Label htmlFor="hasAlias">Alias/Nombre Corto</Label>
            <Select
              value={filters.hasAlias}
              onValueChange={(value) => handleFilterChange("hasAlias", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por alias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Con alias</SelectItem>
                <SelectItem value="no">Sin alias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiene Notas */}
          <div className="space-y-2">
            <Label htmlFor="hasNotes">Notas/Comentarios</Label>
            <Select
              value={filters.hasNotes}
              onValueChange={(value) => handleFilterChange("hasNotes", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por notas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Con notas</SelectItem>
                <SelectItem value="no">Sin notas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Creación */}
          <div className="space-y-2">
            <Label htmlFor="dateRange">Fecha de Creación</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Este año</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters} className="flex-1">
              Limpiar Filtros
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}