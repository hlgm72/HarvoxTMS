import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSetup } from '@/contexts/SetupContext';

const preferencesSchema = z.object({
  language: z.string().min(1, 'El idioma es requerido'),
  theme: z.enum(['light', 'dark', 'system']),
  timezone: z.string().min(1, 'La zona horaria es requerida'),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

const timezones = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Mexico_City',
  'America/Toronto',
  'Europe/London',
  'Europe/Madrid',
  'America/Bogota',
  'America/Lima',
  'America/Argentina/Buenos_Aires'
];

export function PreferencesStepWrapper() {
  const { setupData, updateSetupData } = useSetup();

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: setupData.language || 'es',
      theme: setupData.theme as 'light' | 'dark' | 'system' || 'system',
      timezone: setupData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Sync form changes with setup context
  const watchedFields = form.watch();
  
  useEffect(() => {
    Object.entries(watchedFields).forEach(([key, value]) => {
      if (value !== setupData[key as keyof typeof setupData]) {
        updateSetupData(key as keyof typeof setupData, value);
      }
    });
  }, [watchedFields, updateSetupData, setupData]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Preferencias</h2>
        <p className="text-muted-foreground mt-2">
          Configura tus preferencias de idioma, tema y zona horaria
        </p>
      </div>
      
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idioma</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un idioma" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tema</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tema" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona Horaria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu zona horaria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}