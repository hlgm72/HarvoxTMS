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
import { formatDateOnly, formatCurrency } from '@/lib/dateFormatting';
import { DollarSign, Edit, Trash2, RotateCcw, AlertTriangle, Repeat, Clock, Archive, History } from "lucide-react";
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
      
      // Obtener todos los usuarios de la empresa (conductores y despachadores)
      let roleFilter: ('driver' | 'dispatcher')[] = ['driver', 'dispatcher'];
      
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
        .from('expense_recurring_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('user_id', userIds)
        .eq('is_active', true);

      // No aplicar filtro por rol aplicado - queremos ver todos

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
      
      // Obtener todos los usuarios de la empresa (conductores y despachadores)  
      let roleFilter: ('driver' | 'dispatcher')[] = ['driver', 'dispatcher'];
      
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
        .from('expense_recurring_templates')
        .select(`
          *,
          expense_types (name, category)
        `)
        .in('user_id', userIds)
        .eq('is_active', false);

      // No aplicar filtro por rol aplicado - queremos ver todos

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
        .from('expense_recurring_templates')
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
        .from('expense_recurring_templates')
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

  // Función para agrupar plantillas por rol aplicado
  const groupTemplatesByRole = (templates: any[]) => {
    const drivers = templates.filter(t => t.applied_to_role === 'driver');
    const dispatchers = templates.filter(t => t.applied_to_role === 'dispatcher');
    return { drivers, dispatchers };
  };

  // Agrupar plantillas activas e inactivas
  const groupedActiveTemplates = groupTemplatesByRole(templates);
  const groupedInactiveTemplates = groupTemplatesByRole(inactiveTemplates);

  // Componente para renderizar un grupo de plantillas
  const TemplateGroup = ({ 
    title, 
    templates, 
    isInactive = false 
  }: { 
    title: string; 
    templates: any[]; 
    isInactive?: boolean; 
  }) => {
    if (templates.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-base md:text-lg font-semibold text-muted-foreground border-b pb-2 mb-3 mt-10">
          {title}
        </h3>
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={`hover:shadow-md transition-shadow ${isInactive ? 'border-muted' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isInactive ? 'bg-muted' : 'bg-blue-100'}`}>
                      <DollarSign className={`h-5 w-5 ${isInactive ? 'text-muted-foreground' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isInactive ? 'text-muted-foreground' : ''}`}>
                        {template.driver_profile?.first_name} {template.driver_profile?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {template.expense_types?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${isInactive ? 'text-muted-foreground' : ''}`}>
                        ${formatCurrency(parseFloat(template.amount || 0))}
                      </p>
                      <Badge variant={isInactive ? "secondary" : "outline"}>
                        {isInactive && 'Inactiva • '}
                        {template.frequency === 'weekly' ? 'Semanal' : 
                         template.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      {isInactive ? (
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
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {!isInactive && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vigente desde: {formatDateOnly(template.start_date)}</span>
                    </div>
                    {template.end_date && (
                      <div>
                        <span className="text-muted-foreground">Vigente hasta: {formatDateOnly(template.end_date)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {template.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Notas:</strong> {template.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="active" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Repeat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Plantillas Activas</span>
            <span className="sm:hidden">Activas</span>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Archive className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Plantillas Inactivas</span>
            <span className="sm:hidden">Inactivas</span>
          </TabsTrigger>
          <TabsTrigger value="eventual" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Deducciones Eventuales</span>
            <span className="sm:hidden">Eventuales</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6 md:mt-8">
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
            <div className="space-y-6">
              <TemplateGroup 
                title="Descuentos a Conductores" 
                templates={groupedActiveTemplates.drivers} 
                isInactive={false} 
              />
              <TemplateGroup 
                title="Descuentos a Despachadores" 
                templates={groupedActiveTemplates.dispatchers} 
                isInactive={false} 
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-6 md:mt-8">
          {inactiveTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay plantillas inactivas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <TemplateGroup 
                title="Descuentos a Conductores" 
                templates={groupedInactiveTemplates.drivers} 
                isInactive={true} 
              />
              <TemplateGroup 
                title="Descuentos a Despachadores" 
                templates={groupedInactiveTemplates.dispatchers} 
                isInactive={true} 
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="eventual" className="space-y-4 mt-6 md:mt-8">
          <EventualDeductionsList 
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            filters={filters}
            viewConfig={viewConfig}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6 md:mt-8">
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