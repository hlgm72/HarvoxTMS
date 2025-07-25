
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
      <div className="min-h-screen flex w-full bg-background prevent-horizontal-scroll gap-[0px] !gap-0">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 ml-0 !m-0 !p-0 !gap-0">
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
