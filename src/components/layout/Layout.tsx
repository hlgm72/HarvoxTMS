
import React from "react";
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
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties
      }
    >
      <div className="min-h-screen flex w-full bg-background prevent-horizontal-scroll relative">
        {/* Sidebar desktop */}
        <AppSidebar />
        
        {/* Botón de colapso - siempre visible */}
        <SidebarCollapseButton />
        
        {/* Main content area */}
        <SidebarInset className="flex flex-col flex-1 w-full md:w-auto min-w-0">
          <Header />
          <main className="flex-1 bg-gradient-subtle p-2 md:p-4 overflow-x-hidden">
            <div className="h-full max-w-full">
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
