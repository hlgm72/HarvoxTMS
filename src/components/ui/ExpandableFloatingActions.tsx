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
    <>
      {/* Botones de acción expandidos */}
      {isExpanded && (
        <div className={cn(
          'fixed z-10 top-1/2 -translate-y-1/2',
          position === 'bottom-right' ? 'right-20' : 'left-20'
        )}>
          <div className="flex flex-col gap-3 items-end">
            {actions.map((action, index) => {
              // Colores pastel diferentes para cada botón
              const pastelColors = [
                'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200', // Azul
                'bg-green-100 hover:bg-green-200 text-green-700 border-green-200', // Verde
                'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200', // Púrpura
                'bg-pink-100 hover:bg-pink-200 text-pink-700 border-pink-200', // Rosa
                'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-200', // Amarillo
                'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200' // Índigo
              ];
              
              const colorClass = pastelColors[index % pastelColors.length];
              
              return (
                <Button
                  key={index}
                  size="default"
                  className={cn(
                    'animate-scale-in h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center gap-1 p-2 border',
                    colorClass,
                    action.className
                  )}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'both'
                  }}
                  onClick={() => handleActionClick(action)}
                >
                  <action.icon className="h-4 w-4" />
                  <span className="text-xs font-medium leading-tight text-center">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón principal */}
      <button
        className={cn(
          'fixed w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-10',
          isExpanded 
            ? 'bg-fleet-orange hover:bg-fleet-orange-dark text-white' 
            : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          'flex items-center justify-center',
          'focus:outline-none active:outline-none',
          'border-0 outline-0',
          positionClasses[position],
          className
        )}
        onClick={handleMainClick}
        aria-label={mainLabel}
      >
        <ArrowLeft className={cn(
          "h-6 w-6 transition-transform duration-300",
          isExpanded ? "rotate-180 -translate-x-2" : "-translate-x-2"
        )} />
      </button>
    </>
  );
}