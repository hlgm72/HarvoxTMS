import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarCollapseButton({ collapsed, onToggle }: SidebarCollapseButtonProps) {

  return (
    <Button
      data-sidebar-trigger="true"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={`absolute top-4 z-50 h-8 w-8 p-0 rounded-full border border-border bg-background 
                  shadow-md hover:shadow-lg transition-all duration-200 
                  hover:bg-accent flex items-center justify-center ${
                    collapsed ? "right-[-24px] translate-x-0" : "right-0 translate-x-1/2"
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