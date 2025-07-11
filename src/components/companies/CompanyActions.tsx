import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Download, CheckSquare, XSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  plan_type?: string;
  status?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_title?: string;
  max_users?: number;
  max_vehicles?: number;
  created_at: string;
}

interface CompanyActionsProps {
  companies: Company[];
  selectedCompanies: string[];
  onSelectedCompaniesChange: (ids: string[]) => void;
  onBulkStatusChange: (status: string) => void;
}

export function CompanyActions({ 
  companies, 
  selectedCompanies, 
  onSelectedCompaniesChange,
  onBulkStatusChange 
}: CompanyActionsProps) {
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedCompaniesChange(companies.map(c => c.id));
    } else {
      onSelectedCompaniesChange([]);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedCompanies.length > 0 
      ? companies.filter(c => selectedCompanies.includes(c.id))
      : companies;

    const csvContent = [
      // Header
      'Nombre,Email,Teléfono,Dirección,Estado,Código Postal,Plan,Estado,Propietario,Fecha Creación',
      // Data
      ...dataToExport.map(company => [
        company.name,
        company.email || '',
        company.phone || '',
        company.street_address,
        company.state_id,
        company.zip_code,
        company.plan_type || 'basic',
        company.status || 'unknown',
        company.owner_name || '',
        new Date(company.created_at).toLocaleDateString('es-ES')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `empresas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBulkAction = (action: string) => {
    setPendingAction(action);
    setIsBulkDialogOpen(true);
  };

  const confirmBulkAction = () => {
    onBulkStatusChange(pendingAction);
    setIsBulkDialogOpen(false);
    setPendingAction('');
    onSelectedCompaniesChange([]);
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'active': return 'activar';
      case 'inactive': return 'desactivar';
      case 'suspended': return 'suspender';
      default: return 'modificar';
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Select All */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedCompanies.length === companies.length && companies.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Seleccionar todo ({selectedCompanies.length}/{companies.length})
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar {selectedCompanies.length > 0 ? `(${selectedCompanies.length})` : 'Todo'}
          </Button>

          {selectedCompanies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Acciones ({selectedCompanies.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                <DropdownMenuItem onClick={() => handleBulkAction('active')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Activar empresas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('inactive')}>
                  <XSquare className="h-4 w-4 mr-2" />
                  Desactivar empresas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('suspended')}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Suspender empresas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Acción Masiva</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres {getActionText(pendingAction)} {selectedCompanies.length} empresas seleccionadas?
              Esta acción se aplicará a todas las empresas seleccionadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmBulkAction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}