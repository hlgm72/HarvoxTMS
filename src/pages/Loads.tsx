import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsList } from "@/components/loads/LoadsList";
import { LoadFilters } from "@/components/loads/LoadFilters";
import { CreateLoadDialog } from "@/components/loads/CreateLoadDialog";

export default function Loads() {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    driver: "all", 
    broker: "all",
    dateRange: { from: undefined, to: undefined }
  });

  return (
    <>
      <PageToolbar 
        title={t("loads.title", "Gestión de Cargas")}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("loads.create.button", "Nueva Carga")}
          </Button>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        <LoadFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />

        <LoadsList filters={filters} />

        <CreateLoadDialog 
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      </div>
    </>
  );
}