
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

// Helper to read sidebar state from cookie
const getSidebarStateFromCookie = (): boolean => {
  if (typeof document === 'undefined') return true;
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('sidebar:state='));
  return cookie ? cookie.split('=')[1] === 'true' : true;
};

export function Layout({ children }: LayoutProps) {
  const [defaultOpen] = React.useState(() => getSidebarStateFromCookie());

  return (
    <SidebarProvider 
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties
      }
    >
      <div className="min-h-screen w-full bg-background prevent-horizontal-scroll" style={{ display: 'flex', gap: '0px', margin: 0, padding: 0 }}>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0" style={{ marginLeft: '0px', padding: 0 }}>
          <Header />
          <main className="flex-1 bg-gradient-subtle overflow-hidden">
            <div className="h-full overflow-y-auto pt-14 md:pt-16">
              <div className="animate-fade-in min-h-full flex flex-col">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
