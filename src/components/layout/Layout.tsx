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
  const [allowToggle, setAllowToggle] = useState(false);

  const handleSidebarChange = (open: boolean) => {
    // Solo permitir cambios si están autorizados por el botón oficial
    if (allowToggle) {
      setSidebarOpen(open);
      setAllowToggle(false); // Reset the flag
    }
  };

  const authorizedToggle = () => {
    setAllowToggle(true); // Autorizar el próximo cambio
    setSidebarOpen(prev => !prev);
  };

  return (
    <SidebarProvider 
      open={sidebarOpen}
      onOpenChange={handleSidebarChange}
    >
      <div className="min-h-screen flex w-full bg-background">
        <div className="relative">
          <AppSidebar />
          <SidebarCollapseButton onAuthorizedToggle={authorizedToggle} />
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