import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'critical' | 'error';
  healthScore: string;
  healthPercentage: number;
  checks: {
    timestamp: string;
    database: boolean;
    authentication: boolean;
    criticalTables: boolean;
    acidFunctions: boolean;
    storageAccess: boolean;
  };
  recommendations: string[];
}

export const HealthCheckTester = () => {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('health-check');
      
      if (functionError) {
        throw new Error(`Health check failed: ${functionError.message}`);
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertCircle className="h-4 w-4" />;
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Health Check
          </CardTitle>
          <CardDescription>
            Prueba la función de health check del sistema para verificar el estado de todos los componentes críticos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runHealthCheck} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando Health Check...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Ejecutar Health Check
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Status Overview */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">Estado del Sistema</span>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Puntuación: {result.healthScore} ({result.healthPercentage}%)
                </div>
                <div className="text-xs text-muted-foreground">
                  Última verificación: {new Date(result.checks.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Individual Checks */}
              <div className="space-y-2">
                <h4 className="font-medium">Verificaciones Individuales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(result.checks).map(([key, value]) => {
                    if (key === 'timestamp') return null;
                    
                    return (
                      <div key={key} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        {typeof value === 'boolean' ? (
                          value ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recomendaciones</h4>
                  <ul className="space-y-1">
                    {result.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};