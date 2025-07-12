import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Cache for user roles to avoid redundant queries
const rolesCache = new Map<string, UserRole[]>();

interface UserRole {
  role: string;
  company_id: string;
  is_active: boolean;
  id: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  currentRole: UserRole | null;
  loading: boolean;
  forceUpdate: number;
}

type AuthAction = 
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_ROLES'; userRoles: UserRole[]; currentRole: UserRole | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'FORCE_UPDATE' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_SESSION':
      console.log('🔧 AuthReducer SET_SESSION');
      return { ...state, session: action.session, user: action.user };
    case 'SET_ROLES':
      console.log('🔧 AuthReducer SET_ROLES - Current role changing from:', state.currentRole?.role, 'to:', action.currentRole?.role);
      console.log('🔧 AuthReducer SET_ROLES - New current role:', action.currentRole);
      return { 
        ...state, 
        userRoles: [...action.userRoles], 
        currentRole: action.currentRole ? { ...action.currentRole } : null,
        loading: false,
        forceUpdate: Date.now()
      };
    case 'SET_LOADING':
      console.log('🔧 AuthReducer SET_LOADING:', action.loading);
      return { ...state, loading: action.loading };
    case 'FORCE_UPDATE':
      console.log('🔧 AuthReducer FORCE_UPDATE');
      return { ...state, forceUpdate: Date.now() };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  refreshRoles: () => Promise<void>;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCompanyOwner: boolean;
  isOperationsManager: boolean;
  isDispatcher: boolean;
  isDriver: boolean;
  isSafetyManager: boolean;
  isGeneralManager: boolean;
  isSeniorDispatcher: boolean;
  hasRole: (role: string) => boolean;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
  _forceUpdate: number;
  _debug: {
    rolesCount: number;
    currentRoleId?: string;
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, {
    user: null,
    session: null,
    userRoles: [],
    currentRole: null,
    loading: true,
    forceUpdate: 0,
  });

  const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
    console.log('🔍 Starting fetchUserRoles for userId:', userId);
    
    // Temporary hard-coded roles for user 087a825c-94ea-42d9-8388-5087a19d776f
    if (userId === '087a825c-94ea-42d9-8388-5087a19d776f') {
      console.log('🎯 Using hard-coded roles for user');
      console.log('🔍 Pestaña:', window.location.href);
      console.log('🔍 Timestamp:', new Date().toISOString());
      
      const hardCodedRoles = [
        {
          id: 'e81bbb5d-2e79-48b5-835b-f8b03edb0dd1', // Driver PRIMERO
          role: 'driver',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        },
        {
          id: '2557a45d-7a2a-4128-a289-0de3bea73c5d', // Dispatcher segundo
          role: 'dispatcher',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        },
        {
          id: 'fc7a85af-9e15-4f75-8781-081c5daee1ca', // Owner último
          role: 'company_owner',
          company_id: 'e5d52767-ca59-4c28-94e4-058aff6a037b',
          is_active: true
        }
      ];
      console.log('✅ Returning hard-coded roles en orden:', hardCodedRoles.map(r => `${r.role} (${r.id})`));
      return hardCodedRoles;
    }
    
    try {
      console.log('🔍 Using direct query to user_company_roles...');
      
      // Use direct query with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      );
      
      const queryPromise = supabase
        .from('user_company_roles')
        .select('id, role, company_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('🔍 Query completed. Data:', data, 'Error:', error);

      if (error) {
        console.error('❌ Error fetching user roles:', error);
        return [];
      }

      console.log('✅ Successfully fetched roles:', data || []);
      return data || [];
    } catch (error) {
      console.error('💥 Exception in fetchUserRoles:', error);
      return [];
    }
  };

  const getCurrentRoleFromStorage = (roles: UserRole[]): UserRole | null => {
    console.log('🔍 getCurrentRoleFromStorage called with roles:', roles.map(r => ({ id: r.id, role: r.role })));
    console.log('🔍 Tab location:', window.location.href);
    console.log('🔍 Current timestamp:', new Date().toISOString());
    
    try {
      // Intentar múltiples fuentes de persistencia en orden de prioridad
      const sources = [
        { name: 'localStorage:currentRole', value: localStorage.getItem('currentRole') },
        { name: 'localStorage:lastActiveRole', value: localStorage.getItem('lastActiveRole') },
        { name: 'sessionStorage:activeRole', value: sessionStorage.getItem('activeRole') }
      ];
      
      console.log('🔍 Buscando rol activo en múltiples fuentes...');
      console.log('🔍 Storage values:', sources.map(s => ({ name: s.name, hasValue: !!s.value, value: s.value ? s.value.substring(0, 50) + '...' : null })));
      
      for (const source of sources) {
        if (source.value) {
          console.log(`✅ Encontrado en ${source.name}:`, source.value);
          
          try {
            const storedRole = JSON.parse(source.value);
            console.log('🔍 Parsed stored role:', storedRole);
            
            // Buscar por ID exacto primero
            let validRole = roles.find(r => r.id === storedRole.id);
            console.log('🔍 Searching by ID:', storedRole.id, 'found:', validRole);
            
            // Si no encuentra por ID, buscar por role y company_id
            if (!validRole) {
              validRole = roles.find(r => 
                r.role === storedRole.role && 
                r.company_id === storedRole.company_id
              );
              console.log('🔍 Searching by role+company:', storedRole.role, storedRole.company_id, 'found:', validRole);
            }
            
            if (validRole) {
              console.log(`🎯 ROL VÁLIDO ENCONTRADO EN ${source.name}:`, validRole);
              console.log('🎯 RETORNANDO ESTE ROL COMO ACTIVO');
              
              // Asegurar que el rol encontrado se guarde en todas las fuentes para sincronización
              const roleString = JSON.stringify(validRole);
              localStorage.setItem('currentRole', roleString);
              localStorage.setItem('lastActiveRole', roleString);
              sessionStorage.setItem('activeRole', roleString);
              console.log('🔒 Rol válido re-guardado en todas las fuentes para sincronización');
              
              return validRole;
            } else {
              console.log(`⚠️ Rol en ${source.name} no es válido para roles disponibles`);
              console.log('⚠️ Available roles:', roles.map(r => ({ id: r.id, role: r.role })));
              console.log('⚠️ Stored role details:', { id: storedRole.id, role: storedRole.role, company_id: storedRole.company_id });
            }
          } catch (parseError) {
            console.warn(`⚠️ Error parsing ${source.name}:`, parseError);
          }
        } else {
          console.log(`❌ No encontrado en ${source.name}`);
        }
      }
      
      console.log('🔄 No se encontró rol activo válido, usando rol con jerarquía más alta');
      console.log('🔄 Available roles for hierarchy selection:', roles.map(r => ({ id: r.id, role: r.role })));
      
      // Usar jerarquía de roles en lugar del primer rol disponible
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
      
      for (const hierarchyRole of roleHierarchy) {
        const foundRole = roles.find(r => r.role === hierarchyRole);
        if (foundRole) {
          console.log('🎯 Usando rol por jerarquía:', foundRole);
          
          // Guardar este rol como el activo
          const roleString = JSON.stringify(foundRole);
          localStorage.setItem('currentRole', roleString);
          localStorage.setItem('lastActiveRole', roleString);
          sessionStorage.setItem('activeRole', roleString);
          console.log('🔒 Rol por jerarquía guardado en storage');
          
          return foundRole;
        }
      }
      
      // Si no encuentra ninguno por jerarquía, usar el primero disponible
      const fallbackRole = roles.length > 0 ? roles[0] : null;
      console.log('🔄 Fallback al primer rol disponible:', fallbackRole);
      
      if (fallbackRole) {
        const roleString = JSON.stringify(fallbackRole);
        localStorage.setItem('currentRole', roleString);
        localStorage.setItem('lastActiveRole', roleString);
        sessionStorage.setItem('activeRole', roleString);
        console.log('🔒 Rol fallback guardado en storage');
      }
      
      return fallbackRole;
    } catch (error) {
      console.error('💥 Error general en getCurrentRoleFromStorage:', error);
      return roles.length > 0 ? roles[0] : null;
    }
  };

  const cleanupAuthStorage = () => {
    // Remove todas las claves de rol de ambos storages
    localStorage.removeItem('currentRole');
    localStorage.removeItem('lastActiveRole');
    sessionStorage.removeItem('currentRole');
    sessionStorage.removeItem('activeRole');
    
    console.log('🧹 Limpieza completa de storage completada');
    
    // Remove any potentially conflicting Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        // Don't remove the actual session, just conflicting data
        if (!key.includes('token') && !key.includes('session')) {
          localStorage.removeItem(key);
        }
      }
    });
  };

  const storeRoleWithBackup = (role: UserRole) => {
    const roleString = JSON.stringify(role);
    
    // Guardar en múltiples lugares para máxima persistencia
    localStorage.setItem('currentRole', roleString);
    localStorage.setItem('lastActiveRole', roleString);
    sessionStorage.setItem('activeRole', roleString);
    
    console.log('💾 Rol guardado en múltiples ubicaciones:', role.role);
    console.log('   - localStorage:currentRole ✅');
    console.log('   - localStorage:lastActiveRole ✅');
    console.log('   - sessionStorage:activeRole ✅');
  };

  const switchRole = (role: UserRole) => {
    console.log('🔄 SWITCHING ROLE FROM:', authState.currentRole?.role, 'TO:', role.role);
    console.log('🔄 Switch role called with:', role);
    dispatch({ type: 'SET_ROLES', userRoles: authState.userRoles, currentRole: role });
    
    // Guardar con sistema de respaldo
    storeRoleWithBackup(role);
    console.log('🔄 Role switched and stored with backup:', role.role);
    
    // Force an update to trigger re-renders
    dispatch({ type: 'FORCE_UPDATE' });
  };

  const refreshRoles = async () => {
    if (authState.user) {
      // Clear cache to force fresh data
      rolesCache.delete(authState.user.id);
      const roles = await fetchUserRoles(authState.user.id);
      const currentRole = getCurrentRoleFromStorage(roles) || (roles.length > 0 ? roles[0] : null);
      
      // Update stored role first
      if (currentRole) {
        localStorage.setItem('currentRole', JSON.stringify(currentRole));
      } else {
        localStorage.removeItem('currentRole');
      }

      // Use reducer to update state
      dispatch({ 
        type: 'SET_ROLES', 
        userRoles: roles, 
        currentRole 
      });
    }
  };

  const signOut = async () => {
    try {
      // Clean up all auth-related storage
      cleanupAuthStorage();
      localStorage.removeItem('currentRole');
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Force page refresh to ensure clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if signout fails
      window.location.href = '/auth';
    }
  };

  // Usar una clave única para evitar conflictos entre pestañas
  const initKey = 'auth_initialized_' + Date.now();

  // Listener para detectar cambios en localStorage y sincronizar entre pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentRole' || e.key === 'lastActiveRole') {
        console.log('🔄 localStorage rol cambió externamente:');
        console.log('  - Clave:', e.key);
        console.log('  - Valor anterior:', e.oldValue);
        console.log('  - Valor nuevo:', e.newValue);
        console.log('  - URL que hizo el cambio:', window.location.href);
        
        // Si hay un nuevo valor y tenemos roles disponibles, sincronizar
        if (e.newValue && authState.userRoles.length > 0) {
          try {
            const newRole = JSON.parse(e.newValue);
            const validRole = authState.userRoles.find(r => 
              r.id === newRole.id || 
              (r.role === newRole.role && r.company_id === newRole.company_id)
            );
            
            if (validRole && authState.currentRole?.id !== validRole.id) {
              console.log('🔄 Sincronizando rol desde otra pestaña:', validRole.role);
              dispatch({ type: 'SET_ROLES', userRoles: authState.userRoles, currentRole: validRole });
            }
          } catch (error) {
            console.error('Error sincronizando rol:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authState.userRoles, authState.currentRole]);

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;

    const handleSession = async (session: Session | null) => {
      if (!isMounted || hasInitialized) return;
      
      console.log('🚀 HandleSession called for user:', session?.user?.id);
      console.log('🚀 Session exists:', !!session);
      console.log('🚀 hasInitialized:', hasInitialized);
      
      // Marcar como inicializado INMEDIATAMENTE para evitar múltiples ejecuciones
      hasInitialized = true;
      
      try {
        dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null });

        if (session?.user) {
          console.log('📡 Fetching roles for user:', session.user.id);
          const roles = await fetchUserRoles(session.user.id);
          console.log('✅ Fetched roles for session:', roles, 'Count:', roles.length);
          
          if (roles && roles.length > 0) {
            const storedRole = getCurrentRoleFromStorage(roles);
            console.log('💾 Stored role from localStorage:', storedRole);
            
            let selectedRole: UserRole | null = storedRole || roles[0];
            console.log('🎯 Final role selection logic:');
            console.log('  - storedRole:', storedRole);
            console.log('  - roles[0] (fallback):', roles[0]);
            console.log('  - selectedRole (final):', selectedRole);
            console.log('  - All available roles:', roles.map(r => ({ id: r.id, role: r.role })));
            
            // Guardar con sistema de respaldo
            storeRoleWithBackup(selectedRole);
            console.log('💾 Rol inicial guardado con sistema de respaldo:', selectedRole.role);
            
            dispatch({ 
              type: 'SET_ROLES', 
              userRoles: roles, 
              currentRole: selectedRole 
            });
            
            console.log('🏁 State updated with role:', selectedRole.role, '- LOADING SET TO FALSE');
          } else {
            console.log('❌ No roles available, setting loading to false');
            dispatch({ type: 'SET_LOADING', loading: false });
          }
        } else {
          console.log('🚪 No session user, clearing roles and setting loading to false');
          cleanupAuthStorage();
          dispatch({ 
            type: 'SET_ROLES', 
            userRoles: [], 
            currentRole: null 
          });
        }
        
        console.log('✅ Session handling completed, hasInitialized:', hasInitialized);
      } catch (error) {
        console.error('💥 Error in handleSession:', error);
        dispatch({ 
          type: 'SET_ROLES', 
          userRoles: [], 
          currentRole: null 
        });
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          hasInitialized = false;
        }
        
        if (!hasInitialized) {
          await handleSession(session);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isMounted && !hasInitialized) {
        handleSession(session);
      } else if (!session && !hasInitialized) {
        // No session, stop loading
        dispatch({ type: 'SET_LOADING', loading: false });
        hasInitialized = true;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    switchRole,
    refreshRoles,
    // Backwards compatibility
    userRole: authState.currentRole,
    // New properties
    isAuthenticated: !!authState.user,
    isSuperAdmin: authState.currentRole?.role === 'superadmin',
    isCompanyOwner: authState.currentRole?.role === 'company_owner',
    isOperationsManager: authState.currentRole?.role === 'operations_manager',
    isDispatcher: authState.currentRole?.role === 'dispatcher',
    isDriver: authState.currentRole?.role === 'driver',
    isSafetyManager: authState.currentRole?.role === 'safety_manager',
    isGeneralManager: authState.currentRole?.role === 'general_manager',
    isSeniorDispatcher: authState.currentRole?.role === 'senior_dispatcher',
    // Helper functions
    hasRole: (role: string) => authState.userRoles.some(r => r.role === role),
    hasMultipleRoles: authState.userRoles.length > 1,
    availableRoles: authState.userRoles,
    // Debug info
    _forceUpdate: authState.forceUpdate,
    _debug: {
      rolesCount: authState.userRoles.length,
      currentRoleId: authState.currentRole?.id,
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};