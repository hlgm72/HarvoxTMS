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
  UserPlus, Mail, Shield, Edit, Trash2, Users as UsersIcon, Eye,
  Activity, Clock, AlertCircle, TrendingUp, Search, Filter, X, Grid, List,
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { useFleetNotifications } from "@/components/notifications";
import { handleTextBlur, createTextHandlers } from "@/lib/textUtils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { EditDriverModal } from "@/components/EditDriverModal";

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
  { value: 'general_manager', label: 'Gerente General' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'safety_manager', label: 'Gerente de Seguridad' },
  { value: 'senior_dispatcher', label: 'Despachador Senior' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'driver', label: 'Conductor' },
];

export default function Users() {
  const { t } = useTranslation(['common']);
  const { user, userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
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
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
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
      // Obtener usuarios de la empresa con sus roles
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

      if (!companyUsers || companyUsers.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Obtener perfiles de usuarios
      const userIds = [...new Set(companyUsers.map(u => u.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Agrupar por usuario para manejar múltiples roles
      const usersMap = new Map<string, User>();
      
      companyUsers.forEach(companyUserRole => {
        const userId = companyUserRole.user_id;
        const profile = profiles?.find(p => p.user_id === userId);
        
        if (usersMap.has(userId)) {
          // Usuario ya existe, agregar rol adicional
          const existingUser = usersMap.get(userId)!;
          existingUser.role = existingUser.role + ', ' + getRoleLabel(companyUserRole.role);
        } else {
          // Nuevo usuario
          usersMap.set(userId, {
            id: userId,
            email: 'N/A', // Se actualizará después si es posible
            phone: profile?.phone || '',
            role: getRoleLabel(companyUserRole.role),
            status: companyUserRole.is_active ? 'active' : 'inactive',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            avatar_url: profile?.avatar_url || '',
            created_at: companyUserRole.created_at
          });
        }
      });

      // Obtener emails para usuarios con privilegios administrativos
      const hasAdminPrivileges = userRole?.role && [
        'superadmin', 
        'company_owner', 
        'general_manager', 
        'operations_manager'
      ].includes(userRole.role);

      if (hasAdminPrivileges) {
        // Los administradores pueden ver emails de invitaciones aceptadas
        try {
          const { data: invitations, error: invError } = await supabase
            .from('user_invitations')
            .select('email, accepted_at')
            .eq('company_id', userRole.company_id)
            .not('accepted_at', 'is', null);

          if (!invError && invitations) {
            // Mapear emails a usuarios basándose en invitaciones
            Array.from(usersMap.values()).forEach(mappedUser => {
              if (mappedUser.id === user?.id) {
                // Usuario actual siempre muestra su email
                mappedUser.email = user.email || 'N/A';
              } else {
                // Para otros usuarios, intentar encontrar el email en invitaciones
                const matchingInvitation = invitations.find(inv => 
                  mappedUser.first_name && mappedUser.last_name && inv.email && (
                    inv.email.toLowerCase().includes(mappedUser.first_name.toLowerCase()) ||
                    inv.email.toLowerCase().includes(mappedUser.last_name.toLowerCase())
                  )
                );
                
                if (matchingInvitation) {
                  mappedUser.email = matchingInvitation.email;
                } else {
                  mappedUser.email = 'Email privado';
                }
              }
            });
          }
        } catch (error) {
          console.warn('No se pudieron obtener emails, usando método básico');
          // Fallback: solo mostrar email del usuario actual
          if (user?.id && usersMap.has(user.id)) {
            const currentUser = usersMap.get(user.id)!;
            currentUser.email = user.email || 'N/A';
          }
        }
      } else {
        // Usuarios sin privilegios solo ven su propio email
        if (user?.id && usersMap.has(user.id)) {
          const currentUser = usersMap.get(user.id)!;
          currentUser.email = user.email || 'N/A';
        }
      }

      const usersList = Array.from(usersMap.values());
      setUsers(usersList);
      setFilteredUsers(usersList); // Inicializar usuarios filtrados
      
      // Calcular estadísticas después de obtener los usuarios
      calculateStats(usersList, userRole?.company_id);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
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
    if (roleFilter) {
      filtered = filtered.filter(user => {
        // Convertir roles del usuario a sus valores originales
        const userRoles = user.role.split(', ').map((roleLabel) => {
          return Object.entries({
            'superadmin': 'Super Admin',
            'company_owner': 'Propietario',
            'general_manager': 'Gerente General', 
            'operations_manager': 'Gerente de Operaciones',
            'safety_manager': 'Gerente de Seguridad',
            'senior_dispatcher': 'Despachador Senior',
            'dispatcher': 'Despachador',
            'driver': 'Conductor',
          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
        });
        return userRoles.includes(roleFilter);
      });
    }

    // Filtro por estado
    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
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
            'superadmin': 'Super Admin',
            'company_owner': 'Propietario',
            'general_manager': 'Gerente General', 
            'operations_manager': 'Gerente de Operaciones',
            'safety_manager': 'Gerente de Seguridad',
            'senior_dispatcher': 'Despachador Senior',
            'dispatcher': 'Despachador',
            'driver': 'Conductor',
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

  // Jerarquía de roles según importancia organizacional (misma que RoleSwitcher)
  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'superadmin': 'Super Admin',
      'company_owner': 'Propietario',
      'general_manager': 'Gerente General', 
      'operations_manager': 'Gerente de Operaciones',
      'safety_manager': 'Gerente de Seguridad',
      'senior_dispatcher': 'Despachador Senior',
      'dispatcher': 'Despachador',
      'driver': 'Conductor',
    };
    
    return roleLabels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'superadmin': 'bg-rose-500 text-white hover:bg-rose-600',
      'company_owner': 'bg-blue-500 text-white hover:bg-blue-600',
      'general_manager': 'bg-indigo-500 text-white hover:bg-indigo-600',
      'operations_manager': 'bg-purple-500 text-white hover:bg-purple-600',
      'safety_manager': 'bg-red-500 text-white hover:bg-red-600',
      'senior_dispatcher': 'bg-amber-600 text-white hover:bg-amber-700',
      'dispatcher': 'bg-orange-500 text-white hover:bg-orange-600',
      'driver': 'bg-green-500 text-white hover:bg-green-600',
    };
    
    return roleColors[role] || 'bg-gray-500 text-white hover:bg-gray-600';
  };

  const getRoleIconColor = (role: string) => {
    const iconColors: Record<string, string> = {
      'superadmin': 'text-rose-500',
      'company_owner': 'text-blue-500',
      'general_manager': 'text-indigo-500',
      'operations_manager': 'text-purple-500',
      'safety_manager': 'text-red-500',
      'senior_dispatcher': 'text-amber-600',
      'dispatcher': 'text-orange-500',
      'driver': 'text-green-500',
    };
    
    return iconColors[role] || 'text-gray-500';
  };

  const sortRolesByHierarchy = (roles: string[]) => {
    const roleHierarchy = [
      'superadmin',
      'company_owner', 
      'general_manager',
      'operations_manager',
      'safety_manager',
      'senior_dispatcher',
      'dispatcher',
      'driver'
    ];
    
    return roles.sort((a, b) => {
      const aIndex = roleHierarchy.indexOf(a);
      const bIndex = roleHierarchy.indexOf(b);
      return aIndex - bIndex;
    });
  };

  // Función para obtener las iniciales del usuario
  const getUserInitials = (user: User) => {
    const firstName = user.first_name?.trim();
    const lastName = user.last_name?.trim();
    
    if (firstName && lastName) {
      return `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`;
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (user.email) {
      return user.email[0].toUpperCase();
    } else {
      return 'U';
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // Extraer roles actuales del usuario
    const currentRoles = user.role.split(', ').map((roleLabel) => {
      const originalRole = Object.entries({
        'superadmin': 'Super Admin',
        'company_owner': 'Propietario',
        'general_manager': 'Gerente General', 
        'operations_manager': 'Gerente de Operaciones',
        'safety_manager': 'Gerente de Seguridad',
        'senior_dispatcher': 'Despachador Senior',
        'dispatcher': 'Despachador',
        'driver': 'Conductor',
      }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
      
      return originalRole;
    });
    setEditingRoles(currentRoles);
    setEditingStatus(user.status); // Inicializar el estado en edición
    setEditDialogOpen(true);
  };

  const handleEditDriver = (user: User) => {
    setSelectedDriverId(user.id);
    setSelectedDriverName(user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user.email
    );
    setEditDriverModalOpen(true);
  };

  const isUserDriver = (user: User) => {
    const userRoles = user.role.split(', ').map((roleLabel) => {
      const originalRole = Object.entries({
        'superadmin': 'Super Admin',
        'company_owner': 'Propietario',
        'general_manager': 'Gerente General', 
        'operations_manager': 'Gerente de Operaciones',
        'safety_manager': 'Gerente de Seguridad',
        'senior_dispatcher': 'Despachador Senior',
        'dispatcher': 'Despachador',
        'driver': 'Conductor',
      }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
      return originalRole;
    });
    return userRoles.includes('driver');
  };

  const handleRoleToggle = (roleValue: string) => {
    setEditingRoles(prev => 
      prev.includes(roleValue) 
        ? prev.filter(r => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || !userRole?.company_id) return;
    
    setUpdatingRoles(true);
    try {
      // Obtener roles actuales del usuario
      const { data: currentRoles, error: fetchError } = await supabase
        .from('user_company_roles')
        .select('role')
        .eq('user_id', selectedUser.id)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const currentRoleValues = currentRoles?.map(r => r.role) || [];
      
      // Identificar roles a remover y agregar
      const rolesToRemove = currentRoleValues.filter(role => !editingRoles.includes(role));
      const rolesToAdd = editingRoles.filter(role => !currentRoleValues.includes(role as UserRole));

      // Actualizar estado si cambió
      const newIsActive = editingStatus === 'active';
      
      // Actualizar estado de todos los roles existentes
      if (editingStatus !== selectedUser.status) {
        const { error: statusError } = await supabase
          .from('user_company_roles')
          .update({ is_active: newIsActive })
          .eq('user_id', selectedUser.id)
          .eq('company_id', userRole.company_id);

        if (statusError) throw statusError;
      }

      // Remover roles (solo si el usuario está activo)
      if (rolesToRemove.length > 0 && newIsActive) {
        const { error: removeError } = await supabase
          .from('user_company_roles')
          .update({ is_active: false })
          .eq('user_id', selectedUser.id)
          .eq('company_id', userRole.company_id)
          .in('role', rolesToRemove);

        if (removeError) throw removeError;
      }

      // Agregar nuevos roles (solo si el usuario está activo)
      if (rolesToAdd.length > 0 && newIsActive) {
        const newRoles = rolesToAdd.map(role => ({
          user_id: selectedUser.id,
          company_id: userRole.company_id,
          role: role as UserRole,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from('user_company_roles')
          .upsert(newRoles, {
            onConflict: 'user_id,company_id,role',
            ignoreDuplicates: false
          });

        if (insertError) throw insertError;
      }

      showSuccess('Usuario actualizado exitosamente');
      setEditDialogOpen(false);
      fetchUsers(); // Recargar la lista
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError(error.message || 'Error al actualizar usuario');
    } finally {
      setUpdatingRoles(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-primary text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-full">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-heading font-bold mb-2 animate-fade-in text-white">
                  Gestión de Usuarios
                </h1>
                <p className="text-white font-body text-lg">
                  Administra los usuarios de tu empresa
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Botón de filtros */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary" className="gap-2 bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {(searchTerm || roleFilter || statusFilter) && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                        {[searchTerm, roleFilter, statusFilter].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      Filtros y Búsqueda
                    </SheetTitle>
                    <SheetDescription>
                      Busca y filtra usuarios por diferentes criterios
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Barra de búsqueda */}
                    <div className="space-y-2">
                      <Label htmlFor="search">Buscar Usuario</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Buscar por nombre o email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                        {searchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtro por rol */}
                    <div className="space-y-2">
                      <Label htmlFor="roleFilter">Filtrar por Rol</Label>
                      <div className="flex gap-2">
                        <Select value={roleFilter || undefined} onValueChange={setRoleFilter}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Todos los roles" />
                          </SelectTrigger>
                           <SelectContent>
                             {ROLE_OPTIONS.map((option) => (
                               <SelectItem key={option.value} value={option.value}>
                                 <div className="flex items-center gap-2">
                                   <Shield className={`h-4 w-4 ${getRoleIconColor(option.value)}`} />
                                   {option.label}
                                 </div>
                               </SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                        {roleFilter && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleFilter('')}
                            className="px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtro por estado */}
                    <div className="space-y-2">
                      <Label htmlFor="statusFilter">Filtrar por Estado</Label>
                      <div className="flex gap-2">
                        <Select value={statusFilter || undefined} onValueChange={setStatusFilter}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-green-500" />
                                Activo
                              </div>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-500" />
                                Inactivo
                              </div>
                            </SelectItem>
                            <SelectItem value="pending">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                Pendiente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {statusFilter && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusFilter('')}
                            className="px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Resumen de filtros */}
                    {(searchTerm || roleFilter || statusFilter) && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm">Filtros Activos:</h4>
                        <div className="space-y-2">
                          {searchTerm && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Búsqueda:</span>
                              <Badge variant="secondary">"{searchTerm}"</Badge>
                            </div>
                          )}
                          {roleFilter && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Rol:</span>
                              <Badge variant="secondary">{ROLE_OPTIONS.find(opt => opt.value === roleFilter)?.label}</Badge>
                            </div>
                          )}
                          {statusFilter && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Estado:</span>
                              <Badge variant="secondary">
                                {statusFilter === 'active' ? 'Activo' : statusFilter === 'inactive' ? 'Inactivo' : 'Pendiente'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {filteredUsers.length} de {users.length} usuarios
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm('');
                              setRoleFilter('');
                              setStatusFilter('');
                            }}
                          >
                            Limpiar Todo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white text-primary hover:bg-white/90 shadow-lg">
                    <UserPlus className="h-4 w-4" />
                    Invitar Usuario
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Invitar Nuevo Usuario
                  </DialogTitle>
                  <DialogDescription>
                    Envía una invitación por email para que se una a tu empresa.
                   </DialogDescription>
                 </DialogHeader>
             
                 <form onSubmit={handleInviteUser} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="first_name">Nombre</Label>
                       <Input
                         id="first_name"
                         value={inviteForm.first_name}
                         {...createTextHandlers(
                           (value) => setInviteForm(prev => ({ ...prev, first_name: value }))
                         )}
                         placeholder="Nombre"
                       />
                     </div>
                     <div>
                       <Label htmlFor="last_name">Apellido</Label>
                       <Input
                         id="last_name"
                         value={inviteForm.last_name}
                         {...createTextHandlers(
                           (value) => setInviteForm(prev => ({ ...prev, last_name: value }))
                         )}
                         placeholder="Apellido"
                       />
                     </div>
                   </div>
                   
                   <div>
                     <Label htmlFor="email">Email *</Label>
                     <Input
                       id="email"
                       type="email"
                       value={inviteForm.email}
                       onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                       placeholder="usuario@ejemplo.com"
                       required
                     />
                   </div>
                   
                   <div>
                     <Label htmlFor="role">Rol *</Label>
                     <Select 
                       value={inviteForm.role} 
                       onValueChange={(value) => {
                         setInviteForm(prev => ({ ...prev, role: value }));
                       }}
                       required
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Selecciona un rol" />
                       </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Shield className={`h-4 w-4 ${getRoleIconColor(option.value)}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                     </Select>
                   </div>
                   
                   <div className="flex gap-2 pt-4">
                     <Button type="submit" disabled={loading} className="flex-1">
                       {loading ? 'Enviando...' : 'Enviar Invitación'}
                     </Button>
                     <Button 
                       type="button" 
                       variant="outline" 
                       onClick={() => setInviteDialogOpen(false)}
                     >
                       Cancelar
                     </Button>
                   </div>
                 </form>
               </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 space-y-6">
         {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
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

        <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%` : '0%'} del total
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingInvitations}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nuevos (7 días)</p>
                <p className="text-3xl font-bold text-purple-600">{stats.recentUsers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Roles */}
      {Object.keys(stats.usersByRole).length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Distribución por Roles
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios asignados a cada rol en tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.usersByRole)
                .sort(([a], [b]) => {
                  const hierarchy = [
                    'superadmin', 'company_owner', 'general_manager', 'operations_manager',
                    'safety_manager', 'senior_dispatcher', 'dispatcher', 'driver'
                  ];
                  return hierarchy.indexOf(a) - hierarchy.indexOf(b);
                })
                .map(([role, count]) => (
                  <div key={role} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                      {getRoleLabel(role)}
                    </Badge>
                    <span className="font-semibold text-lg">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuarios */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Lista de Usuarios</h2>
        {(searchTerm || roleFilter || statusFilter) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para Ver Usuario */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Información del Usuario
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <p className="text-sm font-medium">{selectedUser.first_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Apellido</Label>
                  <p className="text-sm font-medium">{selectedUser.last_name || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium">{selectedUser.email}</p>
              </div>
              
              <div>
                <Label>Teléfono</Label>
                <p className="text-sm font-medium">{selectedUser.phone || 'No especificado'}</p>
              </div>
              
              <div>
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sortRolesByHierarchy(selectedUser.role.split(', ').map((roleLabel) => {
                    const originalRole = Object.entries({
                      'superadmin': 'Super Admin',
                      'company_owner': 'Propietario',
                      'general_manager': 'Gerente General', 
                      'operations_manager': 'Gerente de Operaciones',
                      'safety_manager': 'Gerente de Seguridad',
                      'senior_dispatcher': 'Despachador Senior',
                      'dispatcher': 'Despachador',
                      'driver': 'Conductor',
                    }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                    
                    return originalRole;
                  })).map((originalRole, index) => (
                    <Badge 
                      key={index} 
                      className={`text-xs ${getRoleBadgeColor(originalRole)}`}
                    >
                      {getRoleLabel(originalRole)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Estado</Label>
                <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
              </div>
              
              <div>
                <Label>Fecha de Registro</Label>
                <p className="text-sm font-medium">
                  {new Date(selectedUser.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Usuario */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription>
              Modifica la información del usuario seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <p className="text-sm font-medium">{selectedUser.first_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Apellido</Label>
                  <p className="text-sm font-medium">{selectedUser.last_name || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium">{selectedUser.email}</p>
              </div>
              
              <div>
                <Label>Roles Asignados</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ROLE_OPTIONS.map((roleOption) => (
                    <div key={roleOption.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${roleOption.value}`}
                        checked={editingRoles.includes(roleOption.value)}
                        onChange={() => handleRoleToggle(roleOption.value)}
                        className="rounded border-border"
                        disabled={updatingRoles}
                      />
                      <Label 
                        htmlFor={`role-${roleOption.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        <Badge 
                          className={`text-xs ${getRoleBadgeColor(roleOption.value)} ml-2`}
                        >
                          {roleOption.label}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selecciona los roles que deseas asignar a este usuario
                </p>
              </div>
              
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select 
                  value={editingStatus || undefined} 
                  onValueChange={setEditingStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <Badge variant="destructive">Inactivo</Badge>
                    </SelectItem>
                    <SelectItem value="pending">
                      <Badge variant="secondary">Pendiente</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSaveRoles}
                  disabled={updatingRoles || editingRoles.length === 0}
                  className="flex-1"
                >
                  {updatingRoles ? 'Guardando...' : 'Guardar Roles'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  disabled={updatingRoles}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios de la Empresa</CardTitle>
              <CardDescription>
                Lista de todos los usuarios registrados en tu empresa
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                title="Vista de tarjetas"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            // Vista de tabla
          <div className="relative overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                <TableRow>
                  <TableHead className="border-b shadow-sm">Usuario</TableHead>
                  <TableHead className="border-b shadow-sm">Email</TableHead>
                  <TableHead className="border-b shadow-sm">Teléfono</TableHead>
                  <TableHead className="border-b shadow-sm">Rol</TableHead>
                  <TableHead className="border-b shadow-sm">Estado</TableHead>
                  <TableHead className="border-b shadow-sm">Fecha de Registro</TableHead>
                  <TableHead className="text-right border-b shadow-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                      Cargando usuarios...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-6 animate-fade-in">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                          <UsersIcon className="h-12 w-12 text-muted-foreground/60" />
                        </div>
                      </div>
                      
                      <div className="space-y-3 max-w-sm">
                        <h3 className="text-xl font-semibold text-foreground">
                          {users.length === 0 ? 'No hay usuarios registrados aún' : 'No se encontraron usuarios'}
                        </h3>
                        
                        <p className="text-muted-foreground text-center leading-relaxed">
                          {users.length === 0 
                            ? 'Utiliza el botón "Invitar Usuario" para comenzar.'
                            : 'Prueba con otros criterios de búsqueda o limpia los filtros.'
                          }
                        </p>
                        
                        <div className="pt-4">
                          {users.length === 0 ? (
                            <Button 
                              onClick={() => setInviteDialogOpen(true)}
                              className="gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              Invitar Usuario
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => {
                                setSearchTerm('');
                                setRoleFilter('');
                                setStatusFilter('');
                              }}
                              variant="outline"
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Limpiar Filtros
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            <img 
                              src={user.avatar_url} 
                              alt={`Avatar de ${user.first_name || user.email}`}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {getUserInitials(user)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : 'Sin nombre'
                            }
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.phone || 'No especificado'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sortRolesByHierarchy(user.role.split(', ').map((roleLabel) => {
                          const originalRole = Object.entries({
                            'superadmin': 'Super Admin',
                            'company_owner': 'Propietario',
                            'general_manager': 'Gerente General', 
                            'operations_manager': 'Gerente de Operaciones',
                            'safety_manager': 'Gerente de Seguridad',
                            'senior_dispatcher': 'Despachador Senior',
                            'dispatcher': 'Despachador',
                            'driver': 'Conductor',
                          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                          return originalRole;
                        })).map((originalRole, index) => (
                          <Badge 
                            key={index} 
                            className={`text-xs ${getRoleBadgeColor(originalRole)}`}
                          >
                            {getRoleLabel(originalRole)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isUserDriver(user) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditDriver(user)}
                            title="Editar datos de conductor"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          title="Ver usuario"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          ) : (
            // Vista de tarjetas
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span className="text-muted-foreground">Cargando usuarios...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center space-y-6 py-16 animate-fade-in">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                      <UsersIcon className="h-12 w-12 text-muted-foreground/60" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-w-sm text-center">
                    <h3 className="text-xl font-semibold text-foreground">
                      {users.length === 0 ? 'No hay usuarios registrados aún' : 'No se encontraron usuarios'}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {users.length === 0 
                        ? 'Comienza invitando a los miembros de tu equipo para que puedan acceder al sistema.'
                        : 'Intenta ajustar los filtros de búsqueda para encontrar los usuarios que necesitas.'
                      }
                    </p>
                  </div>
                  
                  {users.length === 0 && (
                    <Button 
                      onClick={() => setInviteDialogOpen(true)}
                      className="mt-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invitar primer usuario
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow animate-fade-in hover-scale">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {user.avatar_url ? (
                              <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                <img 
                                  src={user.avatar_url} 
                                  alt={`Avatar de ${user.first_name || user.email}`}
                                  className="h-full w-full object-cover object-center"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-lg font-medium text-primary">
                                  {getUserInitials(user)}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground truncate">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}`
                                  : 'Sin nombre'
                                }
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewUser(user)}
                              title="Ver usuario"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isUserDriver(user) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditDriver(user)}
                                title="Editar datos de conductor"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuario"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Teléfono:</span>
                            <p className="text-sm text-foreground">{user.phone || 'No especificado'}</p>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Roles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sortRolesByHierarchy(user.role.split(', ').map((roleLabel) => {
                                const originalRole = Object.entries({
                                  'superadmin': 'Super Admin',
                                  'company_owner': 'Propietario',
                                  'general_manager': 'Gerente General', 
                                  'operations_manager': 'Gerente de Operaciones',
                                  'safety_manager': 'Gerente de Seguridad',
                                  'senior_dispatcher': 'Despachador Senior',
                                  'dispatcher': 'Despachador',
                                  'driver': 'Conductor',
                                }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
                                return originalRole;
                              })).map((originalRole, index) => (
                                <Badge 
                                  key={index} 
                                  className={`text-xs ${getRoleBadgeColor(originalRole)}`}
                                >
                                  {getRoleLabel(originalRole)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                              <div className="mt-1">{getStatusBadge(user.status)}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-muted-foreground">Registrado:</span>
                              <p className="text-sm text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Modal para editar conductor */}
      <EditDriverModal
        isOpen={editDriverModalOpen}
        onClose={() => setEditDriverModalOpen(false)}
        userId={selectedDriverId}
        userName={selectedDriverName}
      />
    </div>
  );
}
