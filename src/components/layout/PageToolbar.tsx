import { ReactNode } from "react";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageToolbarProps {
  breadcrumbs: BreadcrumbItem[];
  title?: string | ReactNode;
  actions?: ReactNode;
  viewToggle?: ReactNode;
}

export function PageToolbar({ 
  breadcrumbs, 
  title, 
  actions, 
  viewToggle 
}: PageToolbarProps) {
  const { 
    isSuperAdmin, 
    isCompanyOwner, 
    isOperationsManager, 
    isDispatcher, 
    isDriver 
  } = useAuth();

  // Función para determinar el dashboard correcto según el rol
  const getDashboardUrl = () => {
    if (isSuperAdmin) return "/superadmin";
    if (isCompanyOwner) return "/dashboard/owner";
    if (isOperationsManager) return "/dashboard/operations";
    if (isDispatcher) return "/dashboard/dispatch";
    if (isDriver) return "/dashboard/driver";
    
    // Fallback por defecto
    return "/dashboard";
  };
  return (
    <div className="w-full border-b border-border bg-card backdrop-blur supports-[backdrop-filter]:bg-card/92">
      <div className="px-3 md:px-6 py-3 md:py-4 space-y-2 md:space-y-3">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={getDashboardUrl()} className="flex items-center gap-1 md:gap-2">
                <Home className="h-3 w-3" />
                <span className="hidden sm:inline">Inicio</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1 md:gap-2">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href} className="truncate max-w-32 md:max-w-none">
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="truncate max-w-32 md:max-w-none">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title and Actions Row */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {title && (
            <h1 className="text-lg md:text-xl font-semibold text-foreground truncate min-w-0 flex-1 md:flex-initial">
              {title}
            </h1>
          )}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {viewToggle}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}