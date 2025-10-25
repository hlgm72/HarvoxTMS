import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Grid3X3, List, Building2, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useFacilities } from "@/hooks/useFacilities";
import { FacilitiesList } from "@/components/facilities/FacilitiesList";
import { FacilitiesGrid } from "@/components/facilities/FacilitiesGrid";
import { FacilityFilters } from "@/components/facilities/FacilityFilters";
import { CreateFacilityDialog } from "@/components/facilities/CreateFacilityDialog";

export default function Facilities() {
  const { t } = useTranslation('facilities');
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    state: "",
    city: "",
  });

  const { data: facilities = [], isLoading } = useFacilities();

  // Filter and search logic
  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      // Search filter
      const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.address.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = filters.status === "all" || 
        (filters.status === "active" && facility.is_active) ||
        (filters.status === "inactive" && !facility.is_active);

      // Type filter
      const matchesType = filters.type === "all" || facility.facility_type === filters.type;

      // State filter
      const matchesState = !filters.state || 
        facility.state.toLowerCase().includes(filters.state.toLowerCase());

      // City filter
      const matchesCity = !filters.city || 
        facility.city.toLowerCase().includes(filters.city.toLowerCase());

      return matchesSearch && matchesStatus && matchesType && matchesState && matchesCity;
    });
  }, [facilities, searchTerm, filters]);

  // Statistics
  const stats = useMemo(() => {
    const total = facilities.length;
    const shippers = facilities.filter(f => f.facility_type === 'shipper' || f.facility_type === 'both').length;
    const receivers = facilities.filter(f => f.facility_type === 'receiver' || f.facility_type === 'both').length;
    const active = facilities.filter(f => f.is_active).length;

    return { total, shippers, receivers, active };
  }, [facilities]);

  const hasActiveFilters = 
    filters.status !== "all" || 
    filters.type !== "all" ||
    filters.state !== "" ||
    filters.city !== "";

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <PageToolbar
          title={t('page_title')}
          subtitle={t('page_subtitle')}
          actions={
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('actions.new_facility')}
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
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="flex-1 space-y-4 p-4 md:p-6 overflow-auto">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.shippers')}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.shippers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.receivers')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.receivers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.active')}</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder={t('search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <FacilityFilters
              filters={filters}
              onFiltersChange={setFilters}
              open={showFilters}
              onOpenChange={setShowFilters}
            />
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                onClick={() => setFilters({ status: "all", type: "all", state: "", city: "" })}
              >
                {t('actions.clear_filters')}
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredFacilities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || hasActiveFilters ? t('empty_state.no_results') : t('empty_state.no_facilities')}
                </h3>
                {!searchTerm && !hasActiveFilters && (
                  <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('actions.new_facility')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <FacilitiesList facilities={filteredFacilities} />
          ) : (
            <FacilitiesGrid facilities={filteredFacilities} />
          )}
        </div>
      </div>

      <CreateFacilityDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </Layout>
  );
}
