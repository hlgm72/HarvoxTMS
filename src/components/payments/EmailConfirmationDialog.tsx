import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";

interface EmailConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  recipientEmail: string;
  driverName: string;
  isSending: boolean;
}

export function EmailConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  recipientEmail,
  driverName,
  isSending
}: EmailConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Confirmar Envío por Email
          </DialogTitle>
          <DialogDescription>
            ¿Deseas enviar el reporte de pago por email?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Conductor:</strong> {driverName}
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border">
              <Mail className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Dirección de destino:</p>
                <p className="text-sm text-muted-foreground">{recipientEmail}</p>
              </div>
            </div>
          </div>
          
          {!recipientEmail && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                No se encontró dirección de email para este conductor
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!recipientEmail || isSending}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            {isSending ? "Enviando..." : "Enviar Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}