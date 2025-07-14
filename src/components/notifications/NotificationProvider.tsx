import React, { createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  showNotification: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string,
    options?: {
      duration?: number;
      showAction?: boolean;
      actionText?: string;
      onAction?: () => void;
      persistent?: boolean;
    }
  ) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useFleetNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return a safe fallback that uses toast directly
    return {
      showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
        const fullMessage = message ? `${title}: ${message}` : title;
        switch (type) {
          case 'success':
            toast.success(fullMessage);
            break;
          case 'error':
            toast.error(fullMessage);
            break;
          case 'warning':
            toast.warning(fullMessage);
            break;
          case 'info':
            toast.info(fullMessage);
            break;
        }
      },
      showSuccess: (title: string, message?: string) => {
        const fullMessage = message ? `${title}: ${message}` : title;
        toast.success(fullMessage);
      },
      showError: (title: string, message?: string) => {
        const fullMessage = message ? `${title}: ${message}` : title;
        toast.error(fullMessage);
      },
      showWarning: (title: string, message?: string) => {
        const fullMessage = message ? `${title}: ${message}` : title;
        toast.warning(fullMessage);
      },
      showInfo: (title: string, message?: string) => {
        const fullMessage = message ? `${title}: ${message}` : title;
        toast.info(fullMessage);
      },
      clearAll: () => toast.dismiss()
    };
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string,
    options?: {
      duration?: number;
      showAction?: boolean;
      actionText?: string;
      onAction?: () => void;
      persistent?: boolean;
    }
  ) => {
    const fullMessage = message ? `${title}: ${message}` : title;
    const duration = options?.persistent ? Infinity : (options?.duration || 4000);
    
    switch (type) {
      case 'success':
        toast.success(fullMessage, { duration });
        break;
      case 'error':
        toast.error(fullMessage, { duration });
        break;
      case 'warning':
        toast.warning(fullMessage, { duration });
        break;
      case 'info':
        toast.info(fullMessage, { duration });
        break;
    }
  };

  const showSuccess = (title: string, message?: string) => {
    const fullMessage = message ? `${title}: ${message}` : title;
    toast.success(fullMessage);
  };

  const showError = (title: string, message?: string) => {
    const fullMessage = message ? `${title}: ${message}` : title;
    toast.error(fullMessage);
  };

  const showWarning = (title: string, message?: string) => {
    const fullMessage = message ? `${title}: ${message}` : title;
    toast.warning(fullMessage);
  };

  const showInfo = (title: string, message?: string) => {
    const fullMessage = message ? `${title}: ${message}` : title;
    toast.info(fullMessage);
  };

  const clearAll = () => {
    toast.dismiss();
  };

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}