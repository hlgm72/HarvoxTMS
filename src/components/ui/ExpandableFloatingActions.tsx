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
    'bottom-right': 'top-1/2 -translate-y-1/2 -right-7',
    'bottom-left': 'top-1/2 -translate-y-1/2 -left-7', 
    'top-right': 'top-1/2 -translate-y-1/2 -right-7',
    'top-left': 'top-1/2 -translate-y-1/2 -left-7'
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
      'fixed z-50',
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

      {/* Contenedor relativo para posicionar elementos */}
      <div className="relative flex items-center">
        {/* Botones de acción a la izquierda del botón principal */}
        <div className={cn(
          'flex flex-col gap-3 transition-all duration-300 ease-out mr-4 items-end',
          isExpanded 
            ? 'opacity-100 scale-100 translate-x-0' 
            : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
        )}>
          {actions.map((action, index) => (
            <div
              key={index}
              className={cn(
                'animate-scale-in flex items-center gap-3'
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

        {/* Botón principal como semicírculo */}
        <button
          className={cn(
            'w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-transform duration-300',
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
    </div>
  );
}