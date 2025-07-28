import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AddressForm } from '@/components/ui/AddressForm';
import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createTextHandlers } from '@/lib/textUtils';

const personalInfoSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().optional(),
  street_address: z.string().optional(),
  state_id: z.string().optional(),
  city_id: z.string().optional(),
  zip_code: z.string().optional(),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function PersonalInfoForm({ onCancel, showCancelButton = true, className }: PersonalInfoFormProps) {
  const { t, i18n } = useTranslation(['common']);
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, user, refreshProfile } = useUserProfile();
  const [updating, setUpdating] = useState(false);

  // Create handlers for text inputs
  const nameHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('first_name', value)
  );
  
  const lastNameHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('last_name', value)
  );
  
  const phoneHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('phone', value), 'phone'
  );

  const personalInfoForm = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      street_address: '',
      state_id: '',
      city_id: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city_id: profile.city_id || '',
        zip_code: profile.zip_code || '',
      });
    }
  }, [profile, personalInfoForm]);

  const onSubmitPersonalInfo = async (data: PersonalInfoFormData) => {
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          street_address: data.street_address || null,
          state_id: data.state_id || null,
          city_id: data.city_id || null,
          zip_code: data.zip_code || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile data to update the UI
      await refreshProfile();

      showSuccess(
        "Perfil actualizado exitosamente",
        "Su información personal ha sido guardada correctamente."
      );
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización del perfil. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city_id: profile.city_id || '',
        zip_code: profile.zip_code || '',
      });
    }
    onCancel?.();
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-medium">Información Personal</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          Actualiza tu información personal y dirección
        </p>
      </div>
      
      <Form {...personalInfoForm}>
        <form onSubmit={personalInfoForm.handleSubmit(onSubmitPersonalInfo)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={personalInfoForm.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={personalInfoForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Teléfono</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(555) 123-4567" 
                    value={field.value || ''} 
                    {...phoneHandlers}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AddressForm
            streetAddress={personalInfoForm.watch('street_address') || ''}
            onStreetAddressChange={(value) => personalInfoForm.setValue('street_address', value)}
            stateId={personalInfoForm.watch('state_id') || undefined}
            onStateChange={(value) => personalInfoForm.setValue('state_id', value || '')}
            cityId={personalInfoForm.watch('city_id') || undefined}
            onCityChange={(value) => personalInfoForm.setValue('city_id', value || '')}
            zipCode={personalInfoForm.watch('zip_code') || ''}
            onZipCodeChange={(value) => personalInfoForm.setValue('zip_code', value)}
            required={false}
          />

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={updating} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}