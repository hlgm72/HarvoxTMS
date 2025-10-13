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
        "flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "rounded-l-lg shadow-lg",
        "transition-all duration-300 ease-in-out",
        "w-12 hover:w-auto",
        "h-12",
        "overflow-hidden",
        "group",
        className
      )}
    >
      <Settings className="h-5 w-5 min-w-[20px] transition-transform duration-300 group-hover:rotate-90 group-hover:ml-4" />
      <span className="opacity-0 w-0 text-sm font-semibold tracking-wider whitespace-nowrap transition-all duration-300 group-hover:opacity-100 group-hover:w-auto group-hover:ml-2 group-hover:mr-4">
        {label}
      </span>
    </button>
  );
}
