import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSetup } from '@/contexts/SetupContext';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const CDL_CLASSES = ['A', 'B', 'C'];

export function DriverInfoStep() {
  const { setupData, updateSetupData } = useSetup();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Información del Conductor</h2>
        <p className="text-muted-foreground mt-2">
          Completa tu información de conductor para finalizar la configuración
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="driverId">ID del Conductor</Label>
          <Input
            id="driverId"
            value={setupData.driverId}
            onChange={(e) => updateSetupData('driverId', e.target.value)}
            placeholder="ID único del conductor"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseNumber">Número de Licencia *</Label>
          <Input
            id="licenseNumber"
            value={setupData.licenseNumber}
            onChange={(e) => updateSetupData('licenseNumber', e.target.value)}
            placeholder="Número de licencia de conducir"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="licenseState">Estado de la Licencia *</Label>
          <Select 
            value={setupData.licenseState} 
            onValueChange={(value) => updateSetupData('licenseState', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseIssueDate">Fecha de Emisión</Label>
          <Input
            id="licenseIssueDate"
            type="date"
            value={setupData.licenseIssueDate}
            onChange={(e) => updateSetupData('licenseIssueDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseExpiryDate">Fecha de Vencimiento</Label>
          <Input
            id="licenseExpiryDate"
            type="date"
            value={setupData.licenseExpiryDate}
            onChange={(e) => updateSetupData('licenseExpiryDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cdlClass">Clase CDL</Label>
          <Select 
            value={setupData.cdlClass} 
            onValueChange={(value) => updateSetupData('cdlClass', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona clase CDL" />
            </SelectTrigger>
            <SelectContent>
              {CDL_CLASSES.map((cdlClass) => (
                <SelectItem key={cdlClass} value={cdlClass}>
                  Clase {cdlClass}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cdlEndorsements">Endorsos CDL</Label>
          <Input
            id="cdlEndorsements"
            value={setupData.cdlEndorsements}
            onChange={(e) => updateSetupData('cdlEndorsements', e.target.value)}
            placeholder="Ej: H, N, P, S, T, X"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={setupData.dateOfBirth}
          onChange={(e) => updateSetupData('dateOfBirth', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="emergencyContactName">Contacto de Emergencia</Label>
          <Input
            id="emergencyContactName"
            value={setupData.emergencyContactName}
            onChange={(e) => updateSetupData('emergencyContactName', e.target.value)}
            placeholder="Nombre del contacto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia</Label>
          <Input
            id="emergencyContactPhone"
            type="tel"
            value={setupData.emergencyContactPhone}
            onChange={(e) => updateSetupData('emergencyContactPhone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
    </div>
  );
}