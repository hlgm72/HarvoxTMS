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
    <div className="sticky top-14 md:top-16 z-40 w-full border-b border-border bg-card backdrop-blur supports-[backdrop-filter]:bg-card/92">
      <div className="px-2 md:px-4 py-4 md:py-6">
        {/* Title and Actions Row */}
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-heading font-semibold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm md:text-base font-body text-muted-foreground mt-1 truncate">
                    {subtitle}
                  </p>
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