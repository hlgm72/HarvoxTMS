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
            Cancelar Deducción Automática
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              Está a punto de cancelar una deducción automática. Esta acción:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Eliminará la instancia de deducción</li>
                <li>Recalculará automáticamente el payroll del conductor</li>
                <li>Si el payroll queda sin transacciones, será eliminado</li>
              </ul>
            </div>
            
            {deductionData && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <div><strong>Conductor:</strong> {deductionData.driverName}</div>
                <div><strong>Tipo:</strong> {deductionData.expenseType}</div>
                <div><strong>Monto:</strong> ${deductionData.amount.toFixed(2)}</div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="cancellation-note" className="text-foreground">
                Motivo de cancelación <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancellation-note"
                placeholder="Explique por qué se está cancelando esta deducción automática..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            {t("deductions.labels.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!note.trim()}
          >
            Confirmar Cancelación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
