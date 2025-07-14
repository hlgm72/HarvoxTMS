import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Filter, Grid3X3, List, Wrench, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { EquipmentGrid } from "@/components/equipment/EquipmentGrid";
import { EquipmentOverviewCard } from "@/components/equipment/EquipmentOverviewCard";
import { EquipmentLocationCard } from "@/components/equipment/EquipmentLocationCard";
import { MaintenanceScheduleCard } from "@/components/equipment/MaintenanceScheduleCard";
import { CreateEquipmentDialog } from "@/components/equipment/CreateEquipmentDialog";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { EquipmentStats } from "@/components/equipment/EquipmentStats";
import { useEquipment } from "@/hooks/useEquipment";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { EquipmentLocationMap } from "@/components/equipment/EquipmentLocationMap";

export default function Equipment() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState("equipment");
  
  const { equipment, isLoading, error } = useEquipment();

  const filteredEquipment = equipment?.filter(item =>
    item.equipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.license_plate?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Mock data para las cards avanzadas
  const mockEquipmentData = equipment?.map(item => ({
    id: item.id,
    equipmentNumber: item.equipment_number,
    make: item.make || "Unknown",
    model: item.model || "Unknown",
    status: item.status as "active" | "maintenance" | "inactive",
    mileage: item.current_mileage,
    nextMaintenance: "Próximo: 2024-08-15"
  })) || [];

  const mockLocationData = equipment?.slice(0, 5).map((item, index) => ({
    id: item.id,
    equipmentNumber: item.equipment_number,
    location: index % 3 === 0 ? "Houston, TX" : index % 3 === 1 ? "Dallas, TX" : "Austin, TX",
    lastUpdate: "2 min ago",
    status: (index % 3 === 0 ? "moving" : index % 3 === 1 ? "parked" : "offline") as "moving" | "parked" | "offline"
  })) || [];

  const mockMaintenanceData = equipment?.slice(0, 4).map((item, index) => ({
    id: item.id,
    equipmentNumber: item.equipment_number,
    maintenanceType: index % 3 === 0 ? "Inspección Anual" : index % 3 === 1 ? "Cambio de Aceite" : "Revisión General",
    dueDate: index % 2 === 0 ? "2024-08-15" : "2024-08-22",
    priority: (index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low") as "high" | "medium" | "low",
    overdue: index === 0
  })) || [];

  const activeCount = equipment?.filter(item => item.status === 'active').length || 0;
  const maintenanceCount = equipment?.filter(item => item.status === 'maintenance').length || 0;
  const onlineCount = Math.floor((equipment?.length || 0) * 0.8);
  const movingCount = Math.floor((equipment?.length || 0) * 0.3);
  const overdueCount = mockMaintenanceData.filter(item => item.overdue).length;
  const thisWeekCount = Math.floor(mockMaintenanceData.length * 0.6);

  return (
    <div>
      <PageToolbar 
        breadcrumbs={[
          { label: "Equipos" }
        ]}
        title="Gestión de Equipos"
        actions={
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("equipment.addNew", "Agregar Equipo")}
          </Button>
        }
      />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <EquipmentStats equipment={equipment} />

        {/* Advanced Equipment Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <EquipmentOverviewCard
            totalEquipment={equipment?.length || 0}
            activeCount={activeCount}
            maintenanceCount={maintenanceCount}
            equipment={mockEquipmentData}
          />
          <EquipmentLocationCard
            locations={mockLocationData}
            onlineCount={onlineCount}
            movingCount={movingCount}
          />
          <MaintenanceScheduleCard
            upcomingMaintenance={mockMaintenanceData}
            overdueCount={overdueCount}
            thisWeekCount={thisWeekCount}
          />
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="equipment" className="gap-2">
              <Wrench className="h-4 w-4" />
              {t("equipment.tabs.equipment", "Equipos")}
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              {t("equipment.tabs.locations", "Ubicaciones")}
            </TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
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
                  <div className="text-center py-12">
                    <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {searchQuery 
                        ? t("equipment.noResults", "No se encontraron equipos")
                        : t("equipment.noEquipment", "No hay equipos registrados")
                      }
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery 
                        ? t("equipment.noResultsDescription", "Intenta ajustar los criterios de búsqueda para encontrar equipos")
                        : t("equipment.noEquipmentDescription", "Comienza agregando el primer vehículo o equipo de tu flota")
                      }
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("equipment.addFirst", "Agregar Primer Equipo")}
                      </Button>
                    )}
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
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <EquipmentLocationMap />
          </TabsContent>
        </Tabs>

        {/* Create Equipment Dialog */}
        <CreateEquipmentDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </div>
  );
}