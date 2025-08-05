import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface FloatingAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

interface ExpandableFloatingActionsProps {
  actions: FloatingAction[];
  mainIcon?: React.ComponentType<{ className?: string }>;
  mainLabel?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export function ExpandableFloatingActions({
  actions,
  mainIcon: MainIcon = Plus,
  mainLabel = 'Acciones',
  position = 'bottom-right',
  className
}: ExpandableFloatingActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6', 
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const animationClasses = {
    'bottom-right': 'flex-col-reverse',
    'bottom-left': 'flex-col-reverse',
    'top-right': 'flex-col',
    'top-left': 'flex-col'
  };

  const handleMainClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleActionClick = (action: FloatingAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div className={cn(
      'fixed z-50 flex items-end gap-3',
      animationClasses[position],
      positionClasses[position],
      className
    )}>
      {/* Backdrop para cerrar al hacer click fuera */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Botones de acción */}
      <div className={cn(
        'flex gap-3 transition-all duration-300 ease-out',
        animationClasses[position],
        isExpanded 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
      )}>
        {actions.map((action, index) => (
          <div
            key={index}
            className={cn(
              'animate-scale-in flex items-center gap-3',
              position.includes('right') ? 'flex-row-reverse' : 'flex-row'
            )}
            style={{ 
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            {/* Label */}
            <div className={cn(
              'bg-card/95 backdrop-blur-sm text-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-lg border border-border/20 whitespace-nowrap',
              'transition-all duration-200 hover:bg-card'
            )}>
              {action.label}
            </div>
            
            {/* Button */}
            <Button
              size="default"
              variant={action.variant || 'default'}
              className={cn(
                'h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
                action.className
              )}
              onClick={() => handleActionClick(action)}
            >
              <action.icon className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Botón principal */}
      <button
        className={cn(
          'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-transform duration-300',
          'bg-primary hover:bg-primary/90 text-primary-foreground',
          'flex items-center justify-center',
          'focus:outline-none active:outline-none',
          'border-0 outline-0',
          isExpanded ? 'rotate-45' : 'rotate-0'
        )}
        onClick={handleMainClick}
        aria-label={mainLabel}
      >
        {isExpanded ? (
          <X className="h-6 w-6" />
        ) : (
          <MainIcon className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}