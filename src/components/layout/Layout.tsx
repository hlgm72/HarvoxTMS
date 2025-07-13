import React, { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarCollapseButton } from "./SidebarCollapseButton";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Auto-open sidebar on desktop - solo initial
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      // Solo cambiar automáticamente en el resize inicial, no interferir después
      setSidebarOpen(isDesktop);
    };
    
    // Solo ejecutar una vez al montar el componente
    handleResize();
  }, []); // Sin dependencia en sidebarOpen para evitar loops

  console.log("🏠 Layout - sidebarOpen:", sidebarOpen);

  return (
    <SidebarProvider 
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      defaultOpen={false}
    >
      <div className="min-h-screen flex w-full bg-background relative">
        {/* Sidebar */}
        <AppSidebar />
        
        {/* Botón colapsar desktop - posicionado relativamente al sidebar */}
        <div className="hidden md:block relative">
          <SidebarCollapseButton />
        </div>
        
        {/* Main content area */}
        <SidebarInset className="flex flex-col flex-1 w-full min-w-0 overflow-x-hidden">
          <Header />
          <main className="flex-1 bg-gradient-subtle p-2 md:p-4 overflow-x-auto">
            <div className="h-full w-full max-w-none">
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