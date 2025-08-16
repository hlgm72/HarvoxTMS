import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { StateCombobox } from "@/components/ui/StateCombobox";
import { Shield } from "lucide-react";
import DatePicker from 'react-datepicker';
import { enUS, es } from "date-fns/locale";
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
  currentLanguage?: string;
}

export function LicenseInfoSection({ data, onUpdate, loading = false, currentLanguage = 'en' }: LicenseInfoSectionProps) {
  const endorsements = [
    { code: 'T', description: 'Double/triple trailers' },
    { code: 'P', description: 'Passenger transport' },
    { code: 'S', description: 'School buses' },
    { code: 'N', description: 'Tank vehicles' },
    { code: 'H', description: 'Hazardous materials' },
    { code: 'X', description: 'Hazmat + tank combined' }
  ];

  const handleEndorsementChange = (endorsementCode: string, checked: boolean) => {
    const currentEndorsements = data.cdl_endorsements.split('').filter(e => e.trim() !== '');
    let newEndorsements;
    
    if (checked) {
      // Add endorsement if it doesn't exist
      if (!currentEndorsements.includes(endorsementCode)) {
        newEndorsements = [...currentEndorsements, endorsementCode].sort();
      } else {
        newEndorsements = currentEndorsements;
      }
    } else {
      // Remove endorsement
      newEndorsements = currentEndorsements.filter(e => e !== endorsementCode);
    }
    
    onUpdate('cdl_endorsements', newEndorsements.join(''));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        CDL License Information
      </h3>
      
      {/* Single row with 4 fields: License Number, State, Issue Date and Expiry Date */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="license_number">License Number</Label>
          <Input
            id="license_number"
            value={data.license_number}
            onChange={(e) => onUpdate('license_number', e.target.value)}
            placeholder="CDL license number"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_state">Issuing State</Label>
          <StateCombobox
            value={data.license_state}
            onValueChange={(value) => onUpdate('license_state', value || '')}
            placeholder="Select state..."
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_issue_date">Issue Date</Label>
          <div>
            <DatePicker
              id="license_issue_date"
              selected={data.license_issue_date}
              onChange={(date: Date | null) => onUpdate('license_issue_date', date)}
              dateFormat={currentLanguage === 'es' ? "dd/MM/yyyy" : "MM/dd/yyyy"}
              placeholderText="Select date"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={50}
              scrollableYearDropdown
              locale={currentLanguage === 'es' ? es : enUS}
              disabled={loading}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_expiry_date">Expiry Date</Label>
          <div>
            <DatePicker
              id="license_expiry_date"
              selected={data.license_expiry_date}
              onChange={(date: Date | null) => onUpdate('license_expiry_date', date)}
              dateFormat={currentLanguage === 'es' ? "dd/MM/yyyy" : "MM/dd/yyyy"}
              placeholderText="Select date"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={50}
              scrollableYearDropdown
              locale={currentLanguage === 'es' ? es : enUS}
              disabled={loading}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
            />
          </div>
        </div>
      </div>

      {/* CDL Class below */}
      <div className="space-y-2">
        <Label>CDL Class</Label>
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
                Class {classType}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Select the driver's CDL class
        </p>
      </div>

      {/* Additional Endorsements Section */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Additional Endorsements
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
                    Endorsement {endorsement.code}
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