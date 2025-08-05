import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

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
  mainIcon: MainIcon = ArrowLeft,
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
            <Button
              key={index}
              size="default"
              variant={action.variant || 'default'}
              className={cn(
                'animate-scale-in h-11 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2 whitespace-nowrap',
                action.className
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
              onClick={() => handleActionClick(action)}
            >
              <action.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Botón principal como semicírculo */}
        <button
          className={cn(
            'w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-transform duration-300',
            'bg-primary hover:bg-primary/90 text-primary-foreground',
            'flex items-center justify-center',
            'focus:outline-none active:outline-none',
            'border-0 outline-0'
          )}
          onClick={handleMainClick}
          aria-label={mainLabel}
        >
          <ArrowLeft className={cn(
            "h-6 w-6 transition-transform duration-300",
            isExpanded ? "rotate-180 -translate-x-2" : "-translate-x-2"
          )} />
        </button>
      </div>
    </div>
  );
}