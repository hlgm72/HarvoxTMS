import { useState } from 'react';
import { Plus, Trash2, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { getRoleConfig, getRoleLabel as getRoleUtilLabel } from '@/lib/roleUtils';

// Usar string literal temporalmente hasta que se regeneren los tipos de Supabase
type UserRole = string; // Database['public']['Enums']['user_role'];

export const SelfRoleManager = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { availableRoles: userRoles, isCompanyOwner, hasMultipleRoles } = useAuth();
  const { assignSelfRole, removeSelfRole, loading } = useUserRoles();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('settings');

  // Create availableRoles with translations
  const availableRoles: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'operations_manager',
      label: t('roles.types.operations_manager'),
      description: t('roles.descriptions.operations_manager')
    },
    {
      value: 'dispatcher',
      label: t('roles.types.dispatcher'),
      description: t('roles.descriptions.dispatcher')
    },
    {
      value: 'multi_company_dispatcher',
      label: t('roles.types.multi_company_dispatcher'),
      description: t('roles.descriptions.multi_company_dispatcher')
    },
    {
      value: 'driver',
      label: t('roles.types.driver'),
      description: t('roles.descriptions.driver')
    },
  ];

  if (!isCompanyOwner) {
    return null;
  }

  const currentRoleValues = userRoles.map(r => r.role);
  const availableToAdd = availableRoles.filter(
    role => !currentRoleValues.includes(role.value)
  );

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    const result = await assignSelfRole(selectedRole as any);
    
    if (result.success) {
      showSuccess(
        t('roles.role_assigned'),
        t('roles.role_assigned_message', { 
          role: availableRoles.find(r => r.value === selectedRole)?.label 
        })
      );
      setDialogOpen(false);
      setSelectedRole('');
    } else {
      showError(t('error.title'), result.error || t('roles.assign_error'));
    }
  };

  const handleRemoveRole = async (role: UserRole) => {
    const result = await removeSelfRole(role as any);
    
    if (result.success) {
      showSuccess(
        t('roles.role_removed'),
        t('roles.role_removed_message', { 
          role: availableRoles.find(r => r.value === role)?.label 
        })
      );
    } else {
      showError(t('error.title'), result.error || t('roles.remove_error'));
    }
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === 'company_owner') return t('roles.types.company_owner');
    return availableRoles.find(r => r.value === role)?.label || getRoleUtilLabel(role, false);
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          {t('roles.title')}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t('roles.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('roles.current_roles')}</h4>
          <div className="flex flex-wrap gap-3">
            {userRoles.map((userRole) => (
              <div key={userRole.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                <Badge 
                  variant="secondary"
                  className={`${getRoleConfig(userRole.role).className} px-3 py-1`}
                >
                  <User className="h-3 w-3 mr-2" />
                  {getRoleLabel(userRole.role as UserRole)}
                </Badge>
                {userRole.role !== 'company_owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                    onClick={() => handleRemoveRole(userRole.role as UserRole)}
                    disabled={loading}
                    title={t('roles.remove_title')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {availableToAdd.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('roles.add_role')}</h4>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('roles.assign_additional')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('roles.dialog_title')}</DialogTitle>
                  <DialogDescription>
                    {t('roles.dialog_description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('roles.select_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setSelectedRole('');
                      }}
                    >
                      {t('roles.cancel')}
                    </Button>
                    <Button
                      onClick={handleAssignRole}
                      disabled={!selectedRole || loading}
                    >
                      {loading ? t('roles.assigning') : t('roles.assign')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {hasMultipleRoles && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 text-lg">💡</div>
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">{t('roles.tip_title')}</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t('roles.tip_description')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};