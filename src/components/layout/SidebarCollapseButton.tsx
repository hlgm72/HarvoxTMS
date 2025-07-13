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
      className="absolute right-3 top-4 z-50 
                 h-8 w-8 p-0 rounded-full border border-white/20 bg-white/10 
                 shadow-sm hover:shadow-md transition-all duration-200 
                 hover:bg-white/20 flex items-center justify-center"
      aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4 text-white" />
      ) : (
        <ChevronLeft className="h-4 w-4 text-white" />
      )}
    </Button>
  );
}