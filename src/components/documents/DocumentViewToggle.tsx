import { Button } from "@/components/ui/button";
import { Grid3X3, List } from "lucide-react";

export type DocumentViewMode = 'cards' | 'list';

interface DocumentViewToggleProps {
  currentView: DocumentViewMode;
  onViewChange: (view: DocumentViewMode) => void;
}

export function DocumentViewToggle({ currentView, onViewChange }: DocumentViewToggleProps) {
  const views = [
    { key: 'cards' as DocumentViewMode, icon: Grid3X3, label: 'Tarjetas' },
    { key: 'list' as DocumentViewMode, icon: List, label: 'Lista' },
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