
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

interface MenuToggleProps {
  onToggle?: (isOpen: boolean) => void;
}

export function MenuToggle({ onToggle }: MenuToggleProps) {
  const { toggleSidebar, isMobile, openMobile, open } = useSidebar();
  
  const handleToggle = useCallback(() => {
    console.log('🔥 MENU TOGGLE CLICKED:', {
      windowWidth: window.innerWidth,
      contextIsMobile: isMobile,
      currentOpenMobile: openMobile,
      currentOpen: open,
      hasToggleSidebar: !!toggleSidebar
    });
    
    toggleSidebar();
    
    // Notificar el nuevo estado al callback opcional
    const newState = isMobile ? !openMobile : !open;
    console.log('📱 New state after toggle:', newState);
    onToggle?.(newState);
  }, [toggleSidebar, onToggle, isMobile, openMobile, open]);
  
  return (
    <div className="flex-shrink-0 pl-3 md:pl-6">
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
