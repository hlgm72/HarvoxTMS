import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { usePaymentPeriodDiagnostic } from '@/hooks/usePaymentPeriodDiagnostic';

export function PaymentPeriodDiagnosticWidget() {
  const {
    diagnostic,
    isLoading,
    error,
    refetch,
    fixCalculations,
    isFixing,
    needsAttention,
    severityLevel,
    hasProblems
  } = usePaymentPeriodDiagnostic();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Error en Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No se pudo ejecutar el diagnóstico del sistema de pagos.
          </p>
          <Button
            onClick={() => refetch()}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = () => {
    switch (severityLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (needsAttention) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (needsAttention) return 'text-destructive';
    return 'text-success';
  };

  return (
    <Card className={needsAttention ? 'border-destructive' : 'border-success'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className={`flex items-center gap-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            Diagnóstico de Pagos
          </span>
          <Badge variant={getSeverityColor()}>
            {diagnostic?.status || 'CHECKING'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {diagnostic?.recommendations || 'Verificando estado del sistema...'}
        </CardDescription>
      </CardHeader>
      
      {diagnostic && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Períodos Recientes</span>
              <p className="font-medium">{diagnostic.recent_periods_count}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Cálculos Totales</span>
              <p className="font-medium">{diagnostic.recent_calculations_count}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Cálculos Fallidos</span>
              <p className={`font-medium ${diagnostic.failed_calculations_count > 0 ? 'text-destructive' : 'text-success'}`}>
                {diagnostic.failed_calculations_count}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Cargas Pendientes</span>
              <p className={`font-medium ${diagnostic.pending_loads_count > 0 ? 'text-warning' : 'text-success'}`}>
                {diagnostic.pending_loads_count}
              </p>
            </div>
          </div>

          {hasProblems && (
            <div className="pt-2 border-t space-y-2">
              <Button
                onClick={() => fixCalculations()}
                disabled={isFixing}
                size="sm"
                variant="default"
                className="w-full"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <Wrench className="h-3 w-3 mr-2" />
                    Corregir Automáticamente
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Se recalcularán {diagnostic.failed_calculations_count} períodos con problemas
              </p>
            </div>
          )}

          <Button
            onClick={() => refetch()}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Actualizar Diagnóstico
          </Button>
        </CardContent>
      )}
    </Card>
  );
}