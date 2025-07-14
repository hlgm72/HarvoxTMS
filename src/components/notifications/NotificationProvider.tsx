import React, { createContext, useContext, ReactNode } from 'react';

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
    // Return a safe fallback instead of throwing
    return {
      showNotification: () => console.log('Notification context not available'),
      showSuccess: () => console.log('Success notification'),
      showError: () => console.log('Error notification'),
      showWarning: () => console.log('Warning notification'),
      showInfo: () => console.log('Info notification'),
      clearAll: () => console.log('Clear all notifications')
    };
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Use simple console logging instead of complex state management
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
    console.log(`${type.toUpperCase()}: ${title}${message ? ` - ${message}` : ''}`);
    
    // Create a simple browser notification for now
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
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
    console.log('Clear all notifications');
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