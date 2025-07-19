
import type { ReactNode, CSSProperties } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider 
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as CSSProperties
      }
    >
      <div className="min-h-screen flex w-full bg-background prevent-horizontal-scroll">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 md:!ml-0 md:!mr-0 md:!mt-0">
          <Header />
          <main className="flex-1 bg-gradient-subtle overflow-x-hidden">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
