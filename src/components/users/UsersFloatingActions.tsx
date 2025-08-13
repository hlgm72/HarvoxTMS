import { useState } from 'react';
import { Filter, FileDown, Settings, BarChart3 } from 'lucide-react';
import { ExpandableFloatingActions } from '@/components/ui/ExpandableFloatingActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserFiltersSheet } from './UserFiltersSheet';

interface UsersFloatingActionsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export function UsersFloatingActions({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter
}: UsersFloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'export' | 'view' | 'stats'>('filters');

  const openSheet = (tab: 'filters' | 'export' | 'view' | 'stats') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const floatingActions = [
    {
      icon: Filter,
      label: 'Filtros',
      onClick: () => openSheet('filters'),
      variant: 'default' as const
    },
    {
      icon: FileDown,
      label: 'Exportar',
      onClick: () => openSheet('export'),
      variant: 'default' as const
    },
    {
      icon: Settings,
      label: 'Vista',
      onClick: () => openSheet('view'),
      variant: 'default' as const
    },
    {
      icon: BarChart3,
      label: 'Stats',
      onClick: () => openSheet('stats'),
      variant: 'default' as const
    }
  ];

  return (
    <>
      <ExpandableFloatingActions
        actions={floatingActions}
        position="bottom-right"
      />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {activeTab === 'filters' && 'Filtros de usuarios'}
              {activeTab === 'export' && 'Exportar datos'}
              {activeTab === 'view' && 'Configurar vista'}
              {activeTab === 'stats' && 'Estadísticas'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {activeTab === 'filters' && (
              <UserFiltersSheet
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Exportar lista de usuarios en diferentes formatos
                </p>
                {/* Aquí irían las opciones de exportación */}
              </div>
            )}

            {activeTab === 'view' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurar cómo se muestran los usuarios
                </p>
                {/* Aquí irían las opciones de vista */}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Estadísticas de usuarios
                </p>
                {/* Aquí irían las estadísticas */}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}