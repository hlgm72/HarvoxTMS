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
    'bottom-right': 'bottom-6 -right-7',
    'bottom-left': 'bottom-6 -left-7', 
    'top-right': 'top-6 -right-7',
    'top-left': 'top-6 -left-7'
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

      {/* Contenedor para el semicírculo */}
      <div className="relative">
        {/* Botones de acción en semicírculo */}
        {isExpanded && actions.map((action, index) => {
          // Calcular posición en semicírculo
          const radius = 80; // Radio del semicírculo
          const totalActions = actions.length;
          const angleStart = -Math.PI / 2; // -90 grados (arriba)
          const angleEnd = -Math.PI; // -180 grados (izquierda)
          const angleStep = (angleEnd - angleStart) / Math.max(totalActions - 1, 1);
          const angle = angleStart + (angleStep * index);
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={index}
              className={cn(
                'absolute flex items-center gap-3 z-10',
                'animate-scale-in'
              )}
              style={{ 
                transform: `translate(${x - 24}px, ${y - 24}px)`,
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              {/* Label a la izquierda */}
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
          );
        })}

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
    </div>
  );
}