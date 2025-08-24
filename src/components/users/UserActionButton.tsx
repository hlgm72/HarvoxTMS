import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserX, MoreVertical, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDriversCount } from "@/hooks/useDriversCount";

interface UserActionButtonProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  onUserUpdated?: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "destructive";
}

interface CleanupResult {
  success: boolean;
  message: string;
  user_id: string;
  deleted_counts: {
    driver_period_calculations: number;
    expense_instances: number;
    equipment_assignments: number;
    driver_fuel_cards: number;
    owner_operators: number;
    user_company_roles: number;
    user_invitations: number;
    driver_profiles: number;
  };
  total_deleted: number;
  cleaned_by: string;
  cleaned_at: string;
}

export function UserActionButton({ 
  user, 
  onUserUpdated, 
  size = "sm",
  variant = "outline"
}: UserActionButtonProps) {
  const { userRole, user: currentUser } = useAuth();
  const { invalidateCount } = useDriversCount();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletionAnalysis, setDeletionAnalysis] = useState<any>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  // Solo company_owners pueden ver estas opciones
  const canManageUsers = userRole?.role === 'company_owner';

  if (!canManageUsers) {
    return null;
  }

  const loadDeletionAnalysis = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('can_user_be_permanently_deleted', { user_id_param: user.id });

      if (error) throw error;
      setDeletionAnalysis(data);
      
      // Si no tenemos el email del usuario, intentar obtenerlo
      if (user.email === 'N/A' && (data as any)?.user_email) {
        user.email = (data as any).user_email;
      }
    } catch (error: any) {
      console.error('Error analyzing user deletion:', error);
      toast.error("Error al analizar la eliminación del usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    try {
      setLoading(true);
      
      // Desactivar todos los roles activos del usuario en la empresa actual
      const { error } = await supabase
        .from('user_company_roles')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('company_id', userRole?.company_id)
        .eq('is_active', true);

      if (error) throw error;

      toast.success(`${user.first_name} ${user.last_name} ha sido desactivado exitosamente`);
      
      // Invalidar contadores cuando se desactiva un usuario
      invalidateCount();
      queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      
      setDeactivateDialogOpen(false);
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast.error(error.message || "Error al desactivar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    const targetEmail = (deletionAnalysis as any)?.user_email || user.email;
    
    if (confirmationEmail !== targetEmail) {
      toast.error("El email de confirmación no coincide");
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('permanently-delete-user', {
        body: {
          userId: user.id,
          confirmationEmail: confirmationEmail
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("El usuario ha sido eliminado permanentemente del sistema");
        
        // Invalidar todas las queries relacionadas con usuarios y conductores
        queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
        queryClient.invalidateQueries({ queryKey: ['company-users'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        
        // También invalidar usando el hook específico
        invalidateCount();
        
        setPermanentDeleteDialogOpen(false);
        setConfirmationEmail("");
        onUserUpdated?.();
      } else {
        toast.error(data?.message || "El usuario no puede ser eliminado");
      }
    } catch (error: any) {
      console.error('Error deleting user permanently:', error);
      toast.error(error.message || "Error al eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupUserData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('cleanup_user_data_with_validation', {
          user_id_param: user.id
        });

      if (error) throw error;

      if ((data as unknown as CleanupResult)?.success) {
        const cleanupData = data as unknown as CleanupResult;
        setCleanupResult(cleanupData);
        const totalDeleted = cleanupData.total_deleted || 0;
        const calculationsDeleted = cleanupData.deleted_counts?.driver_period_calculations || 0;
        
        toast.success(
          `Datos limpiados exitosamente: ${totalDeleted} registros eliminados` + 
          (calculationsDeleted > 0 ? ` (${calculationsDeleted} cálculos de pago)` : '')
        );
        
        // Invalidar queries y reanalizar para eliminación
        queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
        queryClient.invalidateQueries({ queryKey: ['company-users'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        
        // Recargar análisis de eliminación
        await loadDeletionAnalysis();
      } else {
        toast.error((data as unknown as CleanupResult)?.message || "Error en la limpieza de datos");
      }
    } catch (error: any) {
      console.error('Error cleaning up user data:', error);
      toast.error(error.message || "Error al limpiar datos del usuario");
    } finally {
      setLoading(false);
    }
  };

  const openPermanentDeleteDialog = async () => {
    await loadDeletionAnalysis();
    setPermanentDeleteDialogOpen(true);
    setDropdownOpen(false);
  };

  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => {
              setDeactivateDialogOpen(true);
              setDropdownOpen(false);
            }}
          >
            <UserX className="h-4 w-4 mr-2" />
            Desactivar Usuario
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              handleCleanupUserData();
              setDropdownOpen(false);
            }}
            className="text-orange-600 focus:text-orange-600"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Limpiar Datos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={openPermanentDeleteDialog}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Permanentemente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Desactivación */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres desactivar a {userName}? 
              El usuario no podrá acceder al sistema pero sus datos se mantendrán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeactivateUser}
              disabled={loading}
            >
              {loading ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Eliminación Permanente */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario Permanentemente</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente a {userName} y todos sus datos del sistema.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="py-4">Analizando datos del usuario...</div>
          ) : deletionAnalysis ? (
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Estado de eliminación:</strong>{' '}
                <span className={deletionAnalysis.can_delete ? 'text-green-600' : 'text-red-600'}>
                  {deletionAnalysis.can_delete ? 'Puede ser eliminado' : 'No puede ser eliminado'}
                </span>
              </div>
              
              {deletionAnalysis.summary && (
                <div className="text-sm">
                  <strong>Resumen de datos:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {Object.entries(deletionAnalysis.summary).map(([key, value]) => {
                      const labelMap: Record<string, string> = {
                        fuel_expenses: 'Gastos de combustible',
                        loads_as_driver: 'Cargas como conductor',
                        owned_companies: 'Empresas propietarias',
                        uploaded_documents: 'Documentos cargados',
                        payment_calculations: 'Cálculos de pago',
                        equipment_assignments: 'Asignaciones de equipos',
                        active_roles: 'Roles activos',
                        driver_profiles: 'Perfiles de conductor',
                        owner_operator_records: 'Registros de operador-propietario'
                      };
                      const label = labelMap[key] || key;
                      return (
                        <li key={key}>{label}: {String(value)}</li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {!deletionAnalysis.can_delete && deletionAnalysis.blocking_factors && (
                <div className="text-sm text-red-600">
                  <strong>Factores que impiden la eliminación:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {deletionAnalysis.blocking_factors.map((factor: string, index: number) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {deletionAnalysis.can_delete && (
                <div className="space-y-2">
                  <Label htmlFor="confirmEmail">
                    Para confirmar, escribe el email del usuario: <strong>{(deletionAnalysis as any)?.user_email || user.email}</strong>
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmationEmail}
                    onChange={(e) => setConfirmationEmail(e.target.value)}
                    placeholder="Confirma el email aquí..."
                  />
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPermanentDeleteDialogOpen(false);
                setConfirmationEmail("");
              }}
            >
              Cancelar
            </Button>
            {!deletionAnalysis?.can_delete && (
              <Button 
                variant="outline" 
                onClick={handleCleanupUserData}
                disabled={loading}
                className="text-orange-600 hover:text-orange-700"
              >
                <Eraser className="h-4 w-4 mr-2" />
                {loading ? "Limpiando..." : "Limpiar Datos"}
              </Button>
            )}
            {deletionAnalysis?.can_delete && (
              <Button 
                variant="destructive" 
                onClick={handlePermanentDelete}
                disabled={loading || confirmationEmail !== ((deletionAnalysis as any)?.user_email || user.email)}
              >
                {loading ? "Eliminando..." : "Eliminar Permanentemente"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}