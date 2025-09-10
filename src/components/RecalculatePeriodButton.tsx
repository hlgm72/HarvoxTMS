import React from 'react';
import { Button } from '@/components/ui/button';
import { useRecalculateDriverPeriod } from '@/hooks/useRecalculateDriverPeriod';
import { RefreshCw } from 'lucide-react';
import { useFleetNotifications } from '@/components/notifications';

interface RecalculatePeriodButtonProps {
  periodId: string;
  driverUserId: string;
  label?: string;
}

export function RecalculatePeriodButton({ 
  periodId, 
  driverUserId, 
  label = "Recalculate" 
}: RecalculatePeriodButtonProps) {
  const { mutate: recalculate, isPending } = useRecalculateDriverPeriod();
  const { showSuccess, showError } = useFleetNotifications();

  const handleRecalculate = () => {
    recalculate({ 
      driverUserId, 
      paymentPeriodId: periodId 
    }, {
      onSuccess: () => {
        showSuccess('Period recalculated successfully');
      },
      onError: (error) => {
        showError(`Error recalculating period: ${error.message}`);
      }
    });
  };

  return (
    <Button 
      onClick={handleRecalculate}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Recalculating...' : label}
    </Button>
  );
}