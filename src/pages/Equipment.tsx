import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Filter, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { EquipmentGrid } from "@/components/equipment/EquipmentGrid";
import { CreateEquipmentDialog } from "@/components/equipment/CreateEquipmentDialog";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EquipmentStats } from "@/components/equipment/EquipmentStats";
import { useEquipment } from "@/hooks/useEquipment";

export default function Equipment() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  const { equipment, isLoading, error } = useEquipment();

  const filteredEquipment = equipment?.filter(item =>
    item.equipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.license_plate?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("equipment.title", "Gestión de Equipos")}
          </h1>
          <p className="text-muted-foreground">
            {t("equipment.subtitle", "Administra todos los vehículos y equipos de tu flota")}
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("equipment.addNew", "Agregar Equipo")}
        </Button>
      </div>

      {/* Stats Cards */}
      <EquipmentStats equipment={equipment} />

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("equipment.searchPlaceholder", "Buscar por número, marca, modelo o placa...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {t("common.filters", "Filtros")}
              </Button>
              
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <EquipmentFilters />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Equipment List/Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">{t("common.loading", "Cargando...")}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">{t("common.error", "Error al cargar los datos")}</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  {searchQuery 
                    ? t("equipment.noResults", "No se encontraron equipos con ese criterio de búsqueda")
                    : t("equipment.noEquipment", "No hay equipos registrados")
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("equipment.addFirst", "Agregar primer equipo")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {viewMode === "list" ? (
                <EquipmentList equipment={filteredEquipment} />
              ) : (
                <EquipmentGrid equipment={filteredEquipment} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Equipment Dialog */}
      <CreateEquipmentDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}