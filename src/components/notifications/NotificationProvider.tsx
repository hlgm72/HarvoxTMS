import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationItem, FleetNotification, NotificationType } from './NotificationItem';

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
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
  const [notifications, setNotifications] = useState<FleetNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((
    type: NotificationType,
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
    const id = Math.random().toString(36).substr(2, 9);
    const notification: FleetNotification = {
      id,
      type,
      title,
      message,
      duration: options?.duration || 5000,
      showAction: options?.showAction || false,
      actionText: options?.actionText,
      onAction: options?.onAction,
      persistent: options?.persistent || false
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after duration (unless persistent)
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  }, [removeNotification]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showNotification('success', title, message);
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string) => {
    showNotification('error', title, message);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    showNotification('warning', title, message);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    showNotification('info', title, message);
  }, [showNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        clearAll
      }}
    >
      {children}
      
      {/* Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationItem
              notification={notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}