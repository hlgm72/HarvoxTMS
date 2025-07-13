import React, { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop && !sidebarOpen) {
        setSidebarOpen(true);
      } else if (!isDesktop && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  return (
    <SidebarProvider 
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar - Only visible on desktop */}
        <AppSidebar />
        
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