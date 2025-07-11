import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Edit, Trash2, Users, Truck, Phone, Mail, MapPin, User } from "lucide-react";

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

interface CompanyCardsViewProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string, companyName: string) => void;
}

export function CompanyCardsView({ companies, onEdit, onDelete }: CompanyCardsViewProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Activa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactiva</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspendida</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getPlanBadge = (planType?: string) => {
    switch (planType) {
      case 'basic':
        return <Badge variant="outline">Básico</Badge>;
      case 'premium':
        return <Badge variant="default" className="bg-blue-500">Premium</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-500">Enterprise</Badge>;
      case 'trial':
        return <Badge variant="secondary">Prueba</Badge>;
      case 'demo':
        return <Badge variant="secondary">Demo</Badge>;
      default:
        return <Badge variant="outline">Básico</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => (
        <Card key={company.id} className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{company.name}</CardTitle>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(company.status)}
                {getPlanBadge(company.plan_type)}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">
                {company.street_address}, {company.state_id} {company.zip_code}
              </span>
            </div>

            {/* Owner Info */}
            {company.owner_name && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{company.owner_name}</span>
                    {company.owner_title && (
                      <span className="text-muted-foreground ml-1">- {company.owner_title}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2">
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
            </div>

            {/* Limits */}
            <div className="flex justify-between text-sm bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{company.max_users || 5} usuarios</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span>{company.max_vehicles || 10} vehículos</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(company)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              
              {(company.plan_type === 'trial' || company.plan_type === 'demo') && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente la empresa "{company.name}" y todos sus datos asociados.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(company.id, company.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}