import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

interface PaymentPeriodAlertsProps {
  driversWithNegativeBalance: number;
  totalDrivers: number;
}

export function PaymentPeriodAlerts({ driversWithNegativeBalance, totalDrivers }: PaymentPeriodAlertsProps) {
  if (driversWithNegativeBalance === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Todo en orden</AlertTitle>
        <AlertDescription>
          Todos los conductores tienen balances positivos en este período.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Atención Requerida</AlertTitle>
      <AlertDescription>
        {driversWithNegativeBalance} de {totalDrivers} conductores tienen balances negativos.
        Revisa las deducciones y considera diferir gastos no críticos o ajustar los montos.
      </AlertDescription>
    </Alert>
  );
}