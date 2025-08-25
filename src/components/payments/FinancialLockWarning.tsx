import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, AlertTriangle, CheckCircle, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialLockWarningProps {
  isLocked: boolean;
  canModify: boolean;
  warningMessage: string;
  paidDrivers: number;
  totalDrivers: number;
  className?: string;
  variant?: 'default' | 'compact' | 'banner';
}

/**
 * Componente que muestra advertencias sobre el estado de bloqueo financiero
 * Se adapta al estado del período y muestra información relevante
 */
export function FinancialLockWarning({
  isLocked,
  canModify,
  warningMessage,
  paidDrivers,
  totalDrivers,
  className,
  variant = 'default'
}: FinancialLockWarningProps) {
  
  // Determinar el tipo de alerta y iconos
  const getAlertVariant = () => {
    if (isLocked) return 'destructive';
    if (paidDrivers > 0) return 'default';
    return 'default';
  };

  const getIcon = () => {
    if (isLocked) return <Lock className="h-4 w-4" />;
    if (paidDrivers > 0) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getTitle = () => {
    if (isLocked) return 'Período Bloqueado';
    if (paidDrivers > 0) return 'Precaución Requerida';
    return 'Período Activo';
  };

  // Versión compacta para mostrar en tablas o espacios reducidos
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isLocked ? (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Bloqueado
          </Badge>
        ) : paidDrivers > 0 ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {paidDrivers}/{totalDrivers} Pagados
          </Badge>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Activo
          </Badge>
        )}
      </div>
    );
  }

  // Versión banner para mostrar en la parte superior de páginas
  if (variant === 'banner') {
    if (!isLocked && paidDrivers === 0) return null; // No mostrar si todo está normal
    
    return (
      <Alert variant={getAlertVariant()} className={cn("mb-4", className)}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <AlertTitle className="mb-0">{getTitle()}</AlertTitle>
        </div>
        <AlertDescription className="mt-2">
          {warningMessage}
          {paidDrivers > 0 && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {paidDrivers} de {totalDrivers} conductores pagados
              </span>
              {isLocked && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Datos protegidos
                </span>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Versión por defecto - card completo con detalles
  return (
    <Card className={cn("border-l-4", {
      "border-l-red-500 bg-red-50/50": isLocked,
      "border-l-yellow-500 bg-yellow-50/50": !isLocked && paidDrivers > 0,
      "border-l-green-500 bg-green-50/50": !isLocked && paidDrivers === 0
    }, className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", {
            "bg-red-100 text-red-600": isLocked,
            "bg-yellow-100 text-yellow-600": !isLocked && paidDrivers > 0,
            "bg-green-100 text-green-600": !isLocked && paidDrivers === 0
          })}>
            {getIcon()}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">{getTitle()}</h4>
              <Badge variant={isLocked ? "destructive" : paidDrivers > 0 ? "secondary" : "outline"}>
                {isLocked ? "Inmutable" : canModify ? "Modificable" : "Restringido"}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {warningMessage}
            </p>
            
            {totalDrivers > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {paidDrivers}/{totalDrivers} conductores pagados
                </span>
                
                {isLocked && (
                  <span className="flex items-center gap-1 text-red-600">
                    <Shield className="h-3 w-3" />
                    Datos financieros protegidos
                  </span>
                )}
              </div>
            )}
            
            {/* Barra de progreso visual */}
            {totalDrivers > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de pagos</span>
                  <span>{Math.round((paidDrivers / totalDrivers) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn("h-2 rounded-full transition-all duration-300", {
                      "bg-red-500": isLocked,
                      "bg-yellow-500": !isLocked && paidDrivers > 0 && paidDrivers < totalDrivers,
                      "bg-green-500": paidDrivers === totalDrivers
                    })}
                    style={{ width: `${(paidDrivers / totalDrivers) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente para mostrar estado de bloqueo en listas de elementos
 */
export function FinancialLockIndicator({ 
  isLocked, 
  className 
}: { 
  isLocked: boolean; 
  className?: string; 
}) {
  if (!isLocked) return null;
  
  return (
    <div className={cn("flex items-center gap-1 text-red-600", className)}>
      <Lock className="h-3 w-3" />
      <span className="text-xs font-medium">Bloqueado</span>
    </div>
  );
}