import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Users, Truck, Phone, Mail, ArrowUpDown } from "lucide-react";
import { useTranslation } from 'react-i18next';

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

type SortField = 'name' | 'owner_name' | 'plan_type' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface CompanyTableViewProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string, companyName: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function CompanyTableView({ 
  companies, 
  onEdit, 
  onDelete, 
  sortField, 
  sortDirection, 
  onSort 
}: CompanyTableViewProps) {
  const { t } = useTranslation('admin');
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">{t('pages.companies.status.active')}</Badge>;
      case 'inactive':
        return <Badge variant="secondary">{t('pages.companies.status.inactive')}</Badge>;
      case 'suspended':
        return <Badge variant="destructive">{t('pages.companies.status.suspended')}</Badge>;
      default:
        return <Badge variant="outline">{t('pages.companies.status.unknown', { defaultValue: "Unknown" })}</Badge>;
    }
  };

  const getPlanBadge = (planType?: string) => {
    switch (planType) {
      case 'basic':
        return <Badge variant="outline">{t('pages.companies.plans.basic')}</Badge>;
      case 'premium':
        return <Badge variant="default" className="bg-blue-500">{t('pages.companies.plans.premium')}</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-500">{t('pages.companies.plans.enterprise')}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{t('pages.companies.plans.trial')}</Badge>;
      case 'demo':
        return <Badge variant="secondary">{t('pages.companies.plans.demo')}</Badge>;
      default:
        return <Badge variant="outline">{t('pages.companies.plans.basic')}</Badge>;
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name">{t('pages.companies.table.company', { defaultValue: "Company" })}</SortableHeader>
          <SortableHeader field="owner_name">{t('pages.companies.table.owner', { defaultValue: "Owner" })}</SortableHeader>
          <TableHead>{t('pages.companies.table.contact', { defaultValue: "Contact" })}</TableHead>
          <SortableHeader field="plan_type">{t('common.plan')}</SortableHeader>
          <SortableHeader field="status">{t('common.status')}</SortableHeader>
          <TableHead>{t('pages.companies.table.limits', { defaultValue: "Limits" })}</TableHead>
          <SortableHeader field="created_at">{t('pages.companies.table.date', { defaultValue: "Date" })}</SortableHeader>
          <TableHead>{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.id} className="hover:bg-muted/50">
            <TableCell>
              <div>
                <div className="font-medium">{company.name}</div>
                <div className="text-sm text-muted-foreground">
                  {company.street_address}, {company.state_id} {company.zip_code}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{company.owner_name || t('pages.companies.table.not_specified', { defaultValue: "Not specified" })}</div>
                <div className="text-sm text-muted-foreground">
                  {company.owner_title || ""}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                {company.phone && (
                  <div className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{company.email}</span>
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>{getPlanBadge(company.plan_type)}</TableCell>
            <TableCell>{getStatusBadge(company.status)}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="text-sm flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {company.max_users || 5}
                </div>
                <div className="text-sm flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {company.max_vehicles || 10}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {new Date(company.created_at).toLocaleDateString()}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(company)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {(company.plan_type === 'trial' || company.plan_type === 'demo') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('pages.companies.actions.delete_company_title', { defaultValue: "Delete company?" })}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('pages.companies.actions.delete_company_description', {
                            companyName: company.name,
                            defaultValue: `This action will permanently delete the company "${company.name}" and all its associated data. This action cannot be undone.`
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('pages.companies.buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(company.id, company.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('pages.companies.actions.delete_company')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}