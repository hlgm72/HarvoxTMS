import { Button } from "@/components/ui/button";
import { Table, Grid3X3, List, BarChart3 } from "lucide-react";
import { useTranslation } from 'react-i18next';

export type ViewMode = 'table' | 'cards' | 'list' | 'dashboard';

interface CompanyViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function CompanyViewToggle({ currentView, onViewChange }: CompanyViewToggleProps) {
  const { t } = useTranslation('admin');
  
  const views = [
    { key: 'table' as ViewMode, icon: Table, label: t('pages.companies.views.table') },
    { key: 'cards' as ViewMode, icon: Grid3X3, label: t('pages.companies.views.cards') },
    { key: 'list' as ViewMode, icon: List, label: t('pages.companies.views.list') },
    { key: 'dashboard' as ViewMode, icon: BarChart3, label: t('pages.companies.views.dashboard') },
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