export type FuelCardProviderVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'primary' | 'outline';

const PROVIDER_VARIANT_MAP: Record<string, FuelCardProviderVariant> = {
  'efs': 'success',
  'fleetone': 'primary', 
  'wex': 'warning',
  'fuelman': 'destructive',
  'voyager': 'secondary',
  'shell': 'outline',
  'bp': 'default',
};

export const getFuelCardProviderVariant = (provider: string): FuelCardProviderVariant => {
  const normalizedProvider = provider.toLowerCase().trim();
  return PROVIDER_VARIANT_MAP[normalizedProvider] || 'secondary';
};