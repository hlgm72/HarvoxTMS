import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useCleanupPeriod } from "@/hooks/useCleanupPeriod";

interface CleanupPeriodDialogProps {
  trigger?: React.ReactNode;
}

export function CleanupPeriodDialog({ trigger }: CleanupPeriodDialogProps) {
  const { t } = useTranslation('payments');
  const [isOpen, setIsOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState(35);
  const [yearNumber, setYearNumber] = useState(2025);
  const cleanupMutation = useCleanupPeriod();

  const handleCleanup = async () => {
    try {
      await cleanupMutation.mutateAsync({ 
        weekNumber, 
        yearNumber 
      });
      setIsOpen(false);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const defaultTrigger = (
    <Button variant="destructive" size="sm" className="gap-2">
      <Trash2 className="h-4 w-4" />
      Limpiar Período
    </Button>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Limpiar Período y Datos Huérfanos</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Esta operación eliminará permanentemente el período especificado y todas las deducciones asociadas.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="week">Semana</Label>
              <Input
                id="week"
                type="number"
                min="1"
                max="53"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 35)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={yearNumber}
                onChange={(e) => setYearNumber(parseInt(e.target.value) || 2025)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Advertencia
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Se eliminará el período de pago de la semana {weekNumber}/{yearNumber}</li>
              <li>• Se eliminarán todos los cálculos de conductores</li>
              <li>• Se eliminarán todas las deducciones asociadas</li>
              <li>• Esta acción NO se puede deshacer</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cleanupMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCleanup}
            disabled={cleanupMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cleanupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpiando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Confirmar Limpieza
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}