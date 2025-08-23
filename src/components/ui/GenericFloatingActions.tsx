import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpandableFloatingActions } from '@/components/ui/ExpandableFloatingActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LucideIcon, Filter, FileDown, Settings, BarChart3 } from 'lucide-react';

// Acciones predefinidas comunes
export type StandardActionType = 'filters' | 'export' | 'view' | 'stats';

export interface StandardActionConfig {
  type: StandardActionType;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  isActive?: boolean; // Para mostrar si hay filtros activos
}

export interface CustomActionConfig {
  icon: LucideIcon;
  labelKey?: string; // Translation key
  label?: string; // Custom label (fallback if no translation)
  key: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export interface FloatingActionSheet {
  key: string;
  titleKey?: string; // Translation key for title
  title?: string; // Custom title (fallback if no translation)
  content: React.ReactNode;
}

interface GenericFloatingActionsProps {
  // Usar acciones estándar (automáticamente traducidas)
  standardActions?: StandardActionConfig[];
  // O acciones completamente personalizadas
  customActions?: CustomActionConfig[];
  sheets: FloatingActionSheet[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  namespace?: string; // Namespace para traducciones, default: 'common'
  onActionClick?: (actionKey: string) => void;
}

const STANDARD_ACTIONS = {
  filters: {
    icon: Filter,
    labelKey: 'floating_actions.filters.filters',
    labelActiveKey: 'floating_actions.filters.filters_active',
    titleKey: 'floating_actions.filters.title'
  },
  export: {
    icon: FileDown,
    labelKey: 'floating_actions.export.export',
    titleKey: 'floating_actions.export.title'
  },
  view: {
    icon: Settings,
    labelKey: 'floating_actions.view.view',
    titleKey: 'floating_actions.view.title'
  },
  stats: {
    icon: BarChart3,
    labelKey: 'floating_actions.stats.statistics',
    titleKey: 'floating_actions.stats.title'
  }
} as const;

export function GenericFloatingActions({
  standardActions = [],
  customActions = [],
  sheets,
  position = "bottom-right",
  namespace = 'common',
  onActionClick
}: GenericFloatingActionsProps) {
  const { t } = useTranslation([namespace, 'common']);
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

  // Construir acciones expandibles
  const floatingActions = [
    // Acciones estándar (auto-traducidas)
    ...standardActions.map(action => {
      const config = STANDARD_ACTIONS[action.type];
      const isActive = action.isActive || false;
      
      return {
        icon: config.icon,
        label: isActive && action.type === 'filters'
          ? t('floating_actions.filters.filters_active', { ns: 'common' })
          : t(config.labelKey, { ns: 'common' }),
        onClick: () => openSheet(action.type),
        variant: action.variant || 'default' as const,
        className: isActive ? 'bg-blue-600 hover:bg-blue-700' : ''
      };
    }),
    // Acciones personalizadas
    ...customActions.map(action => ({
      icon: action.icon,
      label: action.labelKey 
        ? t(action.labelKey, { ns: namespace })
        : action.label || action.key,
      onClick: () => openSheet(action.key),
      variant: action.variant || 'default' as const
    }))
  ];

  const activeSheetData = sheets.find(sheet => sheet.key === activeSheet);

  // Obtener título traducido para sheet activo
  const getSheetTitle = () => {
    if (!activeSheetData) return '';
    
    // Si es una acción estándar, usar su título traducido
    const standardAction = standardActions.find(a => a.type === activeSheet);
    if (standardAction) {
      const config = STANDARD_ACTIONS[standardAction.type];
      return t(config.titleKey, { ns: 'common' });
    }
    
    // Si tiene titleKey, usarla
    if (activeSheetData.titleKey) {
      return t(activeSheetData.titleKey, { ns: namespace });
    }
    
    // Fallback al título personalizado
    return activeSheetData.title || '';
  };

  return (
    <>
      <ExpandableFloatingActions
        actions={floatingActions}
        position={position}
        mainLabel={t('floating_actions.title', { ns: 'common' })}
      />

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          {activeSheetData && (
            <>
              <SheetHeader>
                <SheetTitle>{getSheetTitle()}</SheetTitle>
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