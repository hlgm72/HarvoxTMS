import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSidebar}
      className={`absolute top-4 z-50 h-8 w-8 p-0 rounded-full border border-border bg-background 
                  shadow-md hover:shadow-lg transition-all duration-200 
                  hover:bg-accent flex items-center justify-center ${
                    collapsed ? "right-[-20px] translate-x-0" : "right-0 translate-x-1/2"
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