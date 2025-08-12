import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
import { BirthDateInput } from '@/components/ui/BirthDateInput';

const personalInfoSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  street_address: z.string().optional(),
  state_id: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export interface PersonalInfoFormRef {
  saveData: () => Promise<{ success: boolean; error?: string }>;
}

export const PersonalInfoForm = forwardRef<PersonalInfoFormRef, PersonalInfoFormProps>(({ onCancel, showCancelButton = true, className }, ref) => {
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

  // Helper function to convert database date format to display format
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      // Expect yyyy-mm-dd from database
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        // Locale-aware display
        if (i18n.language === 'es') {
          // DD/MM/YYYY
          return `${day}/${month}/${year}`;
        } else {
          // MM/DD/YYYY
          return `${month}/${day}/${year}`;
        }
      }
      return dateString;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return '';
    }
  };

  // Helper function to convert display format to database format
  const formatDateForDatabase = (displayDate: string): string | null => {
    if (!displayDate || displayDate.trim() === '') return null;
    try {
      let day: string | undefined;
      let month: string | undefined;
      let year: string | undefined;

      // Match either d/m/yyyy or m/d/yyyy with 1-2 digit day/month
      const parts = displayDate.split('/');
      if (parts.length !== 3) return null;

      if (i18n.language === 'es') {
        // DD/MM/YYYY
        [day, month, year] = parts;
      } else {
        // MM/DD/YYYY
        [month, day, year] = parts;
      }

      // Normalize
      const dd = day!.padStart(2, '0');
      const mm = month!.padStart(2, '0');
      const yyyy = year!;

      // Basic range checks to avoid invalid months/days
      const mNum = parseInt(mm, 10);
      const dNum = parseInt(dd, 10);
      const yNum = parseInt(yyyy, 10);
      if (isNaN(mNum) || isNaN(dNum) || isNaN(yNum)) return null;
      if (mNum < 1 || mNum > 12) return null;
      if (dNum < 1 || dNum > 31) return null;

      // Return ISO for DB
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error('Error converting date to database format:', error);
      return null;
    }
  };

  const personalInfoForm = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      street_address: '',
      state_id: '',
      city: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: formatDateForDisplay(profile.date_of_birth),
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city: profile?.city || '',
        zip_code: profile.zip_code || '',
      });
    }
  }, [profile, personalInfoForm]);

  const savePersonalInfoData = async (data: PersonalInfoFormData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuario no encontrado' };

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          date_of_birth: formatDateForDatabase(data.date_of_birth),
          street_address: data.street_address || null,
          state_id: data.state_id || null,
          city: data.city || null,
          zip_code: data.zip_code || null,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile:', error);
        return { success: false, error: error.message };
      }

      await refreshProfile();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const onSubmitPersonalInfo = async (data: PersonalInfoFormData) => {
    setUpdating(true);
    try {
      const result = await savePersonalInfoData(data);
      if (result.success) {
        showSuccess(
          "Perfil actualizado exitosamente",
          "Su información personal ha sido guardada correctamente."
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización del perfil. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  // Expose saveData method via ref
  useImperativeHandle(ref, () => ({
    saveData: async () => {
      const data = personalInfoForm.getValues();
      return await savePersonalInfoData(data);
    }
  }));

  const handleCancel = () => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: formatDateForDisplay(profile.date_of_birth),
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city: profile?.city || '',
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
        <form onSubmit={personalInfoForm.handleSubmit(onSubmitPersonalInfo)} className="space-y-4" data-form="personal-info">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <FormField
              control={personalInfoForm.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BirthDateInput 
                      value={field.value || ''}
                      onValueChange={(value) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <AddressForm
            streetAddress={personalInfoForm.watch('street_address') || ''}
            onStreetAddressChange={(value) => personalInfoForm.setValue('street_address', value)}
            stateId={personalInfoForm.watch('state_id') || undefined}
            onStateChange={(value) => personalInfoForm.setValue('state_id', value || '')}
            city={personalInfoForm.watch('city') || undefined}
            onCityChange={(value) => personalInfoForm.setValue('city', value || '')}
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
});