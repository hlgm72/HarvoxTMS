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
        icon={Wrench}
        title="Gestión de Equipos"
        subtitle={`${equipment?.length || 0} equipos • ${activeCount} activos • ${maintenanceCount} en mantenimiento`}
        actions={
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("equipment.addNew", "Agregar Equipo")}
          </Button>
        }
      />
      
      <div className="p-2 md:p-4 space-y-12">
        {/* Stats Cards */}
        <div className="mb-12">
          <EquipmentStats equipment={equipment} />
        </div>

        {/* Advanced Equipment Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
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
        <div className="mt-16 pt-8 border-t border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
            <div className="py-6">
              <TabsList className="grid w-full grid-cols-2 gap-3 p-2 h-14 bg-muted/50 rounded-lg">
                <TabsTrigger value="equipment" className="gap-3 h-10 text-sm font-medium">
                  <Wrench className="h-4 w-4" />
                  {t("equipment.tabs.equipment", "Equipos")}
                </TabsTrigger>
                <TabsTrigger value="locations" className="gap-3 h-10 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  {t("equipment.tabs.locations", "Ubicaciones")}
                </TabsTrigger>
              </TabsList>
            </div>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-10 mt-8">
            {/* Search and Filters */}
            <Card className="shadow-sm border-2">
              <CardHeader className="pb-8">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder={t("equipment.searchPlaceholder", "Buscar por número, marca, modelo o placa...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="gap-2 h-12 px-6"
                    >
                      <Filter className="h-4 w-4" />
                      {t("common.filters", "Filtros")}
                    </Button>
                    
                    <div className="flex rounded-md border h-12">
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-r-none h-12 px-4"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-l-none h-12 px-4"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {showFilters && (
                  <div className="mt-8 p-8 border rounded-lg bg-muted/30">
                    <EquipmentFilters />
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Equipment List/Grid */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
                  <div className="text-center py-16">
                    <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-lg font-medium mb-3">
                      {searchQuery 
                        ? t("equipment.noResults", "No se encontraron equipos")
                        : t("equipment.noEquipment", "No hay equipos registrados")
                      }
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {searchQuery 
                        ? t("equipment.noResultsDescription", "Intenta ajustar los criterios de búsqueda para encontrar equipos")
                        : t("equipment.noEquipmentDescription", "Comienza agregando el primer vehículo o equipo de tu flota")
                      }
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateDialog(true)} size="lg">
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
          <TabsContent value="locations" className="mt-8">
            <EquipmentLocationMap />
          </TabsContent>
        </Tabs>
        </div>

        {/* Create Equipment Dialog */}
        <CreateEquipmentDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </div>
  );
}