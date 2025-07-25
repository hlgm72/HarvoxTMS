
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

interface MenuToggleProps {
  onToggle?: (isOpen: boolean) => void;
}

export function MenuToggle({ onToggle }: MenuToggleProps) {
  // Safe sidebar hook usage with fallback
  let sidebarContext;
  try {
    sidebarContext = useSidebar();
  } catch (error) {
    // Fallback when sidebar context is not available
    console.warn('MenuToggle: Sidebar context not available, using fallback');
    sidebarContext = {
      toggleSidebar: () => {},
      isMobile: false,
      openMobile: false,
      open: true
    };
  }
  
  const { toggleSidebar, isMobile, openMobile, open } = sidebarContext;
  
  const handleToggle = useCallback(() => {
    toggleSidebar();
    
    // Notificar el nuevo estado al callback opcional
    const newState = isMobile ? !openMobile : !open;
    onToggle?.(newState);
  }, [toggleSidebar, onToggle, isMobile, openMobile, open]);
  
  return (
    <div className="flex-shrink-0 pl-1 md:pl-3">
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
