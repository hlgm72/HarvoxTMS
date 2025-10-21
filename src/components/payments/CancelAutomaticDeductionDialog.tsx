import { useState } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

interface CancelAutomaticDeductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  deductionData?: {
    driverName: string;
    expenseType: string;
    amount: number;
    isReactivating?: boolean;
  };
}

export function CancelAutomaticDeductionDialog({
  isOpen,
  onClose,
  onConfirm,
  deductionData
}: CancelAutomaticDeductionDialogProps) {
  const { t } = useTranslation('payments');
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    onConfirm(note);
    setNote(""); // Limpiar el campo después de confirmar
  };

  const handleClose = () => {
    setNote(""); // Limpiar el campo al cerrar
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deductionData?.isReactivating 
              ? t("deductions.cancel_automatic.reactivate_title")
              : t("deductions.cancel_automatic.cancel_title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>
                {deductionData?.isReactivating ? (
                  <>
                    {t("deductions.cancel_automatic.reactivate_description")}
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>{t("deductions.cancel_automatic.reactivate_consequences.status_change")}</li>
                      <li>{t("deductions.cancel_automatic.reactivate_consequences.create_period")}</li>
                      <li>{t("deductions.cancel_automatic.reactivate_consequences.apply_deduction")}</li>
                    </ul>
                  </>
                ) : (
                  <>
                    {t("deductions.cancel_automatic.cancel_description")}
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>{t("deductions.cancel_automatic.cancel_consequences.status_change")}</li>
                      <li>{t("deductions.cancel_automatic.cancel_consequences.recalculate")}</li>
                      <li>{t("deductions.cancel_automatic.cancel_consequences.delete_payroll")}</li>
                    </ul>
                  </>
                )}
              </div>
              
              {deductionData && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div><strong>{t("deductions.cancel_automatic.driver_label")}</strong> {deductionData.driverName}</div>
                  <div><strong>{t("deductions.cancel_automatic.type_label")}</strong> {deductionData.expenseType}</div>
                  <div><strong>{t("deductions.cancel_automatic.amount_label")}</strong> ${deductionData.amount.toFixed(2)}</div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label htmlFor="cancellation-note" className="text-foreground">
                  {deductionData?.isReactivating 
                    ? t("deductions.cancel_automatic.reactivate_reason_label")
                    : t("deductions.cancel_automatic.cancel_reason_label")} 
                  <span className="text-destructive"> {t("deductions.cancel_automatic.cancel_reason_required")}</span>
                </Label>
                <Textarea
                  id="cancellation-note"
                  placeholder={deductionData?.isReactivating 
                    ? t("deductions.cancel_automatic.reactivate_reason_placeholder")
                    : t("deductions.cancel_automatic.cancel_reason_placeholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            {t("deductions.labels.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={deductionData?.isReactivating 
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            disabled={!note.trim()}
          >
            {deductionData?.isReactivating 
              ? t("deductions.cancel_automatic.confirm_reactivate")
              : t("deductions.cancel_automatic.confirm_cancel")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
