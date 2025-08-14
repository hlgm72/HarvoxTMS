import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Clock, 
  Mail, 
  RefreshCw, 
  X, 
  AlertCircle,
  Eye,
  Send,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel } from '@/lib/roleUtils';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteUserCompletely } from '@/utils/deleteTestUser';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  expires_at: string;
  invited_by: string;
  target_user_id: string | null;
  companies: {
    name: string;
  };
}

interface PendingInvitationsSectionProps {
  /** Filtrar solo por rol específico (ej: 'driver' para mostrar solo conductores) */
  roleFilter?: string;
  /** Título personalizado para la sección */
  title?: string;
  /** Descripción personalizada */
  description?: string;
  /** Callback que se ejecuta cuando se actualiza la lista de invitaciones */
  onInvitationsUpdated?: () => void;
}

export function PendingInvitationsSection({ 
  roleFilter, 
  title = 'Pending Invitations',
  description = 'Users who have been invited but have not yet accepted their invitation',
  onInvitationsUpdated
}: PendingInvitationsSectionProps) {
  const { userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);

  useEffect(() => {
    if (userRole?.company_id) {
      fetchPendingInvitations();
    }
  }, [userRole, roleFilter]);

  const fetchPendingInvitations = async () => {
    if (!userRole?.company_id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('user_invitations')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          created_at,
          expires_at,
          invited_by,
          target_user_id,
          companies!inner(name)
        `)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true) // Solo mostrar invitaciones activas
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Aplicar filtro de rol si se especifica
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      showError('Error loading pending invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    setProcessingInvitation(invitation.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          companyId: userRole?.company_id,
          email: invitation.email,
          companyName: invitation.companies.name,
          role: invitation.role,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
        },
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error resending invitation');
      }

      showSuccess(
        'Invitation Resent',
        `Invitation has been resent to ${invitation.email}`
      );

      // Refrescar la lista
      fetchPendingInvitations();
      // Notificar al componente padre
      onInvitationsUpdated?.();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      showError(error.message || 'Error resending invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!selectedInvitation) return;

    setProcessingInvitation(selectedInvitation.id);
    try {
      // Eliminación suave: marcar como cancelada en lugar de eliminar
      // Esto mantiene la consistencia de datos si ya se creó el usuario
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          is_active: false,
          expires_at: new Date().toISOString(), // Marca como expirada para que no aparezca en la lista
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedInvitation.id);

      if (error) throw error;

      showSuccess(
        'Invitation Cancelled',
        `Invitation for ${selectedInvitation.email} has been cancelled. The pre-registered user remains in the system.`
      );

      // Refrescar la lista
      fetchPendingInvitations();
      // Notificar al componente padre
      onInvitationsUpdated?.();
      setCancelDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      showError(error.message || 'Error cancelling invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeleteUserCompletely = async () => {
    if (!selectedInvitation?.target_user_id) return;

    setProcessingInvitation(selectedInvitation.id);
    try {
      const result = await deleteUserCompletely(
        selectedInvitation.target_user_id,
        `Complete deletion from pending invitation: ${selectedInvitation.email}`
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      showSuccess(
        'User Completely Deleted',
        `${selectedInvitation.email} has been completely deleted from the system.`
      );

      // Refrescar la lista
      fetchPendingInvitations();
      // Notificar al componente padre
      onInvitationsUpdated?.();
      setCancelDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error: any) {
      console.error('Error deleting user completely:', error);
      showError(error.message || 'Error deleting user completely');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getStatusBadge = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const timeUntilExpiry = expires.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    if (hoursUntilExpiry < 24) {
      return <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Expires Soon
      </Badge>;
    }

    return <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>;
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistance(new Date(dateString), new Date(), { 
        addSuffix: true, 
        locale: es 
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading invitations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-semibold mb-1">
              {roleFilter === 'driver' ? 'No pending drivers' : 'No pending invitations'}
            </h3>
            <p className="text-muted-foreground">
              {roleFilter === 'driver' 
                ? 'All driver invitations have been accepted'
                : 'All invitations have been accepted or expired'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {title}
            <Badge variant="outline">{invitations.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const displayName = invitation.first_name && invitation.last_name
                    ? `${invitation.first_name} ${invitation.last_name}`
                    : invitation.email;

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{displayName}</span>
                          {invitation.first_name && invitation.last_name && (
                            <span className="text-sm text-muted-foreground">{invitation.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRoleLabel(invitation.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invitation.expires_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getTimeAgo(invitation.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getTimeAgo(invitation.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation)}
                            disabled={processingInvitation === invitation.id}
                            className="gap-1"
                          >
                            {processingInvitation === invitation.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Resend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setCancelDialogOpen(true);
                            }}
                            disabled={processingInvitation === invitation.id}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para confirmar cancelación */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-3xl sm:max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription className="break-words">
              How do you want to proceed with the invitation for{' '}
              <strong className="break-all word-break-all">
                {selectedInvitation?.first_name && selectedInvitation?.last_name
                  ? `${selectedInvitation.first_name} ${selectedInvitation.last_name} (${selectedInvitation.email})`
                  : selectedInvitation?.email
                }
              </strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedInvitation?.target_user_id ? (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  ⚠️ <strong>This user has already been pre-registered</strong> in the system with all their data.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ℹ️ This invitation has not yet created a user in the system.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancelInvitation}
              disabled={processingInvitation === selectedInvitation?.id}
              className="w-full justify-start text-left h-auto py-3 px-4"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {processingInvitation === selectedInvitation?.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
                  ) : null}
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Only cancel invitation</span>
                    <span className="text-xs text-muted-foreground">
                      Keep pre-registered user
                    </span>
                  </div>
                </div>
              </div>
            </Button>
            
            {selectedInvitation?.target_user_id && (
              <Button
                variant="destructive"
                onClick={handleDeleteUserCompletely}
                disabled={processingInvitation === selectedInvitation?.id}
                className="w-full justify-start text-left h-auto py-3 px-4"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {processingInvitation === selectedInvitation?.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
                    ) : null}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Delete user completely</span>
                      <span className="text-xs text-muted-foreground">
                        Delete everything from system
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedInvitation(null);
              }}
              className="w-full"
            >
              Cancel Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}