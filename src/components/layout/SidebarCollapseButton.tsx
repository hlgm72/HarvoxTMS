import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  
  console.log("🔘 SidebarCollapseButton - state:", state, "collapsed:", collapsed);

  const handleClick = () => {
    console.log("🔘 Botón circular clicked, current state:", state);
    toggleSidebar();
  };

  return (
    <Button
      data-sidebar-trigger="true"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`absolute top-6 z-50 h-8 w-8 p-0 rounded-full border border-border bg-background 
                  shadow-lg hover:shadow-xl transition-all duration-200 
                  hover:bg-accent flex items-center justify-center ${
                    collapsed ? "left-4" : "right-[-16px]"
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