import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { createTextHandlers } from '@/lib/textUtils';

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
  // Create handlers for street address with proper text control
  const streetAddressHandlers = createTextHandlers(onStreetAddressChange);
  
  // Create handlers for zip code with numeric input control
  const handleZipCodeInput = (value: string): string => {
    // Remove all non-numeric characters and limit to 5 digits
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 5);
  };
  
  const zipCodeHandlers = {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = handleZipCodeInput(e.target.value);
      onZipCodeChange(formattedValue);
    },
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow only numbers, backspace, delete, arrows
      const allowedKeys = /[0-9]/;
      const specialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
      
      if (!allowedKeys.test(e.key) && !specialKeys.includes(e.key)) {
        e.preventDefault();
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="street-address">
          {streetAddressLabel}
          {required && " *"}
        </Label>
        <Input
          id="street-address"
          value={streetAddress}
          onChange={streetAddressHandlers.onChange}
          onBlur={streetAddressHandlers.onBlur}
          placeholder="123 Calle Principal"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="space-y-2">
          <Label htmlFor="zip-code">
            {zipCodeLabel}
            {required && " *"}
          </Label>
          <Input
            id="zip-code"
            value={zipCode}
            onChange={zipCodeHandlers.onChange}
            onKeyPress={zipCodeHandlers.onKeyPress}
            placeholder="12345"
            disabled={disabled}
            maxLength={5}
          />
        </div>
      </div>
    </div>
  );
}