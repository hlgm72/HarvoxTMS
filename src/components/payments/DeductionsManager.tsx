import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, AlertTriangle, DollarSign, Clock, User, Settings, Edit, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseTemplateDialog } from "./ExpenseTemplateDialog";
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
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const isCreateDialogOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsCreateDialogOpen = externalOnChange || setInternalIsOpen;

  // Obtener plantillas de deducciones activas
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

      // Obtener plantillas ACTIVAS para estos conductores
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

  // Obtener plantillas INACTIVAS para reactivación
  const { data: inactiveTemplates = [], refetch: refetchInactiveTemplates } = useQuery({
    queryKey: ['inactive-expense-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) return [];
      
      // Solo permitir a company_owner y operations_manager ver plantillas inactivas
      const hasAdminRole = userRoles.some(role => 
        ['company_owner', 'operations_manager'].includes(role.role)
      );
      
      if (!hasAdminRole) return [];
      
      const companyId = userRoles[0].company_id;
      
      // Obtener conductores de la empresa
      const { data: driverRoles } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('role', 'driver')
        .eq('is_active', true);

      const driverIds = driverRoles?.map(role => role.user_id) || [];
      if (!driverIds.includes(user.id)) {
        driverIds.push(user.id);
      }

      if (driverIds.length === 0) return [];

      // Obtener plantillas INACTIVAS
      const { data: templatesData, error } = await supabase
        .from('recurring_expense_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('driver_user_id', driverIds)
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      if (!templatesData || templatesData.length === 0) return [];

      // Obtener perfiles de conductores
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
    refetchInactiveTemplates();
    // Invalidar también las estadísticas para que se actualicen
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
  };

  const handleEditSuccess = () => {
    setEditingTemplate(null);
    refetchTemplates();
    refetchInactiveTemplates();
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
  };

  // Mutation para eliminar plantilla (marcar como inactiva)
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
        description: "Plantilla desactivada exitosamente",
      });
      refetchTemplates();
      refetchInactiveTemplates();
      queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo desactivar la plantilla",
        variant: "destructive",
      });
    }
  });

  // Mutation para reactivar plantilla
  const reactivateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('recurring_expense_templates')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Plantilla reactivada exitosamente",
      });
      refetchTemplates();
      refetchInactiveTemplates();
      queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar la plantilla",
        variant: "destructive",
      });
    }
  });

  const handleDeleteTemplate = (templateId: string) => {
    setDeletingTemplate(templateId);
  };

  const handleReactivateTemplate = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que quieres reactivar esta plantilla? Se volverán a generar deducciones automáticas.')) {
      reactivateTemplateMutation.mutate(templateId);
    }
  };

  const confirmDeleteTemplate = () => {
    if (deletingTemplate) {
      deleteTemplateMutation.mutate(deletingTemplate);
      setDeletingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Plantillas Activas</TabsTrigger>
          <TabsTrigger value="inactive">Plantillas Inactivas</TabsTrigger>
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
                        <p>{format(new Date(template.start_date + 'T00:00:00'), "PPP", { locale: es })}</p>
                      </div>
                      {template.end_date && (
                        <div>
                          <span className="text-muted-foreground">Vigente hasta:</span>
                          <p>{format(new Date(template.end_date + 'T00:00:00'), "PPP", { locale: es })}</p>
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

        <TabsContent value="inactive" className="space-y-4">
          {inactiveTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay plantillas inactivas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inactiveTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow border-muted">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-muted-foreground">
                            {template.driver_profile?.first_name} {template.driver_profile?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {template.expense_types?.name} - {template.expense_types?.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg text-muted-foreground">${template.amount}</p>
                          <Badge variant="secondary">
                            Inactiva • {template.frequency === 'weekly' ? 'Semanal' : 
                             template.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReactivateTemplate(template.id)}
                            disabled={reactivateTemplateMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reactivar
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Desactivada:</span>
                        <p>{format(new Date(template.updated_at), "PPP", { locale: es })}</p>
                      </div>
                      <div>
                        <span>Vigente desde:</span>
                        <p>{format(new Date(template.start_date + 'T00:00:00'), "PPP", { locale: es })}</p>
                      </div>
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

      {/* Dialog unificado para crear/editar plantilla */}
      {(isCreateDialogOpen || editingTemplate) && (
        <ExpenseTemplateDialog
          isOpen={isCreateDialogOpen || !!editingTemplate}
          onClose={() => {
            setIsCreateDialogOpen(false);
            setEditingTemplate(null);
          }}
          onSuccess={editingTemplate ? handleEditSuccess : handleCreateSuccess}
          mode={editingTemplate ? 'edit' : 'create'}
          template={editingTemplate}
        />
      )}

      {/* Dialog de confirmación para eliminar plantilla */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla de deducción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la plantilla como inactiva y ya no se generarán nuevas deducciones automáticas. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}