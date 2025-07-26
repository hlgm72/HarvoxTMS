
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
      <div className="min-h-screen w-full bg-background prevent-horizontal-scroll" style={{ display: 'flex', gap: '0px', margin: 0, padding: 0 }}>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden" style={{ marginLeft: '0px', padding: 0 }}>
          <Header />
          <main className="flex-1 bg-gradient-subtle overflow-y-auto">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
