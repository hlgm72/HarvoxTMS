import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCleanupPeriod } from '@/hooks/useCleanupPeriod';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { AlertTriangle, Trash2 } from 'lucide-react';

export const PeriodCleanupTool = () => {
  const [weekNumber, setWeekNumber] = useState(36);
  const [yearNumber, setYearNumber] = useState(2025);
  const { userCompany } = useCompanyCache();
  const cleanupPeriod = useCleanupPeriod();

  const handleCleanup = () => {
    if (!userCompany?.company_id) {
      console.error('No company found');
      return;
    }

    cleanupPeriod.mutate({
      weekNumber,
      yearNumber
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Limpieza de Períodos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-amber-600 bg-amber-100 p-3 rounded">
            <strong>⚠️ Atención:</strong> Esta herramienta elimina períodos de pago vacíos 
            que no tienen transacciones reales asociadas.
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="week">Semana</Label>
              <Input
                id="week"
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 36)}
                min={1}
                max={53}
              />
            </div>
            <div>
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                value={yearNumber}
                onChange={(e) => setYearNumber(parseInt(e.target.value) || 2025)}
                min={2020}
                max={2030}
              />
            </div>
          </div>

          <Button 
            onClick={handleCleanup}
            disabled={cleanupPeriod.isPending || !userCompany?.company_id}
            className="w-full"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {cleanupPeriod.isPending ? 'Limpiando...' : `Limpiar Semana ${weekNumber}`}
          </Button>

          {cleanupPeriod.isSuccess && (
            <div className="text-sm text-green-600 bg-green-100 p-3 rounded">
              ✅ Período limpiado exitosamente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};