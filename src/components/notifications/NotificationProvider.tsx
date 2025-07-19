import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { NotificationItem, FleetNotification, NotificationType } from './NotificationItem';

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
  notifications: FleetNotification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useFleetNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useFleetNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<FleetNotification[]>([]);

  const addNotification = useCallback((notification: Omit<FleetNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: FleetNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (!notification.persistent) {
      const duration = notification.duration || 4000;
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
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
    addNotification({
      type,
      title,
      message,
      duration: options?.duration,
      showAction: options?.showAction,
      actionText: options?.actionText,
      onAction: options?.onAction,
      persistent: options?.persistent
    });
  }, [addNotification]);

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

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
    notifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
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