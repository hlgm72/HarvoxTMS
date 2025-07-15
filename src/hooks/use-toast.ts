// Re-export from sonner for consistent toast usage across the app
import { toast as sonnerToast } from "sonner";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: any;
  duration?: number;
  variant?: 'default' | 'destructive';
}

function useToast() {
  const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
    if (variant === 'destructive') {
      sonnerToast.error(title || 'Error', { description, duration });
    } else {
      sonnerToast.success(title || 'Success', { description, duration });
    }
  };

  return {
    toast,
    toasts: [] as Toast[], // Empty array to satisfy existing code
    dismiss: () => sonnerToast.dismiss()
  };
}

const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
  if (variant === 'destructive') {
    sonnerToast.error(title || 'Error', { description, duration });
  } else {
    sonnerToast.success(title || 'Success', { description, duration });
  }
};

export { useToast, toast };