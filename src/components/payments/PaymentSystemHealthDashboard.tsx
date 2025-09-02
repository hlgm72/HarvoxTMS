import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePaymentIntegrityMonitor } from "@/hooks/usePaymentIntegrityMonitor";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CheckCircle, RefreshCw, Wrench, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/dateFormatting";
import { cn } from "@/lib/utils";

interface PaymentSystemHealthDashboardProps {
  companyId: string;
  className?: string;
}

export function PaymentSystemHealthDashboard({ companyId, className }: PaymentSystemHealthDashboardProps) {
  const { user } = useAuth();
  const {
    integrityReport,
    isLoading,
    error,
    autoFixIssues,
    isAutoFixing,
    refreshIntegrity,
    isSystemHealthy,
    getStatusColor,
    getIssueSeverity,
    getIssuesBySeverity,
    totalIssues,
    highSeverityCount,
  } = usePaymentIntegrityMonitor(companyId);

  if (!user) return null;

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              No se pudo verificar la integridad del sistema: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const statusColor = getStatusColor();
  const issuesBySeverity = getIssuesBySeverity;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Overview Card */}
      <Card className={cn(
        "border-2",
        statusColor === 'green' && "border-success",
        statusColor === 'red' && "border-destructive",
        statusColor === 'yellow' && "border-warning"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : isSystemHealthy ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Sistema de Cálculos de Pago
            </div>
            <Badge variant={isSystemHealthy ? "default" : "destructive"}>
              {isLoading ? "Verificando..." : isSystemHealthy ? "Saludable" : "Problemas Detectados"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {integrityReport?.checked_at && (
              <>Última verificación: {new Date(integrityReport.checked_at).toLocaleString()}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Issues Summary */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Inconsistencias Detectadas</div>
              <div className="text-2xl font-bold text-destructive">
                {totalIssues}
              </div>
              {highSeverityCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {highSeverityCount} críticas
                </Badge>
              )}
            </div>

            {/* Severity Breakdown */}
            {totalIssues > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Por Severidad</div>
                <div className="space-y-1">
                  {issuesBySeverity.high && (
                    <div className="flex justify-between text-xs">
                      <span className="text-destructive">Alta:</span>
                      <span className="font-medium">{issuesBySeverity.high}</span>
                    </div>
                  )}
                  {issuesBySeverity.medium && (
                    <div className="flex justify-between text-xs">
                      <span className="text-warning">Media:</span>
                      <span className="font-medium">{issuesBySeverity.medium}</span>
                    </div>
                  )}
                  {issuesBySeverity.low && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Baja:</span>
                      <span className="font-medium">{issuesBySeverity.low}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Acciones</div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshIntegrity()}
                  disabled={isLoading}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Ahora
                </Button>
                {totalIssues > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => autoFixIssues(companyId)}
                    disabled={isAutoFixing}
                    className="w-full"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    {isAutoFixing ? "Corrigiendo..." : "Corregir Automáticamente"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Detail */}
      {totalIssues > 0 && integrityReport?.issues && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detalles de Inconsistencias
            </CardTitle>
            <CardDescription>
              Diferencias encontradas entre los cálculos almacenados y los valores reales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrityReport.issues.slice(0, 5).map((issue, index) => {
                const severity = getIssueSeverity(issue);
                return (
                  <Alert key={index} variant={severity === 'high' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex justify-between items-start">
                        <div>
                          <strong>{issue.type.replace(/_/g, ' ')}</strong>
                          <div className="text-sm text-muted-foreground mt-1">
                            Período: {issue.period_id.slice(0, 8)}... | 
                            Conductor: {issue.driver_user_id.slice(0, 8)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            Diferencia: {formatCurrency(Math.abs(issue.difference))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Calculado: {formatCurrency(issue.calculated)} | 
                            Esperado: {formatCurrency(issue.expected)}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
              {integrityReport.issues.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... y {integrityReport.issues.length - 5} inconsistencias más
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Healthy State Message */}
      {isSystemHealthy && (
        <Card className="border-success">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <h3 className="text-lg font-semibold text-success">Sistema Saludable</h3>
              <p className="text-sm text-muted-foreground">
                Todos los cálculos de pago están correctos y actualizados.
                Los triggers automáticos están funcionando correctamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}