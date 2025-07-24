import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, DollarSign, Calendar } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { CreateExpenseTemplateDialog } from "@/components/payments/CreateExpenseTemplateDialog";

export default function Deductions() {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // The DeductionsManager will handle the refetch automatically
  };

  return (
    <>
      <PageToolbar 
        icon={DollarSign}
        title={t("deductions.title", "Gestión de Deducciones")}
        subtitle="15 plantillas activas • $2,450 total mensual • 8 conductores afectados"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("deductions.create.button", "Nueva Deducción")}
          </Button>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        <DeductionsManager 
          isCreateDialogOpen={isCreateDialogOpen}
          onCreateDialogChange={setIsCreateDialogOpen}
        />
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Plantilla de Deducción</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla de gasto recurrente para un conductor
            </DialogDescription>
          </DialogHeader>
          <CreateExpenseTemplateDialog 
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}