import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { state } = useSidebar();
  
  return (
    <div 
      className="flex-1 flex flex-col transition-all duration-200 ease-linear"
      style={{
        marginLeft: state === "collapsed" ? "56px" : "18rem"
      }}
    >
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4">
        {children}
      </main>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <LayoutContent>{children}</LayoutContent>
      </div>
    </SidebarProvider>
  );
}