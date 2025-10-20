import { useState } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{t('additional_payments.dialogs.new_income_title')}</DialogTitle>
            <DialogDescription>
              {t('additional_payments.dialogs.new_income_description')}
            </DialogDescription>
          </div>
          <div className="overflow-y-auto flex-1 p-6 bg-white">
            <UnifiedOtherIncomeForm 
              onClose={() => setIsCreateIncomeDialogOpen(false)}
              showButtons={false}
            />
          </div>
          <div className="flex gap-2 p-4 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={() => setIsCreateIncomeDialogOpen(false)} className="flex-1">
              {t('common:form.cancel')}
            </Button>
            <Button 
              type="submit"
              form="other-income-form"
              className="flex-1"
            >
              {t('common:form.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    
    </>
  );
}