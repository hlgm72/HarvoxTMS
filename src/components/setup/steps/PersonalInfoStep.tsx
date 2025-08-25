import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetup } from '@/contexts/SetupContext';

export function PersonalInfoStep() {
  const { setupData, updateSetupData } = useSetup();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Información Personal</h2>
        <p className="text-muted-foreground mt-2">
          Completa tu información básica para personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre *</Label>
          <Input
            id="firstName"
            value={setupData.firstName}
            onChange={(e) => updateSetupData('firstName', e.target.value)}
            placeholder="Tu nombre"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido *</Label>
          <Input
            id="lastName"
            value={setupData.lastName}
            onChange={(e) => updateSetupData('lastName', e.target.value)}
            placeholder="Tu apellido"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico *</Label>
        <Input
          id="email"
          type="email"
          value={setupData.email}
          onChange={(e) => updateSetupData('email', e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={setupData.phone}
          onChange={(e) => updateSetupData('phone', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
    </div>
  );
}