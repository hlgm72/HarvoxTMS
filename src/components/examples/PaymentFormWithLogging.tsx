/**
 * EJEMPLO: Componente que demuestra el uso completo del sistema de logging
 * Este ejemplo muestra las mejores prácticas de logging sin spam a Sentry
 */

import React, { useState } from 'react';
import { useLogger, business, performance, handleAsyncError } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PaymentData {
  driverId: string;
  amount: number;
  description: string;
}

export function PaymentFormWithLogging() {
  const log = useLogger('PaymentFormWithLogging');
  const [formData, setFormData] = useState<PaymentData>({
    driverId: '',
    amount: 0,
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función que simula validación con logs apropiados
  const validateForm = (data: PaymentData): string[] => {
    const timer = performance.start('form_validation');
    const errors: string[] = [];

    // Logs de DEBUG - solo en desarrollo
    log.debug('Starting form validation', { 
      driverId: data.driverId, 
      amount: data.amount 
    });

    if (!data.driverId) {
      errors.push('Driver ID is required');
    }

    if (data.amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    if (data.amount > 10000) {
      // LOG WARN - este va a Sentry porque puede ser sospechoso
      log.warn('Large payment amount detected', { 
        amount: data.amount, 
        driverId: data.driverId,
        formComponent: 'PaymentFormWithLogging'
      });
    }

    performance.end('form_validation', timer);

    // Solo en desarrollo - resultados de validación
    log.debug('Form validation completed', { 
      errorsFound: errors.length, 
      errors,
      isValid: errors.length === 0
    });

    return errors;
  };

  // Función que simula llamada a API con manejo de errores
  const submitPayment = async (data: PaymentData): Promise<void> => {
    const timer = performance.start('payment_submission');
    
    try {
      // Log de negocio - solo en desarrollo
      business.payment('payment_form_submitted', {
        driverId: data.driverId,
        amount: data.amount,
        hasDescription: !!data.description
      });

      // Simular llamada a API
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Log de éxito - solo en desarrollo
      log.info('Payment submitted successfully', { 
        paymentId: result.id, 
        driverId: data.driverId,
        amount: data.amount
      });

      // Log de negocio para analytics
      business.payment('payment_created', {
        paymentId: result.id,
        driverId: data.driverId,
        amount: data.amount,
        processingTime: performance.end('payment_submission', timer)
      });

      toast.success('Payment created successfully!');

    } catch (error) {
      performance.end('payment_submission', timer);
      
      // ESTE ERROR SÍ VA A SENTRY con contexto rico
      handleAsyncError(error, 'PaymentFormWithLogging.submitPayment', {
        formData: {
          driverId: data.driverId,
          amount: data.amount,
          hasDescription: !!data.description
        },
        step: 'api_submission',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      toast.error('Failed to create payment. Please try again.');
      throw error; // Re-lanzar para manejo en el componente
    }
  };

  // Handler del form con logging completo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      log.debug('Form submission blocked - already submitting');
      return;
    }

    const overallTimer = performance.start('payment_form_complete_submission');
    setIsSubmitting(true);

    try {
      // Paso 1: Validación
      const validationErrors = validateForm(formData);
      
      if (validationErrors.length > 0) {
        // Log de INFO para debugging - solo desarrollo
        log.info('Form validation failed', { 
          errors: validationErrors,
          formData: { driverId: formData.driverId, amount: formData.amount }
        });
        
        toast.error(`Validation failed: ${validationErrors.join(', ')}`);
        return;
      }

      // Paso 2: Envío
      await submitPayment(formData);

      // Paso 3: Limpieza exitosa
      setFormData({ driverId: '', amount: 0, description: '' });
      
      log.info('Form reset after successful submission');

    } catch (error) {
      // Los errores específicos ya se loggearon en submitPayment
      // Aquí solo loggear el contexto del form
      log.debug('Form submission failed at top level', {
        hasValidationPassed: true,
        submissionStep: 'api_call'
      });
    } finally {
      setIsSubmitting(false);
      performance.end('payment_form_complete_submission', overallTimer);
    }
  };

  // Handler de cambios con logging mínimo
  const handleInputChange = (field: keyof PaymentData, value: string | number) => {
    // Solo loggear cambios importantes, no cada tecla
    if (field === 'amount' && typeof value === 'number' && value > 5000) {
      log.debug('High amount entered', { field, value });
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Payment Form (Con Logging Inteligente)</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Driver ID</label>
          <Input
            type="text"
            value={formData.driverId}
            onChange={(e) => handleInputChange('driverId', e.target.value)}
            placeholder="Enter driver ID"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description (Optional)</label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Payment description"
            disabled={isSubmitting}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Processing...' : 'Create Payment'}
        </Button>
      </form>

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <strong>Logging Demo:</strong>
        <ul className="list-disc list-inside mt-2 text-xs">
          <li><span className="text-blue-600">DEBUG logs</span> - Solo en desarrollo</li>
          <li><span className="text-green-600">INFO logs</span> - Solo en desarrollo</li>
          <li><span className="text-orange-600">WARN logs</span> - Van a Sentry (ej: montos altos)</li>
          <li><span className="text-red-600">ERROR logs</span> - Van a Sentry con contexto</li>
          <li><span className="text-purple-600">PERFORMANCE</span> - Medición automática</li>
        </ul>
      </div>
    </div>
  );
}