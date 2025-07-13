import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MenuToggleProps {
  onToggle?: (isOpen: boolean) => void;
}

export function MenuToggle({ onToggle }: MenuToggleProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    console.log('🔘 Independent menu toggle:', newState);
    
    // Notificar al sidebar mediante evento personalizado
    window.dispatchEvent(new CustomEvent('independent-sidebar-toggle', { 
      detail: { open: newState } 
    }));
    
    // Llamar callback si existe
    onToggle?.(newState);
  }, [isOpen, onToggle]);
  
  return (
    <div 
      className="flex-shrink-0" 
      style={{ 
        position: 'relative', 
        zIndex: 100, // Z-index súper alto
        isolation: 'isolate' // Crear contexto de apilamiento
      }}
    >
      <Button 
        variant="ghost" 
        size="sm"
        className="h-8 w-8 p-0 rounded-full border border-border bg-background shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
        onClick={handleToggle}
        style={{ 
          display: 'flex',
          visibility: 'visible',
          opacity: 1,
          minWidth: '32px',
          minHeight: '32px',
          position: 'relative',
          zIndex: 1
        } as React.CSSProperties}
      >
        <Menu 
          className="h-4 w-4" 
          style={{ 
            display: 'block',
            opacity: 1 
          }} 
        />
      </Button>
    </div>
  );
}