
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider 
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties
      }
    >
      <div className="min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 bg-gradient-subtle overflow-hidden pt-14 md:pt-16">
            <div className="h-full overflow-y-auto">
              <div className="animate-fade-in min-h-full">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
