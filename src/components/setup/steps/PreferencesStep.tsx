import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSetup } from '@/contexts/SetupContext';

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

export function PreferencesStep() {
  const { setupData, updateSetupData } = useSetup();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Preferencias</h2>
        <p className="text-muted-foreground mt-2">
          Configura tus preferencias de idioma, tema y zona horaria
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Idioma</Label>
          <Select 
            value={setupData.language} 
            onValueChange={(value) => updateSetupData('language', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Tema</Label>
          <Select 
            value={setupData.theme} 
            onValueChange={(value) => updateSetupData('theme', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Oscuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Zona Horaria</Label>
          <Select 
            value={setupData.timezone} 
            onValueChange={(value) => {
              console.log('🕐 Timezone selected:', value);
              updateSetupData('timezone', value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Zona horaria actual:</strong> {setupData.timezone}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Esta configuración afectará cómo se muestran las fechas y horas en la aplicación.
        </p>
      </div>
    </div>
  );
}