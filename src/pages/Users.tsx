import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users as UsersIcon, Grid, List,
  Activity, Clock, AlertCircle, TrendingUp, Search, X, UserPlus, Mail, Shield, Edit, Trash2, Eye,
  Truck, UserCheck, UserX
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFleetNotifications } from "@/components/notifications";
import { handleTextBlur, createTextHandlers } from "@/lib/textUtils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { EditDriverDialog } from "@/components/drivers/EditDriverDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { PermanentDeleteUserDialog } from "@/components/users/PermanentDeleteUserDialog";
import { UserActionButton } from "@/components/users/UserActionButton";
import { getRoleLabel, getRoleConfig } from "@/lib/roleUtils";
import { deleteTestUser } from "@/utils/deleteTestUser";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { GenericFloatingActions, StandardActionConfig, FloatingActionSheet } from "@/components/ui/GenericFloatingActions";
import { UserFiltersSheet } from "@/components/users/UserFiltersSheet";
import { PendingInvitationsSection } from "@/components/invitations/PendingInvitationsSection";
import { formatDateAuto, getCurrentUTC } from '@/lib/dateFormatting';
import { UserDetailsContent } from "@/components/users/UserDetailsContent";

type UserRole = Database["public"]["Enums"]["user_role"];

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at: string;
}

