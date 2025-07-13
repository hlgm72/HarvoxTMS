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
  title?: string;
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
    <div className="border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="px-6 py-4 space-y-3">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={getDashboardUrl()} className="flex items-center gap-2">
                <Home className="h-3 w-3" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title and Actions Row */}
        <div className="flex items-center justify-between">
          {title && (
            <h1 className="text-xl font-semibold text-foreground">
              {title}
            </h1>
          )}
          <div className="flex items-center gap-2">
            {viewToggle}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}