// Re-export FleetNotifications for consistent toast usage across the app
import { useFleetNotifications } from "@/components/notifications";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: any;
  duration?: number;
  variant?: 'default' | 'destructive';
}

function useToast() {
  const fleetNotifications = useFleetNotifications();
  
  const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
    if (variant === 'destructive') {
      fleetNotifications.showError(title || 'Error', description);
    } else {
      fleetNotifications.showSuccess(title || 'Success', description);
    }
  };

  return {
    toast,
    toasts: [] as Toast[], // Empty array to satisfy existing code
    dismiss: () => {} // Not needed with FleetNotifications
  };
}

const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
  // This standalone function can't use the hook, so we'll keep basic functionality
  console.warn('Using standalone toast function - consider using useFleetNotifications hook instead');
};

export { useToast, toast };