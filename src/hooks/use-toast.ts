// This file has been completely migrated to useFleetNotifications
// All toast functionality is now unified under the FleetNotifications system
//
// MIGRATION COMPLETE ✅
// - Eliminated the problematic standalone toast() function
// - All files now use useFleetNotifications directly
// - No more agent loops or timeout issues
//
// Usage pattern:
// const { showSuccess, showError, showWarning, showInfo } = useFleetNotifications();

export { useFleetNotifications } from '@/components/notifications';

// Legacy types for backward compatibility
export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: any;
  duration?: number;
  variant?: 'default' | 'destructive';
}