import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface FleetNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  showAction?: boolean;
  actionText?: string;
  onAction?: () => void;
  persistent?: boolean;
}

interface NotificationItemProps {
  notification: FleetNotification;
  onClose: (id: string) => void;
}

const notificationConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-gradient-to-r from-emerald-500/90 to-emerald-600',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-white',
    textColor: 'text-white',
    shadow: 'shadow-lg shadow-emerald-500/30'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-gradient-to-r from-red-500/90 to-red-600',
    borderColor: 'border-red-500/30',
    iconColor: 'text-white',
    textColor: 'text-white',
    shadow: 'shadow-lg shadow-red-500/30'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-gradient-to-r from-amber-500/90 to-amber-600',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-white',
    textColor: 'text-white',
    shadow: 'shadow-lg shadow-amber-500/30'
  },
  info: {
    icon: Info,
    bgColor: 'bg-gradient-to-r from-blue-500/90 to-blue-600',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-white',
    textColor: 'text-white',
    shadow: 'shadow-lg shadow-blue-500/30'
  }
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const config = notificationConfig[notification.type];
  const Icon = config.icon;
  const duration = notification.duration || 5000;

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-xl border backdrop-blur-sm overflow-hidden',
        'animate-fade-in transition-all duration-300 hover:scale-105',
        config.bgColor,
        config.borderColor,
        config.shadow,
        'min-w-[320px] max-w-[420px]'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn('h-5 w-5', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-heading font-semibold text-sm', config.textColor)}>
          {notification.title}
        </h4>
        {notification.message && (
          <p className={cn('mt-1 text-sm opacity-90 font-body', config.textColor)}>
            {notification.message}
          </p>
        )}
        
        {/* Action Button */}
        {notification.showAction && notification.onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={notification.onAction}
            className="mt-3 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white"
          >
            {notification.actionText || 'Action'}
          </Button>
        )}
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onClose(notification.id)}
        className={cn(
          'flex-shrink-0 h-6 w-6 p-0 rounded-full',
          'hover:bg-white/20 transition-colors',
          config.textColor
        )}
      >
        <X className="h-3 w-3" />
      </Button>

      {/* Progress Bar */}
      {!notification.persistent && (
        <div 
          className="absolute bottom-0 left-0 h-1.5 bg-white/50 rounded-b-xl transition-all"
          style={{
            width: '100%',
            animation: `shrink-width ${duration}ms linear forwards`
          }}
        />
      )}
    </div>
  );
}