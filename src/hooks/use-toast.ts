// Simplified toast hook to avoid React context issues
export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: any;
  duration?: number;
  variant?: 'default' | 'destructive';
}

// Simple console-based implementation to avoid useState issues
function useToast() {
  const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
    const message = `${variant === 'destructive' ? 'ERROR' : 'INFO'}: ${title}${description ? ` - ${description}` : ''}`;
    console.log(message);
    
    // Simple browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title || 'Notification', { 
        body: description,
        icon: '/eagle-favicon.svg'
      });
    }
  };

  return {
    toast,
    toasts: [] as Toast[], // Empty array to satisfy existing code
    dismiss: () => console.log('Toast dismissed')
  };
}

const toast = ({ title, description, variant, duration }: Omit<Toast, 'id'>) => {
  const message = `${variant === 'destructive' ? 'ERROR' : 'INFO'}: ${title}${description ? ` - ${description}` : ''}`;
  console.log(message);
  
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title || 'Notification', { 
      body: description,
      icon: '/eagle-favicon.svg'
    });
  }
};

export { useToast, toast };