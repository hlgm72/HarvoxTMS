import { useState } from "react";
import { SimpleSidebar } from "./SimpleSidebar";
import { Header } from "./Header";

interface SimpleLayoutProps {
  children: React.ReactNode;
}

export function SimpleLayout({ children }: SimpleLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      <SimpleSidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />
      
      <main 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "ml-12" : "ml-72"
        }`}
      >
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </main>
    </div>
  );
}