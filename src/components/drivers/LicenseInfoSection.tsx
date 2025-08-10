import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { StateCombobox } from "@/components/ui/StateCombobox";
import { Shield } from "lucide-react";
import DatePicker from 'react-datepicker';
import { es } from "date-fns/locale";
import 'react-datepicker/dist/react-datepicker.css';

interface LicenseInfoData {
  license_number: string;
  license_state: string;
  license_issue_date: Date | null;
  license_expiry_date: Date | null;
  cdl_class: string;
  cdl_endorsements: string;
}

interface LicenseInfoSectionProps {
  data: LicenseInfoData;
  onUpdate: (field: keyof LicenseInfoData, value: any) => void;
  loading?: boolean;
}

export function LicenseInfoSection({ data, onUpdate, loading = false }: LicenseInfoSectionProps) {
  const endorsements = [
    { code: 'T', description: 'Doble/triple remolque' },
    { code: 'P', description: 'Transporte de pasajeros' },
    { code: 'S', description: 'Autobuses escolares' },
    { code: 'N', description: 'Vehículos cisterna (tank)' },
    { code: 'H', description: 'Materiales peligrosos' },
    { code: 'X', description: 'Hazmat + cisterna combinados' }
  ];

  const handleEndorsementChange = (endorsementCode: string, checked: boolean) => {
    const currentEndorsements = data.cdl_endorsements.split('').filter(e => e.trim() !== '');
    let newEndorsements;
    
    if (checked) {
      // Agregar el endoso si no existe
      if (!currentEndorsements.includes(endorsementCode)) {
        newEndorsements = [...currentEndorsements, endorsementCode].sort();
      } else {
        newEndorsements = currentEndorsements;
      }
    } else {
      // Remover el endoso
      newEndorsements = currentEndorsements.filter(e => e !== endorsementCode);
    }
    
    onUpdate('cdl_endorsements', newEndorsements.join(''));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Información de Licencia CDL
      </h3>
      
      {/* Una sola fila con los 4 campos: Número de Licencia, Estado, Fecha de Emisión y Fecha de Vencimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="license_number">Número de Licencia</Label>
          <Input
            id="license_number"
            value={data.license_number}
            onChange={(e) => onUpdate('license_number', e.target.value)}
            placeholder="Número de licencia CDL"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_state">Estado de Emisión</Label>
          <StateCombobox
            value={data.license_state}
            onValueChange={(value) => onUpdate('license_state', value || '')}
            placeholder="Selecciona estado..."
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_issue_date">Fecha de Emisión</Label>
          <div>
            <DatePicker
              id="license_issue_date"
              selected={data.license_issue_date}
              onChange={(date: Date | null) => onUpdate('license_issue_date', date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Seleccionar fecha"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={50}
              scrollableYearDropdown
              locale={es}
              disabled={loading}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_expiry_date">Fecha de Vencimiento</Label>
          <div>
            <DatePicker
              id="license_expiry_date"
              selected={data.license_expiry_date}
              onChange={(date: Date | null) => onUpdate('license_expiry_date', date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Seleccionar fecha"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={50}
              scrollableYearDropdown
              locale={es}
              disabled={loading}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
            />
          </div>
        </div>
      </div>

      {/* Clase de CDL debajo */}
      <div className="space-y-2">
        <Label>Clase de CDL</Label>
        <RadioGroup
          value={data.cdl_class}
          onValueChange={(value) => onUpdate('cdl_class', value)}
          className="flex gap-6"
          disabled={loading}
        >
          {['A', 'B', 'C'].map((classType) => (
            <div key={classType} className="flex items-center space-x-2">
              <RadioGroupItem
                value={classType}
                id={`cdl_class_${classType}`}
                disabled={loading}
              />
              <Label htmlFor={`cdl_class_${classType}`} className="text-sm font-normal">
                Clase {classType}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Selecciona la clase de CDL del conductor
        </p>
      </div>

      {/* Sección de Endosos Adicionales */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Endosos Adicionales
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {endorsements.map((endorsement) => {
            const isChecked = data.cdl_endorsements.includes(endorsement.code);
            return (
              <div key={endorsement.code} className="flex items-start space-x-2">
                <Checkbox
                  id={`endorsement_${endorsement.code}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleEndorsementChange(endorsement.code, !!checked)}
                  disabled={loading}
                />
                <div className="flex flex-col">
                  <Label htmlFor={`endorsement_${endorsement.code}`} className="text-sm font-medium">
                    Endoso {endorsement.code}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {endorsement.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}