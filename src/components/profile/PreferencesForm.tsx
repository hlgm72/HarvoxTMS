import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const preferencesSchema = z.object({
  preferred_language: z.string().optional(),
  timezone: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface PreferencesFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function PreferencesForm({ onCancel, showCancelButton = true, className }: PreferencesFormProps) {
  const { t, i18n } = useTranslation(['common']);
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, user, refreshProfile } = useUserProfile();
  const [updating, setUpdating] = useState(false);

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferred_language: 'en',
      timezone: 'America/New_York',
    },
  });

  useEffect(() => {
    if (profile) {
      preferencesForm.reset({
        preferred_language: profile.preferred_language || 'en',
        timezone: profile.timezone || 'America/New_York',
      });
    }
  }, [profile, preferencesForm]);

  const onSubmitPreferences = async (data: PreferencesFormData) => {
    if (!user) return;

    setUpdating(true);
    try {
      console.log('Attempting to save preferences data:', {
        user_id: user.id,
        preferred_language: data.preferred_language || 'en',
        timezone: data.timezone || 'America/New_York',
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferred_language: data.preferred_language || 'en',
          timezone: data.timezone || 'America/New_York',
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving preferences:', error);
        throw error;
      }

      console.log('Preferences saved successfully, refreshing profile data...');
      
      // Update i18n language if changed
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }

      // Refresh profile data to update the UI
      await refreshProfile();

      showSuccess(
        "Preferencias actualizadas exitosamente",
        "Su configuración de idioma y zona horaria ha sido guardada correctamente."
      );
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización de las preferencias. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      preferencesForm.reset({
        preferred_language: profile.preferred_language || 'en',
        timezone: profile.timezone || 'America/New_York',
      });
    }
    onCancel?.();
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-medium">Preferencias</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          Configura tu idioma preferido y zona horaria
        </p>
      </div>
      
      <Form {...preferencesForm}>
        <form onSubmit={preferencesForm.handleSubmit(onSubmitPreferences)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={preferencesForm.control}
              name="preferred_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Idioma Preferido</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un idioma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={preferencesForm.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Zona Horaria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona zona horaria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="America/New_York">Este (Nueva York)</SelectItem>
                      <SelectItem value="America/Chicago">Central (Chicago)</SelectItem>
                      <SelectItem value="America/Denver">Montaña (Denver)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacífico (Los Ángeles)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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