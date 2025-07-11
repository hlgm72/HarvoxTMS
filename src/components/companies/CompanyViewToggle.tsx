import { Button } from "@/components/ui/button";
import { Table, Grid3X3, List, BarChart3 } from "lucide-react";

export type ViewMode = 'table' | 'cards' | 'list' | 'dashboard';

interface CompanyViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function CompanyViewToggle({ currentView, onViewChange }: CompanyViewToggleProps) {
  const views = [
    { key: 'table' as ViewMode, icon: Table, label: 'Tabla' },
    { key: 'cards' as ViewMode, icon: Grid3X3, label: 'Tarjetas' },
    { key: 'list' as ViewMode, icon: List, label: 'Lista' },
    { key: 'dashboard' as ViewMode, icon: BarChart3, label: 'Dashboard' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {views.map((view) => (
        <Button
          key={view.key}
          variant={currentView === view.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(view.key)}
          className="flex items-center gap-2"
        >
          <view.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{view.label}</span>
        </Button>
      ))}
    </div>
  );
}