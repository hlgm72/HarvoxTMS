import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, AlertTriangle, DollarSign, Clock, User, Settings, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreateExpenseTemplateDialog } from "./CreateExpenseTemplateDialog";
import { EditExpenseTemplateDialog } from "./EditExpenseTemplateDialog";
import { EmptyDeductionsState } from "./EmptyDeductionsState";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface DeductionsManagerProps {
  isCreateDialogOpen?: boolean;
  onCreateDialogChange?: (open: boolean) => void;
}

export function DeductionsManager({ 
  isCreateDialogOpen: externalIsOpen, 
  onCreateDialogChange: externalOnChange 
}: DeductionsManagerProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Use external state if provided, otherwise use internal state
  const isCreateDialogOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsCreateDialogOpen = externalOnChange || setInternalIsOpen;

  // Obtener plantillas de deducciones reales
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['recurring-expense-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) return [];
      
      // Tomar la primera empresa (en caso de múltiples roles)
      const companyId = userRoles[0].company_id;
      
      // Obtener conductores de la empresa
      const { data: driverRoles } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('role', 'driver')
        .eq('is_active', true);

      // Incluir también al usuario actual si es owner/manager
      const currentUserRoles = userRoles.map(role => role.company_id);
      const { data: currentUserRole } = await supabase
        .from('user_company_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      const driverIds = driverRoles?.map(role => role.user_id) || [];
      
      // Si el usuario actual es owner o manager, incluirlo en la lista
      if (currentUserRole && ['company_owner', 'operations_manager'].includes(currentUserRole.role)) {
        if (!driverIds.includes(user.id)) {
          driverIds.push(user.id);
        }
      }

      if (driverIds.length === 0) return [];

      // Obtener plantillas para estos conductores
      const { data: templatesData, error } = await supabase
        .from('recurring_expense_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('driver_user_id', driverIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!templatesData || templatesData.length === 0) return [];

      // Obtener perfiles de conductores por separado
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', templatesData.map(t => t.driver_user_id));

      if (profilesError) throw profilesError;

      // Combinar datos
      const templatesWithProfiles = templatesData.map(template => {
        const profile = profilesData?.find(p => p.user_id === template.driver_user_id);
        return {
          ...template,
          driver_profile: profile
        };
      });

      return templatesWithProfiles;
    },
    enabled: !!user?.id,
  });

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetchTemplates();
    // Invalidar también las estadísticas para que se actualicen
    queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
  };

  const handleEditSuccess = () => {
    setEditingTemplate(null);
    refetchTemplates();
    queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
  };

  // Mutation para eliminar plantilla
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('recurring_expense_templates')
        .update({ is_active: false })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Plantilla eliminada exitosamente",
      });
      refetchTemplates();
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la plantilla",
        variant: "destructive",
      });
    }
  });

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Plantillas Activas</TabsTrigger>
          <TabsTrigger value="instances">Instancias Generadas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <EmptyDeductionsState onCreateTemplate={() => setIsCreateDialogOpen(true)} />
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {template.driver_profile?.first_name} {template.driver_profile?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {template.expense_types?.name} - {template.expense_types?.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">${template.amount}</p>
                          <Badge variant="outline">
                            {template.frequency === 'weekly' ? 'Semanal' : 
                             template.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Vigente desde:</span>
                        <p>{format(new Date(template.start_date), "PPP", { locale: es })}</p>
                      </div>
                      {template.end_date && (
                        <div>
                          <span className="text-muted-foreground">Vigente hasta:</span>
                          <p>{format(new Date(template.end_date), "PPP", { locale: es })}</p>
                        </div>
                      )}
                    </div>
                    
                    {template.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <strong>Notas:</strong> {template.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances">
          <Card>
            <CardHeader>
              <CardTitle>Instancias Generadas</CardTitle>
              <CardDescription>
                Gastos generados automáticamente a partir de las plantillas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente - Instancias de gastos procesados</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
              <CardDescription>
                Registro de modificaciones en las plantillas de deducciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente - Historial de cambios</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para editar plantilla */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Plantilla de Deducción</DialogTitle>
              <DialogDescription>
                Modifica los datos de la plantilla de deducción
              </DialogDescription>
            </DialogHeader>
            <EditExpenseTemplateDialog 
              template={editingTemplate}
              onClose={() => setEditingTemplate(null)}
              onSuccess={handleEditSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}