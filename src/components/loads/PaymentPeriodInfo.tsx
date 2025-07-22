import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentPeriodInfoProps {
  periodStartDate?: string;
  periodEndDate?: string;
  periodFrequency?: string;
  periodStatus?: string;
  className?: string;
}

const PaymentPeriodInfo = ({ 
  periodStartDate, 
  periodEndDate, 
  periodFrequency, 
  periodStatus,
  className 
}: PaymentPeriodInfoProps) => {
  if (!periodStartDate || !periodEndDate) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Clock className="h-4 w-4" />
        <span className="text-sm">Sin período asignado</span>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'paid':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'locked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'open':
        return 'Abierto';
      case 'processing':
        return 'Procesando';
      case 'closed':
        return 'Cerrado';
      case 'paid':
        return 'Pagado';
      case 'locked':
        return 'Bloqueado';
      default:
        return status || 'Desconocido';
    }
  };

  const getFrequencyText = (frequency?: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Semanal';
      case 'biweekly':
        return 'Quincenal';
      case 'monthly':
        return 'Mensual';
      default:
        return frequency || '';
    }
  };

  const startDate = parseISO(periodStartDate);
  const endDate = parseISO(periodEndDate);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          {format(startDate, 'dd/MM', { locale: es })} - {format(endDate, 'dd/MM/yy', { locale: es })}
        </span>
      </div>
      
      {periodFrequency && (
        <Badge variant="outline" className="text-xs">
          {getFrequencyText(periodFrequency)}
        </Badge>
      )}
      
      {periodStatus && (
        <Badge variant="outline" className={`text-xs border-transparent ${getStatusColor(periodStatus)}`}>
          {getStatusText(periodStatus)}
        </Badge>
      )}
    </div>
  );
};

export default PaymentPeriodInfo;