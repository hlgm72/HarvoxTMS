import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarCollapseButton } from "./SidebarCollapseButton";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarProvider 
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <div className="min-h-screen flex w-full bg-background">
        <div className="relative">
          <AppSidebar />
          <SidebarCollapseButton />
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