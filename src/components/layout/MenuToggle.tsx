
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

interface MenuToggleProps {
  onToggle?: (isOpen: boolean) => void;
}

export function MenuToggle({ onToggle }: MenuToggleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  
  // Intentar usar useSidebar si está disponible, sino usar eventos personalizados
  let sidebarContext = null;
  try {
    sidebarContext = useSidebar();
  } catch (error) {
    // No hay contexto de sidebar disponible
  }
  
  const handleToggle = useCallback(() => {
    const isMobileDevice = window.innerWidth < 768;
    console.log('🔥 MOBILE MENU DEBUG:', {
      isMobile: isMobileDevice,
      windowWidth: window.innerWidth,
      hasContext: !!sidebarContext,
      currentOpenMobile: sidebarContext?.openMobile,
      currentOpen: sidebarContext?.open,
      isMobileHook: sidebarContext?.isMobile
    });
    
    if (sidebarContext) {
      if (isMobileDevice) {
        // En móvil, usar setOpenMobile directamente
        const newMobileState = !sidebarContext.openMobile;
        console.log('📱 Setting mobile state to:', newMobileState);
        console.log('📱 Sidebar context isMobile:', sidebarContext.isMobile);
        sidebarContext.setOpenMobile(newMobileState);
        onToggle?.(newMobileState);
      } else {
        // En desktop, usar setOpen
        const newDesktopState = !sidebarContext.open;
        console.log('💻 Setting desktop state to:', newDesktopState);
        sidebarContext.setOpen(newDesktopState);
        onToggle?.(newDesktopState);
      }
    } else {
      console.log('❌ No sidebar context available');
      // Fallback: usar eventos personalizados y estado local
      const newState = !isOpen;
      setIsOpen(newState);
      
      console.log('🔘 Independent menu toggle:', newState);
      
      // Notificar al sidebar mediante evento personalizado
      window.dispatchEvent(new CustomEvent('independent-sidebar-toggle', { 
        detail: { open: newState } 
      }));
      
      onToggle?.(newState);
    }
  }, [isOpen, onToggle, sidebarContext]);
  
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
        onClick={(e) => {
          console.log('🚀 BUTTON CLICKED!', { 
            timestamp: Date.now(),
            windowWidth: window.innerWidth,
            isMobile: window.innerWidth < 768
          });
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
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
