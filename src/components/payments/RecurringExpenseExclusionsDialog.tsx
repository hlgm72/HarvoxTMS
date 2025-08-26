import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarDays, DollarSign, Minus, Plus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDateOnly, formatCurrency } from "@/lib/dateFormatting";
import { usePaymentPeriodsForExclusion, useExcludeRecurringExpense, useRestoreRecurringExpense } from "@/hooks/useRecurringExpenseExclusions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecurringExpenseExclusionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    user_id: string;
    amount: string;
    expense_types?: { name: string };
    driver_profile?: { first_name: string; last_name: string };
    frequency: string;
    month_week?: number;
  } | null;
}

export const RecurringExpenseExclusionsDialog = ({
  isOpen,
  onClose,
  template
}: RecurringExpenseExclusionsDialogProps) => {
  const [excludingPeriod, setExcludingPeriod] = useState<any>(null);
  const [restoringPeriod, setRestoringPeriod] = useState<any>(null);
  const [exclusionReason, setExclusionReason] = useState("");

  const { data: periods = [], isLoading } = usePaymentPeriodsForExclusion(
    template?.user_id || '',
    template?.id || ''
  );

  const excludeMutation = useExcludeRecurringExpense();
  const restoreMutation = useRestoreRecurringExpense();

  const handleExclude = (period: any) => {
    setExcludingPeriod(period);
    setExclusionReason("");
  };

  const handleRestore = (period: any) => {
    setRestoringPeriod(period);
  };

  const confirmExclude = () => {
    if (!excludingPeriod || !template) return;

    excludeMutation.mutate({
      userId: template.user_id,
      templateId: template.id,
      periodId: excludingPeriod.id,
      reason: exclusionReason.trim() || undefined
    }, {
      onSuccess: () => {
        setExcludingPeriod(null);
        setExclusionReason("");
      }
    });
  };

  const confirmRestore = () => {
    if (!restoringPeriod || !template) return;

    restoreMutation.mutate({
      userId: template.user_id,
      templateId: template.id,
      periodId: restoringPeriod.id
    }, {
      onSuccess: () => {
        setRestoringPeriod(null);
      }
    });
  };

  const getFrequencyLabel = (frequency: string, monthWeek?: number) => {
    switch (frequency) {
      case 'weekly':
        return 'Semanal';
      case 'biweekly':
        return 'Quincenal';
      case 'monthly':
        const weekLabels = {
          1: 'Primera semana',
          2: 'Segunda semana',
          3: 'Tercera semana',
          4: 'Cuarta semana',
          5: 'Última semana'
        };
        return `Mensual - ${weekLabels[monthWeek as keyof typeof weekLabels] || 'Mensual'}`;
      default:
        return 'Mensual';
    }
  };

  if (!template) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Gestionar Exclusiones de Deducción
            </DialogTitle>
            <DialogDescription>
              Excluir o restaurar esta deducción recurrente en períodos específicos
            </DialogDescription>
          </DialogHeader>

          {/* Información de la plantilla */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Detalles de la Deducción
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Usuario:</span>
                  <div className="font-medium">
                    {template.driver_profile?.first_name} {template.driver_profile?.last_name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Monto:</span>
                  <div className="font-medium text-primary">
                    {formatCurrency(parseFloat(template.amount || '0'))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <div className="font-medium">
                    {template.expense_types?.name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Frecuencia:</span>
                  <div className="font-medium">
                    {getFrequencyLabel(template.frequency, template.month_week)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Lista de períodos */}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Períodos de Pago Disponibles</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Cargando períodos...</div>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay períodos abiertos disponibles</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {periods.map((period) => (
                    <Card key={period.id} className={`transition-colors ${
                      period.is_excluded ? 'border-amber-200 bg-amber-50/50' : 'border-green-200 bg-green-50/50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {period.is_excluded ? (
                              <XCircle className="h-5 w-5 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                            <div>
                              <div className="font-medium">
                                {formatDateOnly(period.period_start_date)} - {formatDateOnly(period.period_end_date)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Período #{period.id.slice(-8).toUpperCase()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={period.is_excluded ? "secondary" : "default"}>
                              {period.is_excluded ? 'Excluida' : 'Activa'}
                            </Badge>
                            
                            {period.is_excluded ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(period)}
                                disabled={restoreMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Restaurar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExclude(period)}
                                disabled={excludeMutation.isPending}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <Minus className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para excluir */}
      <AlertDialog open={!!excludingPeriod} onOpenChange={() => setExcludingPeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-amber-600" />
              ¿Excluir deducción del período?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Esta acción excluirá la deducción recurrente del período seleccionado. 
                  No se generará ninguna instancia de deducción para este período.
                </p>
                
                {excludingPeriod && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="text-sm">
                      <strong>Período:</strong> {formatDateOnly(excludingPeriod.period_start_date)} - {formatDateOnly(excludingPeriod.period_end_date)}
                    </div>
                    <div className="text-sm mt-1">
                      <strong>Monto:</strong> {formatCurrency(parseFloat(template?.amount || '0'))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="exclusion-reason">Razón de exclusión (opcional)</Label>
                  <Textarea
                    id="exclusion-reason"
                    placeholder="Ej: Usuario en vacaciones, ajuste temporal, etc..."
                    value={exclusionReason}
                    onChange={(e) => setExclusionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmExclude}
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={excludeMutation.isPending}
            >
              {excludeMutation.isPending ? "Excluyendo..." : "Excluir del Período"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para restaurar */}
      <AlertDialog open={!!restoringPeriod} onOpenChange={() => setRestoringPeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              ¿Restaurar deducción al período?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Esta acción restaurará la deducción recurrente al período seleccionado. 
                  Se creará una nueva instancia de deducción para este período.
                </p>
                
                {restoringPeriod && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm">
                      <strong>Período:</strong> {formatDateOnly(restoringPeriod.period_start_date)} - {formatDateOnly(restoringPeriod.period_end_date)}
                    </div>
                    <div className="text-sm mt-1">
                      <strong>Monto:</strong> {formatCurrency(parseFloat(template?.amount || '0'))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restaurando..." : "Restaurar al Período"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};