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
  };
  onFiltersChange: (filters: { status: string; location: string }) => void;
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
    });
  };

  const hasActiveFilters = filters.status !== "all" || filters.location !== "";

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
              {[filters.status !== "all", filters.location !== ""].filter(Boolean).length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filtros de Clientes</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              placeholder="Ciudad o estado..."
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
            />
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