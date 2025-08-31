import { Button } from "@/components/ui/button";
import { Table, Grid3X3 } from "lucide-react";
import { useTranslation } from 'react-i18next';

export type FuelViewMode = 'table' | 'cards';

interface FuelViewToggleProps {
  currentView: FuelViewMode;
  onViewChange: (view: FuelViewMode) => void;
}

export function FuelViewToggle({ currentView, onViewChange }: FuelViewToggleProps) {
  const { t } = useTranslation('fuel');
  
  const views = [
    { key: 'table' as FuelViewMode, icon: Table, label: t('expenses_list.views.table') },
    { key: 'cards' as FuelViewMode, icon: Grid3X3, label: t('expenses_list.views.cards') },
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg border">
      {views.map((view) => (
        <Button
          key={view.key}
          variant={currentView === view.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(view.key)}
          className="flex items-center gap-2 min-w-[40px]"
        >
          <view.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{view.label}</span>
        </Button>
      ))}
    </div>
  );
}