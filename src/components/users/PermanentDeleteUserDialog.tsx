import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';

interface PermanentDeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role: string;
  } | null;
}

interface DeletionAnalysis {
  can_delete: boolean;
  user_email: string;
  blocking_factors: string[];
  summary: {
    loads_as_driver: number;
    fuel_expenses: number;
    equipment_assignments: number;
    payment_calculations: number;
    uploaded_documents: number;
    owned_companies: number;
  };
  recommendation: string;
}

export const PermanentDeleteUserDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user
}: PermanentDeleteUserDialogProps) => {
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [analysis, setAnalysis] = useState<DeletionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();

  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.email;

  // Cargar análisis cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && user?.id) {
      loadDeletionAnalysis();
    }
  }, [isOpen, user?.id]);

  const loadDeletionAnalysis = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('can_user_be_permanently_deleted', { user_id_param: user.id });

      if (error) throw error;
      
      setAnalysis(data as unknown as DeletionAnalysis);
    } catch (error: any) {
      console.error('Error loading deletion analysis:', error);
      showError('Error al analizar si el usuario puede ser eliminado');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!user?.id || !confirmationEmail || !analysis?.can_delete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase
        .rpc('permanently_delete_user_with_validation', {
          user_id_param: user.id,
          confirmation_email: confirmationEmail
        });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        showError(result.message || 'No se pudo eliminar el usuario');
        return;
      }

      showSuccess(
        'Usuario Eliminado Permanentemente',
        `${displayName} ha sido eliminado completamente del sistema`
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error deleting user permanently:', error);
      showError(error.message || 'Error al eliminar el usuario permanentemente');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationEmail('');
    setAnalysis(null);
    onClose();
  };

  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Eliminación Permanente de Usuario
          </AlertDialogTitle>
          <AlertDialogDescription>
            Análisis para eliminar permanentemente a <strong>{displayName}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Analizando datos del usuario...</div>
            </div>
          ) : analysis ? (
            <>
              {/* Estado de eliminación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {analysis.can_delete ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Estado de Eliminación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge 
                    variant={analysis.can_delete ? "default" : "destructive"}
                    className={analysis.can_delete ? "bg-green-100 text-green-800" : ""}
                  >
                    {analysis.can_delete ? "Puede ser eliminado" : "No puede ser eliminado"}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {analysis.recommendation}
                  </p>
                </CardContent>
              </Card>

              {/* Resumen de datos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Datos Asociados al Usuario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Cargas como conductor:</span>
                      <Badge variant="outline">{analysis.summary.loads_as_driver}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Gastos de combustible:</span>
                      <Badge variant="outline">{analysis.summary.fuel_expenses}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Asignaciones de equipo:</span>
                      <Badge variant="outline">{analysis.summary.equipment_assignments}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cálculos de pago:</span>
                      <Badge variant="outline">{analysis.summary.payment_calculations}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Documentos subidos:</span>
                      <Badge variant="outline">{analysis.summary.uploaded_documents}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Empresas propietarias:</span>
                      <Badge variant="outline">{analysis.summary.owned_companies}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Factores bloqueantes */}
              {analysis.blocking_factors.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Factores Bloqueantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {analysis.blocking_factors.map((factor, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Confirmación de email si puede ser eliminado */}
              {analysis.can_delete && (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ <strong>Advertencia:</strong> Esta acción eliminará permanentemente al usuario 
                      y todos sus datos del sistema. Esta acción NO se puede deshacer.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="email-confirmation">
                      Para confirmar, escriba el email del usuario: <strong>{user.email}</strong>
                    </Label>
                    <Input
                      id="email-confirmation"
                      placeholder={`Escriba "${user.email}"`}
                      value={confirmationEmail}
                      onChange={(e) => setConfirmationEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            Cancelar
          </AlertDialogCancel>
          {analysis?.can_delete && (
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={
                deleting ||
                confirmationEmail !== user.email
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};