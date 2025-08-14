import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { createTextHandlers } from '@/lib/textUtils';
import { useTranslation } from 'react-i18next';

interface AddressFormProps {
  streetAddress: string;
  onStreetAddressChange: (value: string) => void;
  stateId?: string;
  onStateChange: (value: string | undefined) => void;
  city?: string;
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
  city,
  onCityChange,
  zipCode,
  onZipCodeChange,
  disabled = false,
  required = true,
  streetAddressLabel,
  stateLabel,
  cityLabel,
  zipCodeLabel
}: AddressFormProps) {
  const { t, i18n } = useTranslation('common');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street-address">
            {streetAddressLabel || t('address.street_address', i18n.language === 'es' ? 'Dirección' : 'Street Address')}
            {required && " *"}
          </Label>
          <Input
            id="street-address"
            value={streetAddress}
            onChange={streetAddressHandlers.onChange}
            onBlur={streetAddressHandlers.onBlur}
            placeholder={t('address.street_address_placeholder', i18n.language === 'es' ? '123 Calle Principal' : '123 Main Street')}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip-code">
            {zipCodeLabel || t('address.zip_code', i18n.language === 'es' ? 'Código Postal' : 'ZIP Code')}
            {required && " *"}
          </Label>
          <Input
            id="zip-code"
            value={zipCode}
            onChange={zipCodeHandlers.onChange}
            onKeyPress={zipCodeHandlers.onKeyPress}
            placeholder={t('address.zip_code_placeholder', '12345')}
            disabled={disabled}
            maxLength={5}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            {stateLabel || t('address.state', i18n.language === 'es' ? 'Estado' : 'State')}
            {required && " *"}
          </Label>
          <StateCombobox
            value={stateId}
            onValueChange={onStateChange}
            disabled={disabled}
            placeholder={t('address.state_placeholder', i18n.language === 'es' ? 'Buscar estado...' : 'Search state...')}
          />
        </div>

        <div className="space-y-2">
          <Label>
            {cityLabel || t('address.city', i18n.language === 'es' ? 'Ciudad' : 'City')}
          </Label>
          <CityCombobox
            value={city}
            onValueChange={onCityChange}
            stateId={stateId}
            disabled={disabled}
            placeholder={t('address.city_placeholder', i18n.language === 'es' ? 'Buscar ciudad (opcional)...' : 'Search city (optional)...')}
          />
        </div>
      </div>
    </div>
  );
}