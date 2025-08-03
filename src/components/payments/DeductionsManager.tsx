import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExpenseTemplateDialog } from "./ExpenseTemplateDialog";
import { CreateEventualDeductionDialog } from "./CreateEventualDeductionDialog";
import { EventualDeductionsList } from "./EventualDeductionsList";
import { formatDateOnly } from '@/lib/dateFormatting';
import { DollarSign, Edit, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";

interface DeductionsManagerProps {
  isCreateDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
  filters?: {
    status: string;
    driver: string;
    expenseType: string;
    userRole?: string; // Nuevo campo para filtrar por tipo de usuario
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  viewConfig?: {
    density: string;
    sortBy: string;
    groupBy: string;
    showDriverInfo: boolean;
    showAmounts: boolean;
    showDates: boolean;
    showExpenseType: boolean;
  };
}

export function DeductionsManager({ 
  isCreateDialogOpen: externalIsCreateDialogOpen, 
  onCreateDialogOpenChange,
  filters,
  viewConfig 
}: DeductionsManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEventualDialogOpen, setIsEventualDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Obtener plantillas de deducciones activas
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['recurring-expense-templates', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) return [];
      
      const companyId = userRoles[0].company_id;
      
      // Obtener todos los usuarios de la empresa según el rol especificado
      let roleFilter: ('driver' | 'dispatcher')[] = ['driver', 'dispatcher'];
      
      if (filters?.userRole) {
        roleFilter = [filters.userRole as 'driver' | 'dispatcher'];
      }
      
      const { data: companyUsers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .in('role', roleFilter)
        .eq('is_active', true);

      const userIds = companyUsers?.map(role => role.user_id) || [];
      
      if (userIds.length === 0) return [];

      // Construir la consulta base
      let query = supabase
        .from('recurring_expense_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('user_id', userIds)
        .eq('is_active', true);

      // Aplicar filtro por rol aplicado
      if (filters?.userRole) {
        query = query.eq('applied_to_role', filters.userRole as 'driver' | 'dispatcher');
      }

      // Aplicar otros filtros
      if (filters?.driver && filters.driver !== 'all') {
        query = query.eq('user_id', filters.driver);
      }

      if (filters?.expenseType && filters.expenseType !== 'all') {
        query = query.eq('expense_type_id', filters.expenseType);
      }

      // Aplicar ordenación según viewConfig
      const sortBy = viewConfig?.sortBy || 'date_desc';
      switch (sortBy) {
        case 'amount_desc':
          query = query.order('amount', { ascending: false });
          break;
        case 'amount_asc':
          query = query.order('amount', { ascending: true });
          break;
        case 'date_asc':
          query = query.order('created_at', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data: templatesData, error } = await query;

      if (error) throw error;
      
      if (!templatesData || templatesData.length === 0) return [];

      // Obtener perfiles de conductores y sus roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', templatesData.map(t => t.user_id));

      if (profilesError) throw profilesError;

      // Obtener roles de los usuarios
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id, role')
        .in('user_id', templatesData.map(t => t.user_id))
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Combinar datos
      const templatesWithProfiles = templatesData.map(template => {
        const profile = profilesData?.find(p => p.user_id === template.user_id);
        const userRoles = rolesData?.filter(r => r.user_id === template.user_id).map(r => r.role) || [];
        return {
          ...template,
          driver_profile: profile,
          user_profile: profile, // Alias para mantener compatibilidad
          user_roles: userRoles
        };
      });

      return templatesWithProfiles;
    },
    enabled: !!user?.id,
  });

  // Obtener plantillas INACTIVAS
  const { data: inactiveTemplates = [], refetch: refetchInactiveTemplates } = useQuery({
    queryKey: ['inactive-expense-templates', user?.id, filters],
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
      
      // Obtener todos los usuarios de la empresa según el rol especificado  
      let roleFilter: ('driver' | 'dispatcher')[] = ['driver', 'dispatcher'];
      
      if (filters?.userRole) {
        roleFilter = [filters.userRole as 'driver' | 'dispatcher'];
      }
      
      const { data: companyUsers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .in('role', roleFilter)
        .eq('is_active', true);

      const userIds = companyUsers?.map(role => role.user_id) || [];

      if (userIds.length === 0) return [];

      // Construir la consulta base para plantillas inactivas
      let query = supabase
        .from('recurring_expense_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('user_id', userIds)
        .eq('is_active', false);

      // Aplicar filtro por rol aplicado
      if (filters?.userRole) {
        query = query.eq('applied_to_role', filters.userRole as 'driver' | 'dispatcher');
      }

      // Aplicar otros filtros
      if (filters?.driver && filters.driver !== 'all') {
        query = query.eq('user_id', filters.driver);
      }

      if (filters?.expenseType && filters.expenseType !== 'all') {
        query = query.eq('expense_type_id', filters.expenseType);
      }

      // Aplicar ordenación según viewConfig
      const sortBy = viewConfig?.sortBy || 'date_desc';
      switch (sortBy) {
        case 'amount_desc':
          query = query.order('amount', { ascending: false });
          break;
        case 'amount_asc':
          query = query.order('amount', { ascending: true });
          break;
        case 'date_asc':
          query = query.order('updated_at', { ascending: true });
          break;
        default:
          query = query.order('updated_at', { ascending: false });
      }

      const { data: templatesData, error } = await query;

      if (error) throw error;
      
      if (!templatesData || templatesData.length === 0) return [];

      // Obtener perfiles de conductores
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', templatesData.map(t => t.user_id));

      if (profilesError) throw profilesError;

      // Combinar datos
      const templatesWithProfiles = templatesData.map(template => {
        const profile = profilesData?.find(p => p.user_id === template.user_id);
        return {
          ...template,
          driver_profile: profile
        };
      });

      return templatesWithProfiles;
    },
    enabled: !!user?.id,
  });

  const handleEventualSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsEventualDialogOpen(false);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetchTemplates();
    refetchInactiveTemplates();
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['recurring-expense-templates'] });
    queryClient.invalidateQueries({ queryKey: ['inactive-expense-templates'] });
  };

  const handleEditSuccess = () => {
    setEditingTemplate(null);
    refetchTemplates();
    refetchInactiveTemplates();
    queryClient.invalidateQueries({ queryKey: ['deductions-stats', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['recurring-expense-templates'] });
    queryClient.invalidateQueries({ queryKey: ['inactive-expense-templates'] });
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
      showSuccess("Éxito", "Plantilla desactivada exitosamente");
      handleCreateSuccess();
    },
    onError: (error: any) => {
      showError("Error", error.message || "No se pudo desactivar la plantilla");
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
      showSuccess("Éxito", "Plantilla reactivada exitosamente");
      handleCreateSuccess();
    },
    onError: (error: any) => {
      showError("Error", error.message || "No se pudo reactivar la plantilla");
    }
  });

  const handleDeleteTemplate = (template: any) => {
    setDeletingTemplate(template);
  };

  const handleReactivateTemplate = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que quieres reactivar esta plantilla? Se volverán a generar deducciones automáticas.')) {
      reactivateTemplateMutation.mutate(templateId);
    }
  };

  const confirmDeleteTemplate = () => {
    if (deletingTemplate) {
      deleteTemplateMutation.mutate(deletingTemplate.id);
      setDeletingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Plantillas Activas</TabsTrigger>
          <TabsTrigger value="inactive">Plantillas Inactivas</TabsTrigger>
          <TabsTrigger value="eventual">Deducciones Eventuales</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay plantillas activas</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  Crear Primera Plantilla
                </Button>
              </CardContent>
            </Card>
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
                          <div className="flex gap-1 flex-wrap">
                            <p className="text-sm text-muted-foreground">
                              {template.expense_types?.name}
                            </p>
                            {template.user_roles && template.user_roles.length > 1 && (
                              <span className="text-xs bg-muted px-1 rounded">
                                Roles: {template.user_roles.join(', ')}
                              </span>
                            )}
                          </div>
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
                            onClick={() => handleDeleteTemplate(template)}
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
                        <p>{formatDateOnly(template.start_date)}</p>
                      </div>
                      {template.end_date && (
                        <div>
                          <span className="text-muted-foreground">Vigente hasta:</span>
                          <p>{formatDateOnly(template.end_date)}</p>
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
                            {template.expense_types?.name}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="eventual" className="space-y-4">
          <EventualDeductionsList 
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            filters={filters}
            viewConfig={viewConfig}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">Historial de Cambios</h3>
            <p className="text-sm">
              Próximamente: Historial de modificaciones en plantillas de deducción
            </p>
          </div>
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

      {/* Dialog para crear deducción eventual */}
      <CreateEventualDeductionDialog
        isOpen={isEventualDialogOpen}
        onClose={() => setIsEventualDialogOpen(false)}
        onSuccess={handleEventualSuccess}
      />

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