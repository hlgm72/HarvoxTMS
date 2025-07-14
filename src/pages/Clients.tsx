import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Grid, List, Building2, Users, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { ClientsList } from "@/components/clients/ClientsList";
import { ClientsGrid } from "@/components/clients/ClientsGrid";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { useClients } from "@/hooks/useClients";

export default function Clients() {
  const { t } = useTranslation(['common', 'fleet']);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    location: "",
    hasLogo: "all",
    hasAlias: "all",
    hasNotes: "all", 
    dateRange: "all",
    emailDomain: "",
  });

  const { data: clients = [], isLoading } = useClients();

  // Filter clients based on search and filters
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email_domain?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === "all" || 
      (filters.status === "active" && client.is_active) ||
      (filters.status === "inactive" && !client.is_active);

    const matchesLocation = filters.location === "" ||
      client.address?.toLowerCase().includes(filters.location.toLowerCase());

    const matchesEmailDomain = filters.emailDomain === "" ||
      client.email_domain?.toLowerCase().includes(filters.emailDomain.toLowerCase());

    const matchesHasLogo = filters.hasLogo === "all" ||
      (filters.hasLogo === "yes" && client.logo_url) ||
      (filters.hasLogo === "no" && !client.logo_url);

    const matchesHasAlias = filters.hasAlias === "all" ||
      (filters.hasAlias === "yes" && client.alias) ||
      (filters.hasAlias === "no" && !client.alias);

    const matchesHasNotes = filters.hasNotes === "all" ||
      (filters.hasNotes === "yes" && client.notes) ||
      (filters.hasNotes === "no" && !client.notes);

    const matchesDateRange = (() => {
      if (filters.dateRange === "all") return true;
      
      const clientDate = new Date(client.created_at);
      const now = new Date();
      
      switch (filters.dateRange) {
        case "today":
          return clientDate.toDateString() === now.toDateString();
        case "week":
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return clientDate >= oneWeekAgo;
        case "month":
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return clientDate >= oneMonthAgo;
        case "quarter":
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return clientDate >= threeMonthsAgo;
        case "year":
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return clientDate >= oneYearAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesLocation && 
           matchesEmailDomain && matchesHasLogo && matchesHasAlias && 
           matchesHasNotes && matchesDateRange;
  });

  // Calculate stats
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.is_active).length,
    inactive: clients.filter(c => !c.is_active).length,
    // These would come from loads data in a real implementation
    totalRevenue: 0,
    activeLoads: 0
  };

  const breadcrumbs = [
    { label: "Gestión de Clientes" }
  ];

  return (
    <Layout>
      <PageToolbar
        icon={Building2}
        title="Gestión de Clientes"
        subtitle="Administra tus clientes y brokers de carga"
        actions={
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
        viewToggle={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-6 p-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} activos, {stats.inactive} inactivos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.active / stats.total) * 100 || 0).toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargas Activas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.activeLoads}</div>
              <p className="text-xs text-muted-foreground">
                En progreso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ClientFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            open={showFilters}
            onOpenChange={setShowFilters}
          />
        </div>

        {/* Clients List/Grid */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Cargando clientes...</div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || Object.values(filters).some(f => f !== "all" && f !== "") 
                    ? "No se encontraron clientes con los filtros aplicados"
                    : "Comienza agregando tu primer cliente"
                  }
                </p>
                {!searchTerm && Object.values(filters).every(f => f === "all" || f === "") && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Cliente
                  </Button>
                )}
              </div>
            ) : (
              <>
                {viewMode === "list" ? (
                  <ClientsList clients={filteredClients} />
                ) : (
                  <ClientsGrid clients={filteredClients} />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Client Dialog */}
        <CreateClientDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </Layout>
  );
}