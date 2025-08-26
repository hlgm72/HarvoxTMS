import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useErrorTranslation } from '@/hooks/useErrorTranslation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface EquipmentFormData {
  equipment_number: string;
  equipment_type: string;
  make?: string;
  model?: string;
  year?: number;
  vin_number?: string;
  license_plate?: string;
  fuel_type?: string;
  status?: string;
  notes?: string;
}

interface EquipmentFormProps {
  companyId: string;
  equipmentId?: string;
  initialData?: Partial<EquipmentFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Another example component demonstrating the error translation system
 * Shows how different types of validation errors are handled
 */
export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  companyId,
  equipmentId,
  initialData,
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation('equipment');
  const { handleSupabaseError, showErrorToast, isErrorCode, translateError } = useErrorTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<EquipmentFormData>({
    defaultValues: {
      fuel_type: 'diesel',
      status: 'active',
      ...initialData
    }
  });

  const equipmentType = watch('equipment_type');
  const fuelType = watch('fuel_type');
  const status = watch('status');

  const onSubmit = async (data: EquipmentFormData) => {
    setIsLoading(true);
    
    try {
      const { data: result, error } = await supabase.rpc(
        'create_or_update_equipment_with_validation',
        {
          equipment_data: {
            ...data,
            company_id: companyId
          },
          equipment_id: equipmentId || null
        }
      );

      if (error) {
        // The function now returns structured error codes instead of hardcoded Spanish messages
        console.error('Equipment operation error:', error);
        
        // Handle specific error cases with proper translation
        if (error.message?.includes('ERROR_EQUIPMENT_NUMBER_EXISTS')) {
          // Extract the equipment number from the error details
          const equipmentNumber = data.equipment_number;
          showErrorToast(`ERROR_EQUIPMENT_NUMBER_EXISTS:number:${equipmentNumber}`);
        } else if (error.message?.includes('ERROR_NO_PERMISSIONS_MANAGE_EQUIPMENT')) {
          showErrorToast('ERROR_NO_PERMISSIONS_MANAGE_EQUIPMENT');
        } else if (error.message?.includes('ERROR_EQUIPMENT_NUMBER_REQUIRED')) {
          showErrorToast('ERROR_EQUIPMENT_NUMBER_REQUIRED');
        } else if (error.message?.includes('ERROR_EQUIPMENT_TYPE_REQUIRED')) {
          showErrorToast('ERROR_EQUIPMENT_TYPE_REQUIRED');
        } else {
          // Generic error handling with translation
          handleSupabaseError(error, 'equipment management');
        }
        return;
      }

      if ((result as any)?.success) {
        const isEdit = !!equipmentId;
        toast.success(
          isEdit 
            ? t('form.messages.updated_success')
            : t('form.messages.created_success')
        );
        
        reset();
        onSuccess?.();
      } else {
        // Handle function-level errors
        const errorMessage = (result as any)?.message || 'ERROR_OPERATION_FAILED';
        const translatedError = translateError(errorMessage);
        toast.error(translatedError);
      }

    } catch (err: any) {
      console.error('Unexpected error in equipment form:', err);
      handleSupabaseError(err, 'equipment form submission');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {equipmentId ? t('form.edit_title') : t('form.create_title')}
        </CardTitle>
        <CardDescription>
          {equipmentId ? t('form.edit_description') : t('form.create_description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Equipment Number - Required */}
          <div className="space-y-2">
            <Label htmlFor="equipment_number">
              {t('form.equipment_number_label')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="equipment_number"
              {...register('equipment_number', { 
                required: t('form.equipment_number_required') 
              })}
              placeholder={t('form.equipment_number_placeholder')}
              disabled={isLoading}
            />
            {errors.equipment_number && (
              <p className="text-sm text-destructive">{errors.equipment_number.message}</p>
            )}
          </div>

          {/* Equipment Type - Required */}
          <div className="space-y-2">
            <Label htmlFor="equipment_type">
              {t('form.equipment_type_label')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={equipmentType}
              onValueChange={(value) => setValue('equipment_type', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.equipment_type_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">{t('form.equipment_types.truck')}</SelectItem>
                <SelectItem value="trailer">{t('form.equipment_types.trailer')}</SelectItem>
                <SelectItem value="other">{t('form.equipment_types.other')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.equipment_type && (
              <p className="text-sm text-destructive">{errors.equipment_type.message}</p>
            )}
          </div>

          {/* Make and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">{t('form.make_label')}</Label>
              <Input
                id="make"
                {...register('make')}
                placeholder={t('form.make_placeholder')}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">{t('form.model_label')}</Label>
              <Input
                id="model"
                {...register('model')}
                placeholder={t('form.model_placeholder')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Year */}
          <div className="space-y-2">
            <Label htmlFor="year">{t('form.year_label')}</Label>
            <Input
              id="year"
              type="number"
              {...register('year', { 
                valueAsNumber: true, 
                min: { value: 1900, message: t('form.year_min_error') },
                max: { value: new Date().getFullYear() + 1, message: t('form.year_max_error') }
              })}
              placeholder={t('form.year_placeholder')}
              disabled={isLoading}
            />
            {errors.year && (
              <p className="text-sm text-destructive">{errors.year.message}</p>
            )}
          </div>

          {/* VIN Number */}
          <div className="space-y-2">
            <Label htmlFor="vin_number">{t('form.vin_number_label')}</Label>
            <Input
              id="vin_number"
              {...register('vin_number')}
              placeholder={t('form.vin_number_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* License Plate */}
          <div className="space-y-2">
            <Label htmlFor="license_plate">{t('form.license_plate_label')}</Label>
            <Input
              id="license_plate"
              {...register('license_plate')}
              placeholder={t('form.license_plate_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Fuel Type */}
          <div className="space-y-2">
            <Label htmlFor="fuel_type">{t('form.fuel_type_label')}</Label>
            <Select
              value={fuelType}
              onValueChange={(value) => setValue('fuel_type', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diesel">{t('form.fuel_types.diesel')}</SelectItem>
                <SelectItem value="gasoline">{t('form.fuel_types.gasoline')}</SelectItem>
                <SelectItem value="electric">{t('form.fuel_types.electric')}</SelectItem>
                <SelectItem value="hybrid">{t('form.fuel_types.hybrid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('form.status_label')}</Label>
            <Select
              value={status}
              onValueChange={(value) => setValue('status', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('form.status_options.active')}</SelectItem>
                <SelectItem value="maintenance">{t('form.status_options.maintenance')}</SelectItem>
                <SelectItem value="inactive">{t('form.status_options.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('form.notes_label')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={t('form.notes_placeholder')}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading 
                ? (equipmentId ? t('form.updating') : t('form.creating'))
                : (equipmentId ? t('form.update_button') : t('form.create_button'))
              }
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {t('form.cancel_button')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};