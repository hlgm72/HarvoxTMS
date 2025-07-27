import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Download, CheckSquare, XSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { getTodayInUserTimeZone } from '@/lib/dateFormatting';

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
  const { t } = useTranslation('admin');
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
      t('pages.companies.export.headers', { 
        defaultValue: 'Name,Email,Phone,Address,State,ZIP Code,Plan,Status,Owner,Creation Date' 
      }),
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
        new Date(company.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `companies_${getTodayInUserTimeZone()}.csv`);
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
      case 'active': return t('pages.companies.actions.activate', { defaultValue: 'activate' });
      case 'inactive': return t('pages.companies.actions.deactivate', { defaultValue: 'deactivate' });
      case 'suspended': return t('pages.companies.actions.suspend', { defaultValue: 'suspend' });
      default: return t('pages.companies.actions.modify', { defaultValue: 'modify' });
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
            {t('pages.companies.actions.select_all', { 
              selected: selectedCompanies.length, 
              total: companies.length,
              defaultValue: `Select all (${selectedCompanies.length}/${companies.length})`
            })}
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('pages.companies.actions.export_data')} {selectedCompanies.length > 0 ? `(${selectedCompanies.length})` : t('pages.companies.actions.export_all', { defaultValue: 'All' })}
          </Button>

          {selectedCompanies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {t('pages.companies.actions.bulk_actions')} ({selectedCompanies.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                <DropdownMenuItem onClick={() => handleBulkAction('active')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {t('pages.companies.actions.activate_companies', { defaultValue: 'Activate companies' })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('inactive')}>
                  <XSquare className="h-4 w-4 mr-2" />
                  {t('pages.companies.actions.deactivate_companies', { defaultValue: 'Deactivate companies' })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('suspended')}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('pages.companies.actions.suspend_companies', { defaultValue: 'Suspend companies' })}
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
            <DialogTitle>{t('pages.companies.actions.confirm_bulk_action', { defaultValue: 'Confirm Bulk Action' })}</DialogTitle>
            <DialogDescription>
              {t('pages.companies.actions.bulk_action_confirmation', {
                action: getActionText(pendingAction),
                count: selectedCompanies.length,
                defaultValue: `Are you sure you want to ${getActionText(pendingAction)} ${selectedCompanies.length} selected companies? This action will be applied to all selected companies.`
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              {t('pages.companies.buttons.cancel')}
            </Button>
            <Button onClick={confirmBulkAction}>
              {t('pages.companies.actions.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}