interface InviteUserForm {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

const ROLE_OPTIONS = [
  { value: 'operations_manager', label: '👨‍💼 Operations Manager' },
  { value: 'dispatcher', label: '📋 Dispatcher' },
  { value: 'driver', label: '🚛 Driver' },
  { value: 'multi_company_dispatcher', label: '🏢 Multi-Company Dispatcher' },
];

export default function Users() {
  const { t } = useTranslation(['users', 'common']);
  const { user, userRole } = useAuth();
  const { showSuccess, showError, showInfo } = useFleetNotifications();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    role: '',
    first_name: '',
    last_name: ''
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [updatingRoles, setUpdatingRoles] = useState(false);
  
  // Estado para el modal de edición de conductor
  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para estadísticas del dashboard
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0,
    usersByRole: {} as Record<string, number>,
    recentUsers: 0
  });

  // Estado para la vista actual (tabla o tarjetas)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [deletingTestUser, setDeletingTestUser] = useState(false);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    if (userRole?.company_id) {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    if (!userRole?.company_id) {
      console.log('❌ No company_id found:', userRole);
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 Fetching users for company:', userRole.company_id);
      
      // Obtener usuarios activos de la empresa con sus roles
      const { data: companyUsers, error } = await supabase
        .from('user_company_roles')
        .select(`
          user_id,
          role,
          is_active,
          created_at
        `)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching company users:', error);
        throw error;
      }
      
      console.log('✅ Company users loaded:', companyUsers?.length || 0);

      // Obtener invitaciones pendientes (no aceptadas)
      const { data: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select(`
          id,
          target_user_id,
          first_name,
          last_name,
          email,
          role,
          created_at
        `)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .is('accepted_at', null)  // Solo invitaciones no aceptadas
        .gt('expires_at', getCurrentUTC())
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('❌ Error fetching invitations:', invitationsError);
        throw invitationsError;
      }
      
      console.log('✅ Pending invitations loaded:', pendingInvitations?.length || 0);

      // Combinar usuarios activos y pendientes
      const allUserIds = new Set();
      const usersMap = new Map<string, User>();

      // Procesar usuarios activos - reconstruir roles completamente
      if (companyUsers && companyUsers.length > 0) {
        companyUsers.forEach(companyUserRole => {
          const userId = companyUserRole.user_id;
          allUserIds.add(userId);
          
          if (usersMap.has(userId)) {
            // Usuario ya existe, agregar rol adicional
            const existingUser = usersMap.get(userId)!;
            const currentRoles = existingUser.role.split(', ');
            const newRoleLabel = getRoleLabel(companyUserRole.role);
            if (!currentRoles.includes(newRoleLabel)) {
              existingUser.role = existingUser.role + ', ' + newRoleLabel;
            }
          } else {
            // Nuevo usuario activo
            usersMap.set(userId, {
              id: userId,
              email: 'N/A', // Se actualizará después si es posible
              phone: '',
              role: getRoleLabel(companyUserRole.role),
              status: 'active',
              first_name: '',
              last_name: '',
              avatar_url: '',
              created_at: companyUserRole.created_at
            });
          }
        });
      }

      // Procesar invitaciones pendientes
      if (pendingInvitations && pendingInvitations.length > 0) {
        pendingInvitations.forEach(invitation => {
          // Para invitaciones pendientes, usar el invitation.id como identificador único
          const userId = invitation.target_user_id || invitation.id;
          
          // Solo agregar si no es un usuario ya activo en esta empresa
          if (!allUserIds.has(userId)) {
            // Solo agregar UUIDs válidos para consultas de perfiles
            if (invitation.target_user_id) {
              allUserIds.add(userId);
            }
            
            usersMap.set(userId, {
              id: userId,
              email: invitation.email || 'N/A',
              phone: '',
              role: getRoleLabel(invitation.role),
              status: 'pending',
              first_name: invitation.first_name || '',
              last_name: invitation.last_name || '',
              avatar_url: '',
              created_at: invitation.created_at
            });
          }
        });
      }

      if (usersMap.size === 0) {
        console.log('⚠️ No users found');
        setUsers([]);
        setLoading(false);
        return;
      }

      // Obtener perfiles de usuarios para aquellos que tienen user_id real (no IDs de invitación)
      const userIdsWithProfiles = Array.from(allUserIds).filter((id): id is string => 
        typeof id === 'string' && id.length > 0
      );
      
      console.log('🔍 Fetching profiles for users:', userIdsWithProfiles.length);
      
      let profiles: any[] = [];
      if (userIdsWithProfiles.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url, phone')
          .in('user_id', userIdsWithProfiles);

        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
          throw profilesError;
        }
        profiles = profilesData || [];
        console.log('✅ Profiles loaded:', profiles.length);
      }

      // Actualizar información de perfiles
      profiles.forEach(profile => {
        if (usersMap.has(profile.user_id)) {
          const user = usersMap.get(profile.user_id)!;
          user.first_name = profile.first_name || user.first_name;
          user.last_name = profile.last_name || user.last_name;
          user.avatar_url = profile.avatar_url || user.avatar_url;
          user.phone = profile.phone || user.phone;
        }
      });

      // Obtener emails para usuarios con privilegios administrativos
      const hasAdminPrivileges = userRole?.role && [
        'superadmin', 
        'company_owner', 
        'operations_manager'
      ].includes(userRole.role);

      if (hasAdminPrivileges) {
        // Usar la función segura para obtener emails de usuarios
        try {
          console.log('🔍 Fetching emails for admin user');
          const { data: userEmails, error: emailError } = await supabase
            .rpc('get_user_emails_for_company', { 
              company_id_param: userRole.company_id 
            });

          if (emailError) {
            console.error('❌ Error fetching emails:', emailError);
            throw emailError;
          }

          if (userEmails) {
            console.log('✅ Emails loaded:', userEmails.length);
            // Mapear emails a usuarios
            userEmails.forEach(({ user_id, email }) => {
              if (usersMap.has(user_id)) {
                const mappedUser = usersMap.get(user_id)!;
                mappedUser.email = email || mappedUser.email;
              }
            });
          }
        } catch (error) {
          console.warn('⚠️ Error obteniendo emails:', error);
          // Fallback: solo mostrar email del usuario actual
          if (user?.id && usersMap.has(user.id)) {
            const currentUser = usersMap.get(user.id)!;
            currentUser.email = user.email || currentUser.email;
          }
        }
      } else {
        // Usuarios sin privilegios solo ven su propio email
        if (user?.id && usersMap.has(user.id)) {
          const currentUser = usersMap.get(user.id)!;
          currentUser.email = user.email || currentUser.email;
        }
      }

      const usersList = Array.from(usersMap.values());
      console.log('✅ Final users list:', usersList.length);
      setUsers(usersList);
      setFilteredUsers(usersList); // Inicializar usuarios filtrados
      
      // Calcular estadísticas después de obtener los usuarios
      calculateStats(usersList, userRole?.company_id);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      showError(t('messages.error_loading', { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        ns: 'users'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Effect para aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [searchTerm, roleFilter, statusFilter, users]);

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = [...users];

    // Filtro de búsqueda por nombre/email
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        return fullName.includes(searchLower) || 
               user.email.toLowerCase().includes(searchLower);
      });
    }

    // Filtro por rol
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        // Convertir roles del usuario a sus valores originales
        const userRoles = user.role.split(', ').map((roleLabel) => {
          return Object.entries({
            'superadmin': getRoleLabel('superadmin'),
            'company_owner': getRoleLabel('company_owner'),
            'operations_manager': getRoleLabel('operations_manager'),
            'dispatcher': getRoleLabel('dispatcher'),
            'driver': getRoleLabel('driver'),
            'multi_company_dispatcher': getRoleLabel('multi_company_dispatcher')
          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
        });
        return userRoles.includes(roleFilter);
      });
    }

    // Filtro por estado
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  // Separar usuarios activos de pendientes basado en si tienen auth activo
  // Para usuarios, consideramos que son "pendientes" si están pre-registrados
  // o tienen invitaciones pendientes
  const activeUsers = filteredUsers.filter(user => user.status === 'active');
  const pendingUsers = filteredUsers.filter(user => user.status !== 'active');

  const handleDeleteTestUser = async () => {
    if (!userRole?.role || !['superadmin', 'company_owner'].includes(userRole.role)) {
      showError(t('messages.delete_test_user_error', { ns: 'users' }));
      return;
    }

    setDeletingTestUser(true);
    try {
      const result = await deleteTestUser();
      
      if (result.success) {
        showSuccess(
          t('messages.test_user_deleted', { ns: 'users' }),
          result.alreadyDeleted 
            ? t('messages.test_user_already_deleted', { ns: 'users' })
            : t('messages.test_user_deleted_success', { ns: 'users' })
        );
        // Recargar la lista de usuarios
        fetchUsers();
      } else {
        showError(result.error || t('messages.test_user_delete_error', { ns: 'users' }));
      }
    } catch (error: any) {
      console.error('Error deleting test user:', error);
      showError(error.message || t('messages.test_user_delete_unexpected', { ns: 'users' }));
    } finally {
      setDeletingTestUser(false);
    }
  };

  const calculateStats = async (usersList: User[], companyId?: string) => {
    if (!companyId) return;

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Calcular estadísticas básicas de usuarios
      const totalUsers = usersList.length;
      const activeUsers = usersList.filter(u => u.status === 'active').length;
      
      // Contar usuarios recientes (registrados en la última semana)
      const recentUsers = usersList.filter(u => 
        new Date(u.created_at) >= oneWeekAgo
      ).length;

      // Contar usuarios por rol
      const usersByRole: Record<string, number> = {};
      usersList.forEach(user => {
        const userRoles = user.role.split(', ');
        userRoles.forEach(roleLabel => {
          // Obtener el rol original desde el label
          const originalRole = Object.entries({
            'superadmin': getRoleLabel('superadmin'),
            'company_owner': getRoleLabel('company_owner'),
            'operations_manager': getRoleLabel('operations_manager'),
            'dispatcher': getRoleLabel('dispatcher'),
            'driver': getRoleLabel('driver'),
            'multi_company_dispatcher': getRoleLabel('multi_company_dispatcher')
          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
          
          usersByRole[originalRole] = (usersByRole[originalRole] || 0) + 1;
        });
      });

      // Obtener invitaciones pendientes enviadas por el usuario actual
      const { count: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('invited_by', user?.id) // Solo invitaciones enviadas por el usuario actual
        .is('accepted_at', null)
        .gt('expires_at', getCurrentUTC());

      if (invitationsError) {
        console.error('Error fetching pending invitations:', invitationsError);
      }

      setStats({
        totalUsers,
        activeUsers,
        pendingInvitations: pendingInvitations || 0,
        usersByRole,
        recentUsers
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (preventDefaultError) {
      // Ignorar errores de preventDefault en event listeners pasivos
      console.warn('preventDefault error ignored:', preventDefaultError);
    }
    
    // Limpiar espacios innecesarios de los campos de texto usando la utilidad global
    const cleanedForm = {
      email: handleTextBlur(inviteForm.email),
      role: inviteForm.role,
      first_name: handleTextBlur(inviteForm.first_name),
      last_name: handleTextBlur(inviteForm.last_name)
    };
    
    if (!cleanedForm.email || !cleanedForm.role) {
      showError(t('messages.email_required', { ns: 'users' }));
      return;
    }

    if (!userRole?.company_id) {
      showError(t('messages.company_info_error', { ns: 'users' }));
      return;
    }

    setLoading(true);
    
    try {
      // Obtener información de la empresa usando RPC seguro
      const { data: companyData, error: companyError } = await supabase
        .rpc('get_companies_basic_info', {
          target_company_id: userRole.company_id
        })
        .then(result => ({
          data: result.data?.[0] || null,
          error: result.error
        }));

      if (companyError) throw companyError;

      // Obtener el token de autenticación
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      // Llamar a la función edge para enviar invitación
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          companyId: userRole.company_id,
          email: cleanedForm.email,
          companyName: companyData.name,
          role: cleanedForm.role,
          first_name: cleanedForm.first_name,
          last_name: cleanedForm.last_name,
        },
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        console.error('Error inviting user:', error);
        throw new Error(error.message || 'Error al enviar invitación');
      }

      if (!data || !data.success) {
        console.error('Function result error:', data);
        throw new Error(data?.error || 'Error al enviar invitación');
      }

      const displayName = cleanedForm.first_name && cleanedForm.last_name 
        ? `${cleanedForm.first_name} ${cleanedForm.last_name}` 
        : cleanedForm.email;

      showSuccess(
        t('messages.invitation_sent', { ns: 'users' }),
        t('messages.invitation_sent_description', { ns: 'users' })
      );
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: '', first_name: '', last_name: '' });
      
      // Recargar la lista de usuarios
      fetchUsers();
      
      // Si se invitó a un conductor, invalidar el contador de conductores
      if (cleanedForm.role === 'driver') {
        queryClient.invalidateQueries({ queryKey: ['drivers-count'] });
        queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      }
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      showError(error.message || t('messages.error_inviting', { ns: 'users' }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('status.active', { ns: 'users' })}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('status.pending', { ns: 'users' })}</Badge>;
      case 'inactive':
        return <Badge variant="destructive">{t('status.inactive', { ns: 'users' })}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Función para obtener badge de rol con colores
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: string; className: string }> = {
      'superadmin': { 
        label: getRoleLabel('superadmin'), 
        variant: 'default',
        className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
      },
      'company_owner': { 
        label: getRoleLabel('company_owner'), 
        variant: 'default',
        className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
      },
      'operations_manager': { 
        label: getRoleLabel('operations_manager'), 
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
      },
      'general_manager': { 
        label: '👨‍💼 General Manager', 
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
      },
      'safety_manager': { 
        label: '⚠️ Safety Manager', 
        variant: 'default',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700'
      },
      'senior_dispatcher': { 
        label: '📋 Senior Dispatcher', 
        variant: 'default',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
      },
      'dispatcher': { 
        label: getRoleLabel('dispatcher'), 
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
      },
      'driver': { 
        label: getRoleLabel('driver'), 
        variant: 'default',
        className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700'
      },
      'multi_company_dispatcher': { 
        label: getRoleLabel('multi_company_dispatcher'), 
        variant: 'default',
        className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700'
      },
    };

    const config = roleConfig[role] || { 
      label: role, 
      variant: 'outline',
      className: 'bg-gray-50 text-gray-600 border-gray-300'
    };

    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Función para aplicar ordenamiento a los usuarios
  const sortUsers = (users: User[], sortBy: string) => {
    // TODO: Implementar ordenamiento si es necesario
    return users;
  };

  // Función para construir el subtítulo
  const getSubtitle = () => {
    const userCount = filteredUsers.length;
    const activeCount = filteredUsers.filter(u => u.status === 'active').length;
    const roleCount = new Set(filteredUsers.map(u => u.role)).size;
    
    return [
      `${userCount} ${t('page.subtitle.users', { ns: 'users' })}`,
      `${activeCount} ${t('page.subtitle.active', { ns: 'users' })}`,
      `${roleCount} ${t('page.subtitle.roles', { ns: 'users' })}`
    ].join(' • ');
  };

  return (
    <div className="p-2 md:p-4">
      {/* Page Toolbar */}
      <PageToolbar
        icon={UsersIcon}
        title={t('page.title', { ns: 'users' })}
        subtitle={getSubtitle()}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('actions.invite_user', { ns: 'users' })}</span>
              <span className="sm:hidden">{t('actions.invite', { ns: 'users' })}</span>
            </Button>
          </div>
        }
      />

      {/* View Toggle */}
      <div className="flex justify-end mb-6">
        <div className="flex border border-border rounded-lg">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dashboard de Estadísticas */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('stats.total_users', { ns: 'users' })}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('stats.active_users', { ns: 'users' })}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('stats.pending_invitations', { ns: 'users' })}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.pendingInvitations}</p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('stats.recent_users', { ns: 'users' })}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.recentUsers}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuarios con tabs */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1">
              <TabsTrigger value="active" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('tabs.all_users', { ns: 'users' })}</span>
                <span className="sm:hidden">{t('tabs.all', { ns: 'users' })}</span>
                <span className="ml-1">({filteredUsers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('tabs.pending_activation', { ns: 'users' })}</span>
                <span className="sm:hidden">{t('tabs.pending', { ns: 'users' })}</span>
                <span className="ml-1">({pendingUsers.length})</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardDescription>
                    {t('tabs.all_description', { ns: 'users' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewMode === 'table' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('table.headers.user', { ns: 'users' })}</TableHead>
                          <TableHead>{t('table.headers.email', { ns: 'users' })}</TableHead>
                          <TableHead>{t('table.headers.phone', { ns: 'users' })}</TableHead>
                          <TableHead>{t('table.headers.role', { ns: 'users' })}</TableHead>
                          <TableHead>{t('table.headers.status', { ns: 'users' })}</TableHead>
                          <TableHead>{t('table.headers.registration_date', { ns: 'users' })}</TableHead>
                          <TableHead className="text-right">{t('table.headers.actions', { ns: 'users' })}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                             {user.avatar_url ? (
                               <div className="w-8 h-8 flex-shrink-0">
                                 <img 
                                   src={user.avatar_url} 
                                   alt={`${user.first_name} ${user.last_name}`}
                                   className="w-full h-full rounded-full object-cover object-center border border-border"
                                 />
                               </div>
                            ) : (
                               <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                 {user.first_name && user.last_name 
                                   ? `${user.first_name[0]}${user.last_name[0]}` 
                                   : user.email.slice(0, 2).toUpperCase()}
                               </div>
                            )}
                            <div>
                               <p className="font-medium">
                                 {user.first_name && user.last_name
                                   ? `${user.first_name} ${user.last_name}`
                                   : t('table.no_name', { ns: 'users' })}
                               </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || t('table.no_phone', { ns: 'users' })}</TableCell>
                         <TableCell>
                            {user.role.split(', ').map((roleLabel, index) => {
                               // Convertir el label de vuelta al rol original para obtener el badge correcto
                                const originalRole = Object.entries({
                                  'superadmin': getRoleLabel('superadmin'),
                                  'company_owner': getRoleLabel('company_owner'),
                                  'operations_manager': getRoleLabel('operations_manager'),
                                  'dispatcher': getRoleLabel('dispatcher'),
                                  'driver': getRoleLabel('driver'),
                                  'multi_company_dispatcher': getRoleLabel('multi_company_dispatcher')
                                }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';

                              return (
                                <span key={`${user.id}-role-${index}`} className="inline-flex items-center mr-1">
                                  {getRoleBadge(originalRole)}
                                  {index < user.role.split(', ').length - 1 && <span className="mx-1">•</span>}
                                </span>
                              );
                            })}
                         </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                           {formatDateAuto(user.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Mostrar botón de editar conductor solo para conductores */}
                            {user.role.toLowerCase().includes('driver') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDriverId(user.id);
                                  setSelectedDriverName(`${user.first_name} ${user.last_name}` || user.email);
                                  setEditDriverModalOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {/* Botón de acciones de usuario */}
                            <UserActionButton
                              user={user}
                              onUserUpdated={fetchUsers}
                              size="sm"
                              variant="ghost"
                            />
                          </div>
                        </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredUsers.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                           {user.avatar_url ? (
                             <div className="w-10 h-10 flex-shrink-0">
                               <img 
                                 src={user.avatar_url} 
                                 alt={`${user.first_name} ${user.last_name}`}
                                 className="w-full h-full rounded-full object-cover object-center border border-border"
                               />
                             </div>
                          ) : (
                             <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                               {user.first_name && user.last_name 
                                 ? `${user.first_name[0]}${user.last_name[0]}` 
                                 : user.email.slice(0, 2).toUpperCase()}
                             </div>
                          )}
                          <div className="flex-1">
                             <p className="font-medium">
                               {user.first_name && user.last_name
                                 ? `${user.first_name} ${user.last_name}`
                                 : t('table.no_name', { ns: 'users' })}
                             </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                           <div className="space-y-2">
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-muted-foreground">{t('cards.phone', { ns: 'users' })}</span>
                               <span className="text-sm">{user.phone || t('table.no_phone', { ns: 'users' })}</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-muted-foreground">{t('cards.role', { ns: 'users' })}</span>
                               <div className="flex flex-wrap gap-1">
                                   {user.role.split(', ').map((roleLabel, index) => {
                                     // Convertir el label de vuelta al rol original para obtener el badge correcto
                                     const originalRole = Object.entries({
                                         'superadmin': getRoleLabel('superadmin'),
                                         'company_owner': getRoleLabel('company_owner'),
                                         'operations_manager': getRoleLabel('operations_manager'),
                                         'dispatcher': getRoleLabel('dispatcher'),
                                         'driver': getRoleLabel('driver'),
                                         'multi_company_dispatcher': getRoleLabel('multi_company_dispatcher')
                                       }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                                     
                                     return <span key={`${user.id}-card-role-${index}`}>{getRoleBadge(originalRole)}</span>;
                                   })}
                               </div>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-muted-foreground">{t('cards.status', { ns: 'users' })}</span>
                               {getStatusBadge(user.status)}
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-muted-foreground">{t('cards.registration', { ns: 'users' })}</span>
                               <span className="text-sm">{formatDateAuto(user.created_at)}</span>
                             </div>
                           </div>
                           <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setViewDialogOpen(true);
                              }}
                             >
                               <Eye className="h-4 w-4 mr-2" />
                               {t('actions.view', { ns: 'users' })}
                             </Button>
                            
                            {/* Botón de editar conductor para vista de tarjetas */}
                            {user.role.toLowerCase().includes('driver') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDriverId(user.id);
                                  setSelectedDriverName(`${user.first_name} ${user.last_name}` || user.email);
                                  setEditDriverModalOpen(true);
                                }}
                               >
                                 <Truck className="h-4 w-4 mr-2" />
                                 {t('actions.driver', { ns: 'users' })}
                               </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditDialogOpen(true);
                              }}
                             >
                               <Edit className="h-4 w-4 mr-2" />
                               {t('actions.edit', { ns: 'users' })}
                             </Button>
                            
                            {/* Botón de acciones de usuario para vista de tarjetas */}
                            <UserActionButton
                              user={user}
                              onUserUpdated={fetchUsers}
                              size="sm"
                              variant="outline"
                            />
                           </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-6">
            <PendingInvitationsSection 
              title={t('tabs.pending_title', { ns: 'users' })}
              description={t('tabs.pending_description', { ns: 'users' })}
              onInvitationsUpdated={fetchUsers}
            />
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Dialog para invitar usuario */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-white border-border">
          <DialogHeader>
            <DialogTitle>{t('invite_dialog.title', { ns: 'users' })}</DialogTitle>
            <DialogDescription>
              {t('invite_dialog.description', { ns: 'users' })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t('invite_dialog.form.first_name', { ns: 'users' })}</Label>
                <Input
                  id="first_name"
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                  placeholder={t('invite_dialog.form.first_name_placeholder', { ns: 'users' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t('invite_dialog.form.last_name', { ns: 'users' })}</Label>
                <Input
                  id="last_name"
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  placeholder={t('invite_dialog.form.last_name_placeholder', { ns: 'users' })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('invite_dialog.form.email', { ns: 'users' })}</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder={t('invite_dialog.form.email_placeholder', { ns: 'users' })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('invite_dialog.form.role', { ns: 'users' })}</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('invite_dialog.form.role_placeholder', { ns: 'users' })} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                {t('actions.cancel', { ns: 'users' })}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('invite_dialog.sending', { ns: 'users' }) : t('invite_dialog.send_invitation', { ns: 'users' })}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles del usuario */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedUser?.avatar_url ? (
                <div className="w-12 h-12 flex-shrink-0">
                  <img 
                    src={selectedUser.avatar_url} 
                    alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    className="w-full h-full rounded-full object-cover object-center border-2 border-border"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
                  {selectedUser?.first_name && selectedUser.last_name 
                    ? `${selectedUser.first_name[0]}${selectedUser.last_name[0]}` 
                    : selectedUser?.email.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedUser?.first_name && selectedUser.last_name
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : t('view_dialog.no_name', { ns: 'users' })}
                </h2>
                <p className="text-muted-foreground">{selectedUser?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <UserDetailsContent user={selectedUser} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edición general de usuario */}
      <EditUserDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => {
          console.log('🔄 EditUserDialog onSuccess - forcing user list refresh');
          // Force a complete refresh with a small delay to ensure DB changes are propagated
          setTimeout(() => {
            fetchUsers();
          }, 100);
        }}
      />

      {/* Modal de edición de conductor */}
      <EditDriverDialog
        isOpen={editDriverModalOpen}
        onClose={() => {
          setEditDriverModalOpen(false);
          fetchUsers(); // Recargar la lista
        }}
        driver={{ user_id: selectedDriverId, first_name: '', last_name: '' }}
        onSuccess={() => {
          fetchUsers(); // Recargar la lista
        }}
      />

      {/* Dialog de eliminación/desactivación de usuario */}
      <DeleteUserDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        companyId={userRole?.company_id || ''}
        onSuccess={() => {
          fetchUsers(); // Recargar la lista
        }}
      />

      {/* Dialog de eliminación permanente de usuario */}
      <PermanentDeleteUserDialog
        isOpen={permanentDeleteDialogOpen}
        onClose={() => {
          setPermanentDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers(); // Recargar la lista
        }}
      />

      <GenericFloatingActions
        standardActions={[
          { type: 'filters' },
          { type: 'export' },
          { type: 'view' },
          { type: 'stats' }
        ]}
        sheets={[
          {
            key: 'filters',
            content: (
              <UserFiltersSheet
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )
          },
          {
            key: 'export',
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('export.description', { ns: 'users' })}
                </p>
                {/* Aquí irían las opciones de exportación */}
              </div>
            )
          },
          {
            key: 'view',
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('view.description', { ns: 'users' })}
                </p>
                {/* Aquí irían las opciones de vista */}
              </div>
            )
          },
          {
            key: 'stats',
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('stats.description', { ns: 'users' })}
                </p>
                {/* Aquí irían las estadísticas */}
              </div>
            )
          }
        ]}
        position="bottom-right"
        namespace="users"
      />
    </div>
  );
}