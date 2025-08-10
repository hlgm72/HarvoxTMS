import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Activity, Clock, AlertCircle, TrendingUp, Search, Filter, X, UserPlus, Mail, Shield, Edit, Trash2, Eye,
  Truck
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
import { UserFiltersSheet } from "@/components/users/UserFiltersSheet";
import { PendingInvitationsSection } from "@/components/invitations/PendingInvitationsSection";

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
  { value: 'company_admin', label: '👨‍💼 Company Admin' },
  { value: 'dispatcher', label: '📋 Dispatcher' },
  { value: 'driver', label: '🚛 Driver' },
  { value: 'multi_company_dispatcher', label: '🏢 Multi-Company Dispatcher' },
];

export default function Users() {
  const { t } = useTranslation(['common']);
  const { user, userRole } = useAuth();
  const { showSuccess, showError, showInfo } = useFleetNotifications();
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
    if (!userRole?.company_id) return;
    
    setLoading(true);
    try {
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

      if (error) throw error;

      console.log('🔍 Active company users found:', companyUsers?.length || 0);
      console.log('🔍 Company users data:', companyUsers);

      // Obtener invitaciones pendientes
      const { data: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select(`
          target_user_id,
          first_name,
          last_name,
          email,
          role,
          created_at
        `)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      console.log('🔍 Pending invitations found:', pendingInvitations?.length || 0);
      console.log('🔍 Pending invitations data:', pendingInvitations);

      // Combinar usuarios activos y pendientes
      const allUserIds = new Set();
      const usersMap = new Map<string, User>();

      // Procesar usuarios activos
      if (companyUsers && companyUsers.length > 0) {
        companyUsers.forEach(companyUserRole => {
          const userId = companyUserRole.user_id;
          allUserIds.add(userId);
          
          if (usersMap.has(userId)) {
            // Usuario ya existe, agregar rol adicional
            const existingUser = usersMap.get(userId)!;
            existingUser.role = existingUser.role + ', ' + getRoleLabel(companyUserRole.role);
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
          // Crear un ID único para invitaciones sin target_user_id
          const userId = invitation.target_user_id || `pending-${invitation.email}`;
          
          // Solo agregar si no es un usuario ya activo en esta empresa
          if (!allUserIds.has(userId)) {
            allUserIds.add(userId);
            
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
        setUsers([]);
        setLoading(false);
        return;
      }

      // Obtener perfiles de usuarios para aquellos que tienen user_id
      const userIdsWithProfiles = Array.from(allUserIds).filter((id): id is string => 
        typeof id === 'string' && id.length > 0
      );
      
      let profiles: any[] = [];
      if (userIdsWithProfiles.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url, phone')
          .in('user_id', userIdsWithProfiles);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
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
        'company_admin'
      ].includes(userRole.role);

      if (hasAdminPrivileges) {
        // Usar la función segura para obtener emails de usuarios
        try {
          const { data: userEmails, error: emailError } = await supabase
            .rpc('get_user_emails_for_company', { 
              company_id_param: userRole.company_id 
            });

          if (!emailError && userEmails) {
            // Mapear emails a usuarios
            userEmails.forEach(({ user_id, email }) => {
              if (usersMap.has(user_id)) {
                const mappedUser = usersMap.get(user_id)!;
                mappedUser.email = email || mappedUser.email;
              }
            });
          }
        } catch (error) {
          console.warn('Error obteniendo emails:', error);
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
      console.log('🔍 Final users list length:', usersList.length);
      console.log('🔍 Final users list:', usersList.map(u => ({ 
        id: u.id, 
        email: u.email, 
        status: u.status, 
        first_name: u.first_name, 
        last_name: u.last_name 
      })));
      
      setUsers(usersList);
      setFilteredUsers(usersList); // Inicializar usuarios filtrados
      
      // Calcular estadísticas después de obtener los usuarios
      calculateStats(usersList, userRole?.company_id);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error al cargar usuarios');
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
            'superadmin': '🔧 Super Admin',
            'company_owner': '👑 Company Owner',
            'company_admin': '👨‍💼 Company Admin',
            'dispatcher': '📋 Dispatcher',
            'driver': '🚛 Driver',
            'multi_company_dispatcher': '🏢 Multi-Company Dispatcher'
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

  console.log('🔍 Filtered users total:', filteredUsers.length);
  console.log('🔍 Active users after filter:', activeUsers.length);
  console.log('🔍 Pending users after filter:', pendingUsers.length);
  console.log('🔍 All filtered users statuses:', filteredUsers.map(u => ({ id: u.id, email: u.email, status: u.status })));

  const handleDeleteTestUser = async () => {
    if (!userRole?.role || !['superadmin', 'company_owner'].includes(userRole.role)) {
      showError('Solo los superadministradores y propietarios de empresa pueden eliminar usuarios de prueba');
      return;
    }

    setDeletingTestUser(true);
    try {
      const result = await deleteTestUser();
      
      if (result.success) {
        showSuccess(
          'Usuario de Prueba Eliminado',
          result.alreadyDeleted 
            ? 'El usuario de prueba ya había sido eliminado anteriormente'
            : 'El usuario de prueba ha sido eliminado permanentemente del sistema'
        );
        // Recargar la lista de usuarios
        fetchUsers();
      } else {
        showError(result.error || 'Error al eliminar el usuario de prueba');
      }
    } catch (error: any) {
      console.error('Error deleting test user:', error);
      showError(error.message || 'Error inesperado al eliminar el usuario de prueba');
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
            'superadmin': '🔧 Super Admin',
            'company_owner': '👑 Company Owner',
            'company_admin': '👨‍💼 Company Admin',
            'dispatcher': '📋 Dispatcher',
            'driver': '🚛 Driver',
            'multi_company_dispatcher': '🏢 Multi-Company Dispatcher'
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
        .gt('expires_at', new Date().toISOString());

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
      showError('Email y rol son requeridos');
      return;
    }

    if (!userRole?.company_id) {
      showError('No se pudo obtener la información de la empresa');
      return;
    }

    setLoading(true);
    
    try {
      // Obtener información de la empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', userRole.company_id)
        .single();

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
        'Invitación Enviada',
        `Se ha enviado una invitación a ${displayName}. Recibirá un email con instrucciones para configurar su cuenta.`
      );
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: '', first_name: '', last_name: '' });
      
      // Recargar la lista de usuarios
      fetchUsers();
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      showError(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Función para obtener badge de rol con colores
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: string; className: string }> = {
      'superadmin': { 
        label: '🔧 Super Admin', 
        variant: 'default',
        className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
      },
      'company_owner': { 
        label: '👑 Company Owner', 
        variant: 'default',
        className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
      },
      'company_admin': { 
        label: '👨‍💼 Company Admin', 
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
      },
      'operations_manager': { 
        label: '👨‍💼 Operations Manager', 
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
        label: '📋 Dispatcher', 
        variant: 'default',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
      },
      'driver': { 
        label: '🚛 Driver', 
        variant: 'default',
        className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700'
      },
      'multi_company_dispatcher': { 
        label: '🏢 Multi-Company Dispatcher', 
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

  return (
    <div>
      {/* Page Toolbar */}
      <PageToolbar
        icon={UsersIcon}
        title="Usuarios de la Empresa"
        subtitle={`${filteredUsers.length} usuarios • ${filteredUsers.filter(u => u.status === 'active').length} activos • ${new Set(filteredUsers.map(u => u.role)).size} roles diferentes`}
        actions={
          <div className="flex items-center gap-2">
            <UserFiltersSheet
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
            <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </div>
        }
        viewToggle={
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
        }
      />

      <div className="p-6 space-y-6">
        {/* Dashboard de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Usuarios</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pendingInvitations}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nuevos esta Semana</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.recentUsers}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Todos los Usuarios</TabsTrigger>
              <TabsTrigger value="pending">Pendientes de Activación</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardDescription>
                    Lista de todos los usuarios activos en tu empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewMode === 'table' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha de Registro</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeUsers.map((user) => (
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
                                  : 'Sin nombre'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'No especificado'}</TableCell>
                         <TableCell>
                           {user.role.split(', ').map((roleLabel, index) => {
                              // Convertir el label de vuelta al rol original para obtener el badge correcto
                              const originalRole = Object.entries({
                                'superadmin': '🔧 Super Admin',
                                'company_owner': '👑 Company Owner',
                                'company_admin': '👨‍💼 Company Admin',
                                'dispatcher': '📋 Dispatcher',
                                'driver': '🚛 Driver',
                                'multi_company_dispatcher': '🏢 Multi-Company Dispatcher'
                              }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                             
                             return (
                               <span key={index} className="inline-flex items-center mr-1">
                                 {getRoleBadge(originalRole)}
                                 {index < user.role.split(', ').length - 1 && <span className="mx-1">•</span>}
                               </span>
                             );
                           })}
                         </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
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
                      {activeUsers.map((user) => (
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
                                : 'Sin nombre'}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Teléfono:</span>
                              <span className="text-sm">{user.phone || 'No especificado'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Rol:</span>
                              <div className="flex flex-wrap gap-1">
                                 {user.role.split(', ').map((roleLabel, index) => {
                                   // Convertir el label de vuelta al rol original para obtener el badge correcto
                                   const originalRole = Object.entries({
                                     'superadmin': '🔧 Super Admin',
                                     'company_owner': '👑 Company Owner',
                                     'company_admin': '👨‍💼 Company Admin',
                                     'dispatcher': '📋 Dispatcher',
                                     'driver': '🚛 Driver',
                                     'multi_company_dispatcher': '🏢 Multi-Company Dispatcher'
                                   }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                                   
                                   return getRoleBadge(originalRole);
                                 })}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Estado:</span>
                              {getStatusBadge(user.status)}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Registro:</span>
                              <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
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
                              Ver
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
                                Conductor
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
                              Editar
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
              title="Invitaciones Pendientes"
              description="Usuarios que han sido invitados pero aún no han aceptado su invitación"
              onInvitationsUpdated={fetchUsers}
            />
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Dialog para invitar usuario */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para que se una a tu empresa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
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
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles del usuario */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                 {selectedUser.avatar_url ? (
                   <div className="w-16 h-16 flex-shrink-0">
                     <img 
                       src={selectedUser.avatar_url} 
                       alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                       className="w-full h-full rounded-full object-cover object-center border-2 border-border"
                     />
                   </div>
                ) : (
                   <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
                     {selectedUser.first_name && selectedUser.last_name 
                       ? `${selectedUser.first_name[0]}${selectedUser.last_name[0]}` 
                       : selectedUser.email.slice(0, 2).toUpperCase()}
                   </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUser.first_name && selectedUser.last_name
                      ? `${selectedUser.first_name} ${selectedUser.last_name}`
                      : 'Sin nombre'}
                  </h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rol</Label>
                  <p>{selectedUser.role}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <p>{selectedUser.phone || 'No especificado'}</p>
                </div>
                <div>
                  <Label>Fecha de Registro</Label>
                  <p>{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
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
          fetchUsers(); // Recargar la lista
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
    </div>
  );
}