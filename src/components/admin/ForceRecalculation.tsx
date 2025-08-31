import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePaymentPeriodSummary } from '@/hooks/usePaymentPeriodSummary';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ForceRecalculationProps {
  periodId: string;
  driverName: string;
}

export function ForceRecalculation({ periodId, driverName }: ForceRecalculationProps) {
  const [isForcing, setIsForcing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { refetch } = usePaymentPeriodSummary(periodId);

  const handleForceRecalculation = async () => {
    setIsForcing(true);
    setStatus('idle');
    
    try {
      // El hook usePaymentPeriodSummary ya ejecuta verify_and_recalculate_company_payments
      // Solo necesitamos forzar un refetch para activar el recálculo
      await refetch();
      setStatus('success');
    } catch (error) {
      console.error('Error forzando recálculo:', error);
      setStatus('error');
    } finally {
      setIsForcing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
      <div className="flex-1">
        <p className="text-sm font-medium">
          Recálculo de deducciones - {driverName}
        </p>
        <p className="text-xs text-muted-foreground">
          Período: {periodId}
        </p>
      </div>
      
      <Button 
        onClick={handleForceRecalculation}
        disabled={isForcing}
        size="sm"
        variant={status === 'success' ? 'default' : 'outline'}
      >
        {isForcing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        {status === 'success' && <CheckCircle className="h-4 w-4 mr-1" />}
        {status === 'error' && <AlertCircle className="h-4 w-4 mr-1" />}
        
        {isForcing ? 'Recalculando...' : 
         status === 'success' ? 'Completado' :
         status === 'error' ? 'Error' : 'Forzar Recálculo'}
      </Button>
    </div>
  );
}