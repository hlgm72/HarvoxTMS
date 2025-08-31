/**
 * EJEMPLO: Cómo usar logging seguro en contextos de autenticación
 * Demuestra manejo de información sensible y logs condicionales
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLogger, business, handleAsyncError } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  // ... otros campos
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProviderWithSafeLogging({ children }: { children: React.ReactNode }) {
  const log = useLogger('AuthProvider');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para sanitizar datos sensibles en logs
  const sanitizeUserForLogging = (user: User | null) => {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email?.substring(0, 3) + '***@***', // Parcialmente oculto
      hasEmail: !!user.email,
      // NO incluir password, tokens, etc.
    };
  };

  // Login con logging seguro
  const login = async (email: string, password: string) => {
    try {
      // Log de inicio (sin credenciales)
      log.debug('Login attempt started', { 
        emailDomain: email.split('@')[1], // Solo el dominio, no el email completo
        hasPassword: !!password,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user as User);
        
        // Log de éxito (datos sanitizados)
        log.info('Login successful', {
          userId: data.user.id,
          emailDomain: email.split('@')[1],
          hasSession: !!data.session,
          loginMethod: 'password'
        });

        // Log de negocio para analytics (solo en desarrollo)
        business.auth('user_logged_in', {
          userId: data.user.id,
          loginMethod: 'password',
          emailDomain: email.split('@')[1]
        });
      }

    } catch (error) {
      // ERROR crítico - va a Sentry pero SIN credenciales
      handleAsyncError(error, 'AuthProvider.login', {
        emailDomain: email.split('@')[1], // No el email completo
        hasPassword: !!password,
        attemptTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        // NUNCA incluir: email, password, tokens
      });
      
      throw error;
    }
  };

  // Logout con logging
  const logout = async () => {
    const currentUserId = user?.id;
    
    try {
      log.debug('Logout initiated', { 
        userId: currentUserId,
        hadActiveSession: !!user 
      });

      await supabase.auth.signOut();
      setUser(null);
      
      log.info('Logout completed', { 
        userId: currentUserId,
        logoutMethod: 'manual'
      });

      // Log de negocio
      business.auth('user_logged_out', {
        userId: currentUserId,
        logoutMethod: 'manual'
      });

    } catch (error) {
      handleAsyncError(error, 'AuthProvider.logout', {
        userId: currentUserId,
        hadActiveSession: !!user,
      });
      throw error;
    }
  };

  // Listener de cambios de auth con logging seguro
  useEffect(() => {
    log.debug('Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Log de eventos de auth (sin datos sensibles)
        log.debug('Auth state change event', { 
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id || 'none'
        });

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              setUser(session.user as User);
              
              log.info('User session established', {
                userId: session.user.id,
                sessionSource: event
              });

              business.auth('session_established', {
                userId: session.user.id,
                source: event
              });
            }
            break;

          case 'SIGNED_OUT':
            setUser(null);
            
            log.info('User session ended', {
              event,
              sessionEnded: true
            });

            business.auth('session_ended', {
              source: event
            });
            break;

          case 'TOKEN_REFRESHED':
            // Solo log en desarrollo para token refresh
            log.debug('Auth token refreshed', {
              userId: session?.user?.id,
              hasNewToken: !!session?.access_token
            });
            break;

          default:
            log.debug('Other auth event', { event });
        }

        setLoading(false);
      }
    );

    return () => {
      log.debug('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Verificar sesión inicial
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        log.debug('Initializing auth state');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          log.warn('Error getting initial session', { 
            error: error.message,
            errorCode: error.status 
          });
        }

        if (session?.user) {
          setUser(session.user as User);
          
          log.info('Initial session found', {
            userId: session.user.id,
            hasValidSession: !!session
          });
        } else {
          log.debug('No initial session found');
        }

      } catch (error) {
        handleAsyncError(error, 'AuthProvider.initializeAuth', {
          step: 'get_initial_session',
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Log de estado del provider (solo desarrollo)
  useEffect(() => {
    log.debug('Auth provider state updated', {
      hasUser: !!user,
      userId: user?.id || 'none',
      loading,
      userSanitized: sanitizeUserForLogging(user)
    });
  }, [user, loading]);

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto con logging
export function useAuthWithLogging() {
  const log = useLogger('useAuth');
  const context = useContext(AuthContext);

  if (!context) {
    // ERROR crítico - va a Sentry
    const error = new Error('useAuth must be used within AuthProvider');
    handleAsyncError(error, 'useAuth', {
      missingProvider: true,
      componentStack: new Error().stack
    });
    throw error;
  }

  // Log de acceso al contexto (solo desarrollo)
  log.debug('Auth context accessed', {
    hasUser: !!context.user,
    loading: context.loading
  });

  return context;
}

/**
 * EJEMPLO: Cómo usar este contexto en un componente
 */
export function LoginFormExample() {
  const log = useLogger('LoginFormExample');
  const { login, loading } = useAuthWithLogging();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      log.debug('Login submission blocked - already in progress');
      return;
    }

    setIsSubmitting(true);

    try {
      // Log de intento (sin credenciales)
      log.debug('Login form submission', {
        emailProvided: !!email,
        passwordProvided: !!password,
        emailDomain: email.includes('@') ? email.split('@')[1] : 'invalid'
      });

      await login(email, password);
      
      // El éxito se loggea en el contexto
      log.debug('Login form completed successfully');

    } catch (error) {
      // Error específico del form (sin credenciales)
      log.error('Login form submission failed', error, {
        emailProvided: !!email,
        passwordProvided: !!password,
        formStep: 'submission'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          // NO loggear cada keystroke en campos sensibles
        }}
        placeholder="Email"
      />
      
      <input 
        type="password" 
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          // NO loggear passwords NUNCA
        }}
        placeholder="Password"
      />
      
      <button type="submit" disabled={isSubmitting || loading}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// Exportar el contexto para usar en otras partes
export { AuthContext };