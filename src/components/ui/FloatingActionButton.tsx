import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  label = "CUSTOMIZE",
  className 
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-0 top-1/2 -translate-y-1/2 z-40",
        "flex items-center gap-2 px-3 py-4",
        "bg-primary text-primary-foreground",
        "rounded-l-lg shadow-lg",
        "transition-all duration-300 ease-in-out",
        "hover:px-4 hover:shadow-xl",
        "group",
        className
      )}
    >
      <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
      <span className="writing-mode-vertical text-sm font-semibold tracking-wider">
        {label}
      </span>
    </button>
  );
}
