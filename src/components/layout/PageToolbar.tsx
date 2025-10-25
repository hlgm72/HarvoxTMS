import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageToolbarProps {
  icon?: LucideIcon;
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
  viewToggle?: ReactNode;
}

export function PageToolbar({ 
  icon: Icon,
  title,
  subtitle,
  actions, 
  viewToggle 
}: PageToolbarProps) {
  return (
    <div className="w-full border-b border-border bg-card backdrop-blur supports-[backdrop-filter]:bg-card/92">
      <div className="px-2 md:px-4 py-2 md:py-3">
        {/* Title and Actions Row */}
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-heading font-semibold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <div className="text-xs md:text-sm font-body text-muted-foreground mt-0.5 space-y-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {viewToggle}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}