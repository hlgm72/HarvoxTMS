// This file has been deprecated in favor of useFleetNotifications
// All notification functionality has been unified under the FleetNotifications system
// 
// To migrate from useToast to useFleetNotifications:
// OLD: const { toast } = useToast();
// NEW: const { showSuccess, showError, showWarning, showInfo } = useFleetNotifications();
//
// Migration examples:
// OLD: toast({ title: "Success", description: "Action completed" });
// NEW: showSuccess("Success", "Action completed");
//
// OLD: toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
// NEW: showError("Error", "Something went wrong");

export { useFleetNotifications } from '@/components/notifications';

// Re-export types for backward compatibility
export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: any;
  duration?: number;
  variant?: 'default' | 'destructive';
}