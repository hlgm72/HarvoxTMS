import React, { useState } from "react";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarCollapseButton } from "./SidebarCollapseButton";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="relative">
        <AppSidebar collapsed={!sidebarOpen} />
        <SidebarCollapseButton collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      </div>
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 bg-gradient-subtle">
          <div className="h-full">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}