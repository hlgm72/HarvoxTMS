import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialDataValidation } from '@/hooks/useFinancialDataValidation';
import { FinancialLockWarning } from '@/components/payments/FinancialLockWarning';
import { 
  handleFinancialIntegrityError, 
  confirmFinancialOperation,
  shouldDisableFinancialOperation,
  getFinancialOperationTooltip,
  getFinancialIntegrityClasses
} from '@/lib/financialIntegrityUtils';
import { toast } from 'sonner';
import { Truck, DollarSign } from 'lucide-react';

/**
 * EJEMPLO: Componente de formulario para cargas con validación de integridad financiera
 * 
 * Este es un ejemplo de cómo integrar las validaciones de integridad financiera
 * en cualquier formulario que modifique datos que afecten los pagos de conductores.
 */
interface LoadFormProps {
  loadId?: string;
  periodId: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export function LoadFormWithFinancialValidation({ 
  loadId, 
  periodId, 
  onSave, 
  onCancel 
}: LoadFormProps) {
  const [formData, setFormData] = useState({
    loadNumber: '',
    origin: '',
    destination: '',
    rate: '',
    driverShare: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔒 VALIDACIÓN DE INTEGRIDAD FINANCIERA
  const { 
    data: financialValidation, 
    isLoading: isValidationLoading 
  } = useFinancialDataValidation(periodId);

  // Determinar si el formulario debe estar deshabilitado
  const isFormDisabled = shouldDisableFinancialOperation(financialValidation, isSubmitting);
  
  // Obtener clases CSS basadas en el estado financiero
  const financialClasses = getFinancialIntegrityClasses(financialValidation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔒 PASO 1: Verificar integridad financiera
    if (!handleFinancialIntegrityError(financialValidation, 'guardar esta carga')) {
      return; // Operación bloqueada
    }

    // 🔒 PASO 2: Confirmar si hay riesgo financiero
    const canProceed = await confirmFinancialOperation(
      financialValidation, 
      'modificar esta carga',
      true // Requerir confirmación si hay conductores pagados
    );

    if (!canProceed) {
      return; // Usuario canceló la operación
    }

    // 🔒 PASO 3: Proceder con la operación
    setIsSubmitting(true);
    try {
      // Aquí iría la lógica de guardado real
      console.log('💾 Guardando carga con validación financiera:', formData);
      
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Carga guardada exitosamente', {
        description: 'Los datos se han actualizado con las validaciones de integridad financiera'
      });
      
      onSave?.(formData);
    } catch (error) {
      toast.error('Error al guardar la carga');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isValidationLoading) {
    return <div className="p-4">Validando integridad financiera...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 🔒 ADVERTENCIA DE ESTADO FINANCIERO */}
      <FinancialLockWarning
        isLocked={financialValidation?.is_locked || false}
        canModify={financialValidation?.can_modify || true}
        warningMessage={financialValidation?.warning_message || ''}
        paidDrivers={financialValidation?.paid_drivers || 0}
        totalDrivers={financialValidation?.total_drivers || 0}
        variant="banner"
      />

      {/* FORMULARIO PRINCIPAL */}
      <Card className={`${financialClasses.container} transition-colors`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {loadId ? 'Editar Carga' : 'Nueva Carga'}
          </CardTitle>
          
          {financialValidation && (
            <p className={`text-sm ${financialClasses.text}`}>
              Estado: {financialValidation.warning_message}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loadNumber">Número de Carga</Label>
                <Input
                  id="loadNumber"
                  value={formData.loadNumber}
                  onChange={(e) => handleInputChange('loadNumber', e.target.value)}
                  disabled={isFormDisabled}
                  placeholder="Ej: LOAD-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Tasa ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rate"
                    type="number"
                    value={formData.rate}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    disabled={isFormDisabled}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Origen</Label>
                <Input
                  id="origin"
                  value={formData.origin}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                  disabled={isFormDisabled}
                  placeholder="Ciudad, Estado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destino</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  disabled={isFormDisabled}
                  placeholder="Ciudad, Estado"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isFormDisabled}
                className={financialClasses.button}
                title={getFinancialOperationTooltip(financialValidation, 'guardar la carga')}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Carga'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 📝 INSTRUCCIONES PARA DESARROLLADORES */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">
            💡 Guía de Integración - Sistema de Integridad Financiera
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p><strong>1. Hook de validación:</strong> <code>useFinancialDataValidation(periodId)</code></p>
          <p><strong>2. Componente de advertencia:</strong> <code>&lt;FinancialLockWarning /&gt;</code></p>
          <p><strong>3. Utilidades de validación:</strong> <code>handleFinancialIntegrityError()</code></p>
          <p><strong>4. Confirmación de operaciones:</strong> <code>confirmFinancialOperation()</code></p>
          <p><strong>5. Estado de botones:</strong> <code>shouldDisableFinancialOperation()</code></p>
          
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            <strong>Uso recomendado:</strong> Integrar estas validaciones en cualquier formulario 
            que modifique datos financieros (cargas, gastos, ingresos adicionales, etc.)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoadFormWithFinancialValidation;