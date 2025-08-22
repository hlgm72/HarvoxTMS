import { useState } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { UnifiedOtherIncomeForm } from "@/components/payments/UnifiedOtherIncomeForm";
import { Calculator, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function AdditionalPayments() {
  const { isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const { t } = useTranslation();
  const [isCreateIncomeDialogOpen, setIsCreateIncomeDialogOpen] = useState(false);

  const handleAddIncome = () => {
    setIsCreateIncomeDialogOpen(true);
  };

  return (
    <>
      <PageToolbar 
        icon={Calculator}
        title={t('additional_payments.title')}
        subtitle={t('additional_payments.subtitle')}
        actions={
          <div className="flex gap-2">
            <Button onClick={handleAddIncome} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('additional_payments.actions.add_income')}
            </Button>
          </div>
        }
      />

      <div className="p-2 md:p-4 space-y-6">
        {/* Sección unificada de ingresos adicionales */}
        <OtherIncomeSection hideAddButton={true} />
      </div>
      {/* Dialog para crear ingreso */}
      <Dialog open={isCreateIncomeDialogOpen} onOpenChange={setIsCreateIncomeDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{t('additional_payments.dialogs.new_income_title')}</DialogTitle>
          </DialogHeader>
          <UnifiedOtherIncomeForm 
            onClose={() => setIsCreateIncomeDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    
    </>
  );
}