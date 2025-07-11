import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { CityCombobox } from '@/components/ui/CityCombobox';

interface AddressFormProps {
  streetAddress: string;
  onStreetAddressChange: (value: string) => void;
  stateId?: string;
  onStateChange: (value: string | undefined) => void;
  cityId?: string;
  onCityChange: (value: string | undefined) => void;
  zipCode: string;
  onZipCodeChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  streetAddressLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
  zipCodeLabel?: string;
}

export function AddressForm({
  streetAddress,
  onStreetAddressChange,
  stateId,
  onStateChange,
  cityId,
  onCityChange,
  zipCode,
  onZipCodeChange,
  disabled = false,
  required = true,
  streetAddressLabel = "Dirección",
  stateLabel = "Estado",
  cityLabel = "Ciudad",
  zipCodeLabel = "Código Postal"
}: AddressFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="street-address">
          {streetAddressLabel}
          {required && " *"}
        </Label>
        <Input
          id="street-address"
          value={streetAddress}
          onChange={(e) => onStreetAddressChange(e.target.value)}
          placeholder="123 Calle Principal"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zip-code">
          {zipCodeLabel}
          {required && " *"}
        </Label>
        <Input
          id="zip-code"
          value={zipCode}
          onChange={(e) => onZipCodeChange(e.target.value)}
          placeholder="12345"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>
          {stateLabel}
          {required && " *"}
        </Label>
        <StateCombobox
          value={stateId}
          onValueChange={onStateChange}
          disabled={disabled}
          placeholder="Buscar estado..."
        />
      </div>

      <div className="space-y-2">
        <Label>
          {cityLabel}
        </Label>
        <CityCombobox
          value={cityId}
          onValueChange={onCityChange}
          stateId={stateId}
          disabled={disabled}
          placeholder="Buscar ciudad (opcional)..."
        />
      </div>
    </div>
  );
}