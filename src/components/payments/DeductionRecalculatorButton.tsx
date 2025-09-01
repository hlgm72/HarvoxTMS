import { Button } from "@/components/ui/button";
import { Calculator, AlertTriangle } from "lucide-react";
import { useRecalculateDeductions, useDeductionValidation } from "@/hooks/useRecalculateDeductions";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeductionRecalculatorButtonProps {
  periodId: string;
  periodStartDate: string;
  periodEndDate: string;
  driverUserId?: string;
  disabled?: boolean;
}

export const DeductionRecalculatorButton = ({
  periodId,
  periodStartDate,
  periodEndDate,
  driverUserId,
  disabled = false
}: DeductionRecalculatorButtonProps) => {
  const [validationData, setValidationData] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  const recalculateMutation = useRecalculateDeductions();
  const validationMutation = useDeductionValidation();

  const handleValidation = async () => {
    try {
      const result = await validationMutation.mutateAsync({
        periodStartDate,
        periodEndDate
      });
      setValidationData(result);
      setShowValidation(true);
    } catch (error) {
      console.error('Error validando deducciones:', error);
    }
  };

  const handleRecalculate = async () => {
    await recalculateMutation.mutateAsync({ 
      periodId, 
      driverUserId 
    });
    setShowValidation(false);
    setValidationData(null);
  };

  const hasErrors = validationData?.errors?.length > 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleValidation}
        disabled={disabled || validationMutation.isPending}
        className="flex items-center gap-2"
      >
        <Calculator className="h-4 w-4" />
        Validar Deducciones
      </Button>

      {showValidation && (
        <AlertDialog open={showValidation} onOpenChange={setShowValidation}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {hasErrors && <AlertTriangle className="h-5 w-5 text-destructive" />}
                Validación de Deducciones - Semana 35
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant={hasErrors ? "destructive" : "secondary"}>
                      {validationData?.validation?.length || 0} cargas analizadas
                    </Badge>
                    <Badge variant={hasErrors ? "destructive" : "secondary"}>
                      {validationData?.errors?.length || 0} errores encontrados
                    </Badge>
                  </div>

                  {hasErrors && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-destructive">
                        ❌ Errores encontrados en deducciones:
                      </h4>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {validationData?.errors?.map((error: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                            <div className="text-sm space-y-1">
                              <div className="font-medium">
                                Carga: ${error.total_amount} - Conductor: {error.driver_user_id}
                              </div>
                              
                              {error.dispatching_discrepancy && (
                                <div className="text-destructive">
                                  • Dispatching: Actual ${error.current_dispatching} vs Correcto ${error.correct_dispatching} 
                                  ({error.dispatching_percentage}%)
                                </div>
                              )}
                              
                              {error.factoring_discrepancy && (
                                <div className="text-destructive">
                                  • Factoring: Actual ${error.current_factoring} vs Correcto ${error.correct_factoring} 
                                  ({error.factoring_percentage}%)
                                </div>
                              )}
                              
                              {error.leasing_discrepancy && (
                                <div className="text-destructive">
                                  • Leasing: Actual ${error.current_leasing} vs Correcto ${error.correct_leasing} 
                                  ({error.leasing_percentage}%)
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasErrors && (
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        ✅ Todas las deducciones están calculadas correctamente.
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              {hasErrors && (
                <AlertDialogAction
                  onClick={handleRecalculate}
                  disabled={recalculateMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {recalculateMutation.isPending ? "Recalculando..." : "Recalcular Deducciones"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};