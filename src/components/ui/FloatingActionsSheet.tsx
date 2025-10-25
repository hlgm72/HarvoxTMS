import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingActionButton } from "./FloatingActionButton";
import { LucideIcon } from "lucide-react";

export interface FloatingActionTab {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
  badge?: string | number;
}

interface FloatingActionsSheetProps {
  tabs: FloatingActionTab[];
  buttonLabel?: string;
  defaultTab?: string;
  className?: string;
}

export function FloatingActionsSheet({ 
  tabs, 
  buttonLabel = "ACTIONS",
  defaultTab,
  className 
}: FloatingActionsSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <>
      <FloatingActionButton 
        onClick={() => setIsOpen(true)} 
        label={buttonLabel}
        className={className}
      />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{tabs.find(t => t.id === activeTab)?.label || buttonLabel}</SheetTitle>
            <SheetDescription>
              Manage your settings and preferences
            </SheetDescription>
          </SheetHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid grid-cols-2 w-full h-auto gap-1 p-1 bg-muted/30 rounded-lg min-h-[60px]">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="relative flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
                >
                  <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
