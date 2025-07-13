
import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
      <div className="min-h-screen flex w-full bg-background prevent-horizontal-scroll">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 w-full md:w-auto min-w-0">
          <div className="relative">
            <SidebarTrigger className="fixed top-4 left-4 z-50 h-8 w-8 p-0 rounded-full border border-border bg-background shadow-md hover:shadow-lg transition-all duration-200" />
            <Header />
          </div>
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
