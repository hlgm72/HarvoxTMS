import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Grid, List, Building2, TrendingUp, Package, MapPin } from "lucide-react";
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
      <PageToolbar
        icon={MapPin}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('actions.new_facility')}
            </Button>
          </div>
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
      <div className="flex-1 space-y-6 p-2 md:p-4">

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('stats.total')}</CardTitle>
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} {t('status.active')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('stats.shippers')}</CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.shippers}</div>
              <p className="text-xs text-muted-foreground">
                {t('facility_type.shipper')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('stats.receivers')}</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.receivers}</div>
              <p className="text-xs text-muted-foreground">
                {t('facility_type.receiver')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('stats.active')}</CardTitle>
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {t('status.active')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <FacilityFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            open={showFilters}
            onOpenChange={setShowFilters}
          />
        </div>

        {/* Facilities List/Grid */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">{t('messages.loading')}</div>
              </div>
            ) : filteredFacilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || hasActiveFilters ? t('empty_state.no_results') : t('empty_state.no_facilities')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || hasActiveFilters 
                    ? t('empty_state.no_results')
                    : t('empty_state.no_facilities')
                  }
                </p>
                {!searchTerm && !hasActiveFilters && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.new_facility')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {viewMode === "list" ? (
                  <FacilitiesList facilities={filteredFacilities} />
                ) : (
                  <FacilitiesGrid facilities={filteredFacilities} />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Facility Dialog */}
        <CreateFacilityDialog 
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      </div>
    </Layout>
  );
}
