import React, { createContext, useContext, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

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
    throw new Error('useFleetNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { toast } = useToast();

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
    toast({
      title,
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
      duration: options?.duration || 5000,
    });
  };

  const showSuccess = (title: string, message?: string) => {
    showNotification('success', title, message);
  };

  const showError = (title: string, message?: string) => {
    showNotification('error', title, message);
  };

  const showWarning = (title: string, message?: string) => {
    showNotification('warning', title, message);
  };

  const showInfo = (title: string, message?: string) => {
    showNotification('info', title, message);
  };

  const clearAll = () => {
    // Toast doesn't have a clearAll method, but individual toasts auto-dismiss
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