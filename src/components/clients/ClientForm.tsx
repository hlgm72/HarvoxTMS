import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useErrorTranslation } from '@/hooks/useErrorTranslation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ClientFormData {
  name: string;
  alias?: string;
  address?: string;
  phone?: string;
  email_domain?: string;
  dot_number?: string;
  mc_number?: string;
  notes?: string;
}

interface ClientFormProps {
  companyId: string;
  clientId?: string;
  initialData?: Partial<ClientFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Example component demonstrating the new error translation system
 * This replaces hardcoded Spanish errors with translatable error codes
 */
export const ClientForm: React.FC<ClientFormProps> = ({
  companyId,
  clientId,
  initialData,
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation('clients');
  const { handleSupabaseError, showErrorToast, isErrorCode } = useErrorTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ClientFormData>({
    defaultValues: initialData
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    
    try {
      // Call the Supabase function that now returns translated error codes
      const { data: result, error } = await supabase.rpc(
        'create_or_update_client_with_validation',
        {
          client_data: {
            ...data,
            company_id: companyId
          },
          client_id: clientId || null
        }
      );

      if (error) {
        // This will now show proper translated errors instead of hardcoded Spanish
        handleSupabaseError(error, 'client creation/update');
        return;
      }

      if ((result as any)?.success) {
        const isEdit = !!clientId;
        toast.success(
          isEdit 
            ? t('form.messages.updated_success')
            : t('form.messages.created_success')
        );
        
        reset();
        onSuccess?.();
      } else {
        // Handle function-level errors that might still be in the old format
        showErrorToast((result as any)?.message || 'ERROR_OPERATION_FAILED');
      }

    } catch (err: any) {
      console.error('Unexpected error in client form:', err);
      
      // Check if this is one of our new error codes
      if (isErrorCode(err?.message, 'ERROR_CLIENT_NAME_EXISTS')) {
        showErrorToast('ERROR_CLIENT_NAME_EXISTS');
      } else if (isErrorCode(err?.message, 'ERROR_NO_PERMISSIONS_MANAGE_CLIENTS')) {
        showErrorToast('ERROR_NO_PERMISSIONS_MANAGE_CLIENTS');
      } else {
        // Fallback for unexpected errors
        showErrorToast('ERROR_OPERATION_FAILED');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {clientId ? t('form.edit_title') : t('form.create_title')}
        </CardTitle>
        <CardDescription>
          {clientId ? t('form.edit_description') : t('form.create_description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Client Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('form.name_label')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { 
                required: t('form.name_required') 
              })}
              placeholder={t('form.name_placeholder')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Client Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">{t('form.alias_label')}</Label>
            <Input
              id="alias"
              {...register('alias')}
              placeholder={t('form.alias_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* DOT Number */}
          <div className="space-y-2">
            <Label htmlFor="dot_number">{t('form.dot_number_label')}</Label>
            <Input
              id="dot_number"
              {...register('dot_number')}
              placeholder={t('form.dot_number_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* MC Number */}
          <div className="space-y-2">
            <Label htmlFor="mc_number">{t('form.mc_number_label')}</Label>
            <Input
              id="mc_number"
              {...register('mc_number')}
              placeholder={t('form.mc_number_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">{t('form.address_label')}</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder={t('form.address_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t('form.phone_label')}</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder={t('form.phone_placeholder')}
              disabled={isLoading}
            />
          </div>

          {/* Email Domain */}
          <div className="space-y-2">
            <Label htmlFor="email_domain">{t('form.email_domain_label')}</Label>
            <Input
              id="email_domain"
              {...register('email_domain')}
              placeholder={t('form.email_domain_placeholder')}
              disabled={isLoading}
            />
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
                ? (clientId ? t('form.updating') : t('form.creating'))
                : (clientId ? t('form.update_button') : t('form.create_button'))
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