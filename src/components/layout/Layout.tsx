import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarCollapseButton } from "./SidebarCollapseButton";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider 
      defaultOpen
      onOpenChange={(open) => {
        // Solo permitir cambios desde el trigger externo
        console.log('SidebarProvider onOpenChange:', open);
      }}
    >
      <div className="min-h-screen flex w-full bg-background">
        <div className="relative">
          <div onClickCapture={(e) => {
            // Prevenir que clicks dentro del sidebar lo expandan, EXCEPTO el trigger
            const target = e.target as HTMLElement;
            const isInsideSidebar = target.closest('[data-sidebar="true"]');
            const isTrigger = target.closest('[data-sidebar-trigger="true"]');
            
            if (isInsideSidebar && !isTrigger) {
              e.stopPropagation();
            }
          }}>
            <AppSidebar />
            <SidebarCollapseButton />
          </div>
        </div>
        <SidebarInset className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 bg-gradient-subtle">
            <div className="h-full">
              <div className="animate-fade-in">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}