import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFleetNotifications } from '@/components/notifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Save, RotateCcw, Eye, EyeOff } from 'lucide-react';

const onboardingPreferencesSchema = z.object({
  disable_welcome_modal: z.boolean().default(false),
  disable_onboarding_tour: z.boolean().default(false),
  disable_setup_wizard: z.boolean().default(false),
});

type OnboardingPreferencesFormData = z.infer<typeof onboardingPreferencesSchema>;

interface OnboardingPreferencesFormProps {
  className?: string;
}

export function OnboardingPreferencesForm({ className }: OnboardingPreferencesFormProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const { preferences, updatePreferences } = useUserPreferences();
  const [updating, setUpdating] = useState(false);

  const form = useForm<OnboardingPreferencesFormData>({
    resolver: zodResolver(onboardingPreferencesSchema),
    defaultValues: {
      disable_welcome_modal: preferences?.disable_welcome_modal || false,
      disable_onboarding_tour: preferences?.disable_onboarding_tour || false,
      disable_setup_wizard: preferences?.disable_setup_wizard || false,
    },
  });

  // Update form when preferences change
  useEffect(() => {
    if (preferences) {
      form.reset({
        disable_welcome_modal: preferences.disable_welcome_modal || false,
        disable_onboarding_tour: preferences.disable_onboarding_tour || false,
        disable_setup_wizard: preferences.disable_setup_wizard || false,
      });
    }
  }, [preferences, form]);

  const onSubmit = async (data: OnboardingPreferencesFormData) => {
    setUpdating(true);
    try {
      const result = await updatePreferences(data);
      if (result.success) {
        showSuccess(
          "Preferencias actualizadas",
          "Tus preferencias de introducción han sido guardadas correctamente."
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      form.reset({
        disable_welcome_modal: preferences.disable_welcome_modal || false,
        disable_onboarding_tour: preferences.disable_onboarding_tour || false,
        disable_setup_wizard: preferences.disable_setup_wizard || false,
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preferencias de Introducción
        </CardTitle>
        <CardDescription>
          Controla qué elementos de bienvenida y configuración inicial se muestran cuando accedes a la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="disable_welcome_modal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Deshabilitar Modal de Bienvenida
                    </FormLabel>
                    <FormDescription>
                      No mostrar el modal de bienvenida al acceder por primera vez a cada sección.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disable_onboarding_tour"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Deshabilitar Tour Guiado
                    </FormLabel>
                    <FormDescription>
                      No mostrar el tour interactivo que explica las funcionalidades principales.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disable_setup_wizard"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Deshabilitar Asistente de Configuración
                    </FormLabel>
                    <FormDescription>
                      No mostrar el asistente que ayuda a configurar perfiles, equipos y otros datos iniciales.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={updating} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {updating ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}