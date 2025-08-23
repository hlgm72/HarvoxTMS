import { useState } from 'react';
import { ExpandableFloatingActions } from '@/components/ui/ExpandableFloatingActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LucideIcon } from 'lucide-react';

export interface FloatingActionConfig {
  icon: LucideIcon;
  label: string;
  key: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export interface FloatingActionSheet {
  key: string;
  title: string;
  content: React.ReactNode;
}

interface GenericFloatingActionsProps {
  actions: FloatingActionConfig[];
  sheets: FloatingActionSheet[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  mainLabel?: string;
  onActionClick?: (actionKey: string) => void;
}

export function GenericFloatingActions({
  actions,
  sheets,
  position = "bottom-right",
  mainLabel,
  onActionClick
}: GenericFloatingActionsProps) {
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openSheet = (sheetKey: string) => {
    setActiveSheet(sheetKey);
    setIsSheetOpen(true);
    onActionClick?.(sheetKey);
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setIsSheetOpen(false);
  };

  const floatingActions = actions.map(action => ({
    icon: action.icon,
    label: action.label,
    onClick: () => openSheet(action.key),
    variant: action.variant || 'default' as const
  }));

  const activeSheetData = sheets.find(sheet => sheet.key === activeSheet);

  return (
    <>
      <ExpandableFloatingActions
        actions={floatingActions}
        position={position}
        mainLabel={mainLabel}
      />

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          {activeSheetData && (
            <>
              <SheetHeader>
                <SheetTitle>{activeSheetData.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {activeSheetData.content}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}