
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Button
      data-sidebar-trigger="true"
      variant="ghost"
      size="sm"
      onClick={toggleSidebar}
      className={`fixed top-4 z-50 h-8 w-8 p-0 rounded-full border border-border bg-background 
                  shadow-md hover:shadow-lg transition-all duration-200 
                  hover:bg-accent flex items-center justify-center ${
                    collapsed 
                      ? "left-[60px]" // Posición cuando está colapsado
                      : "left-[264px]" // Posición cuando está expandido (280px - 16px)
                  }`}
      aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </Button>
  );
}
