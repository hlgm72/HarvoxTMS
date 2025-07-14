import { ReactNode } from "react";

interface PageToolbarProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
  viewToggle?: ReactNode;
}

export function PageToolbar({ 
  title,
  subtitle,
  actions, 
  viewToggle 
}: PageToolbarProps) {
  return (
    <div className="w-full border-b border-border bg-card backdrop-blur supports-[backdrop-filter]:bg-card/92">
      <div className="px-2 md:px-4 py-4 md:py-6">
        {/* Title and Actions Row */}
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
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