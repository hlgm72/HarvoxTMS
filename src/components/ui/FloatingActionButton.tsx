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
        "flex items-center justify-end gap-2",
        "bg-primary text-primary-foreground",
        "rounded-l-lg shadow-lg",
        "transition-all duration-300 ease-in-out",
        "w-12 hover:w-auto hover:px-4",
        "h-12",
        "overflow-hidden",
        "group",
        className
      )}
    >
      <Settings className="h-5 w-5 min-w-[20px] ml-3 transition-transform duration-300 group-hover:rotate-90" />
      <span className="opacity-0 max-w-0 text-sm font-semibold tracking-wider whitespace-nowrap transition-all duration-300 group-hover:opacity-100 group-hover:max-w-[200px] group-hover:ml-2 mr-3">
        {label}
      </span>
    </button>
  );
}
