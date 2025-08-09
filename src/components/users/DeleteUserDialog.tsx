import { useState } from 'react';
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
import { useFleetNotifications } from '@/components/notifications';
import { useUserDeactivationACID } from '@/hooks/useUserManagementACID';

interface DeleteUserDialogProps {
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
  companyId: string;
}

export const DeleteUserDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user, 
  companyId 
}: DeleteUserDialogProps) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const { showSuccess, showError } = useFleetNotifications();
  const { mutate: deactivateUser, isPending: isLoading } = useUserDeactivationACID();

  if (!user) return null;

  const displayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user.email;

  const expectedConfirmation = displayName.toLowerCase();

  const handleConfirm = async () => {
    if (confirmationText.toLowerCase() !== expectedConfirmation) {
      showError('El texto de confirmación no coincide');
      return;
    }

    if (!deactivationReason.trim()) {
      showError('Debe proporcionar una razón para la desactivación');
      return;
    }

    try {
      deactivateUser({
        userId: user.id,
        companyId,
        reason: deactivationReason.trim()
      }, {
        onSuccess: () => {
          showSuccess(
            'Usuario Desactivado',
            `${displayName} ha sido desactivado exitosamente`
          );
          onSuccess();
          handleClose();
        },
        onError: (error: any) => {
          showError(error.message || 'Error al desactivar el usuario');
        }
      });
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      showError(error.message || 'Error inesperado al desactivar el usuario');
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    setDeactivationReason('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Desactivar Usuario
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta acción desactivará a <strong>{displayName}</strong> del sistema.
            </p>
            <p className="text-sm text-muted-foreground">
              El usuario no podrá acceder al sistema, pero su historial se mantendrá 
              para efectos de auditoría y reportes.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Razón de la desactivación *</Label>
            <Input
              id="reason"
              placeholder="Ej: Terminación de contrato, violación de políticas..."
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirmation">
              Para confirmar, escriba: <strong>{displayName}</strong>
            </Label>
            <Input
              id="confirmation"
              placeholder={`Escriba "${displayName}"`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isLoading ||
              confirmationText.toLowerCase() !== expectedConfirmation ||
              !deactivationReason.trim()
            }
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Desactivando...' : 'Desactivar Usuario'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};