import React from 'react';
import { Button } from '@/components/ui/button';
import { useRecalculateUserPeriod } from '@/hooks/useRecalculateUserPeriod';
import { RefreshCw } from 'lucide-react';
import { useFleetNotifications } from '@/components/notifications';

interface RecalculatePeriodButtonProps {
  periodId: string;
  userId: string;
  label?: string;
}

export function RecalculatePeriodButton({ 
  periodId, 
  userId, 
  label = "Recalculate" 
}: RecalculatePeriodButtonProps) {
  const { mutate: recalculate, isPending } = useRecalculateUserPeriod();
  const { showSuccess, showError } = useFleetNotifications();

  const handleRecalculate = () => {
    recalculate({ 
      userId, 
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