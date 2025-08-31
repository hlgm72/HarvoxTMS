/**
 * Sistema de logging condicional que evita spam a Sentry en producción
 * Solo logs de error/warn se envían a Sentry en prod, debug/info solo en desarrollo
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  companyId?: string;
  [key: string]: any;
}

class Logger {
  private isProduction = import.meta.env.PROD;
  private isDevelopment = import.meta.env.DEV;
  
  // En producción solo mostramos WARN y ERROR, en desarrollo todo
  private minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  /**
   * Logs de debug - Solo en desarrollo, NUNCA en producción
   * Útil para debugging de flujos, estado de componentes, etc.
   */
  debug(message: string, context?: LogContext): void {
    if (LogLevel.DEBUG >= this.minLevel) {
      console.log(`🔍 ${this.formatMessage('DEBUG', message, context)}`);
    }
  }

  /**
   * Logs informativos - Solo en desarrollo
   * Para eventos importantes pero no críticos
   */
  info(message: string, context?: LogContext): void {
    if (LogLevel.INFO >= this.minLevel) {
      console.info(`ℹ️ ${this.formatMessage('INFO', message, context)}`);
    }
  }

  /**
   * Advertencias - Se muestran en producción y desarrollo
   * Van a Sentry pero son menos críticas
   */
  warn(message: string, context?: LogContext): void {
    if (LogLevel.WARN >= this.minLevel) {
      console.warn(`⚠️ ${this.formatMessage('WARN', message, context)}`);
    }
  }

  /**
   * Errores - Siempre se muestran y van a Sentry
   * Para problemas que requieren atención inmediata
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (LogLevel.ERROR >= this.minLevel) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
      console.error(`❌ ${this.formatMessage('ERROR', message, errorContext)}`);
    }
  }

  /**
   * Logs específicos para operaciones de negocio
   */
  business = {
    /**
     * Para eventos de cálculos de pago, creación de períodos, etc.
     */
    payment: (action: string, details: any) => {
      this.info(`Payment operation: ${action}`, { 
        component: 'PaymentSystem', 
        action, 
        ...details 
      });
    },

    /**
     * Para operaciones con cargas (loads)
     */
    load: (action: string, loadId: string, details?: any) => {
      this.info(`Load operation: ${action}`, { 
        component: 'LoadManager', 
        action, 
        loadId, 
        ...details 
      });
    },

    /**
     * Para operaciones de combustible
     */
    fuel: (action: string, details: any) => {
      this.info(`Fuel operation: ${action}`, { 
        component: 'FuelManager', 
        action, 
        ...details 
      });
    },

    /**
     * Para operaciones de autenticación
     */
    auth: (action: string, details?: any) => {
      // Los logs de auth son sensibles, solo en desarrollo
      if (this.isDevelopment) {
        this.info(`Auth operation: ${action}`, { 
          component: 'AuthSystem', 
          action, 
          ...details 
        });
      }
    }
  };

  /**
   * Logs para performance (solo en desarrollo)
   */
  performance = {
    start: (operation: string): number => {
      if (this.isDevelopment) {
        const startTime = globalThis.performance.now();
        this.debug(`Performance start: ${operation}`, { startTime });
        return startTime;
      }
      return 0;
    },

    end: (operation: string, startTime: number): void => {
      if (this.isDevelopment && startTime > 0) {
        const duration = globalThis.performance.now() - startTime;
        this.debug(`Performance end: ${operation}`, { duration: `${duration.toFixed(2)}ms` });
        
        // Advertir sobre operaciones lentas
        if (duration > 1000) {
          this.warn(`Slow operation detected: ${operation}`, { duration: `${duration.toFixed(2)}ms` });
        }
      }
    }
  };
}

// Instancia singleton del logger
export const logger = new Logger();

// Exports de conveniencia
export const { debug, info, warn, error, business, performance } = logger;

/**
 * Hook para logging en componentes React
 */
export function useLogger(componentName: string) {
  return {
    debug: (message: string, context?: LogContext) => 
      logger.debug(message, { component: componentName, ...context }),
    
    info: (message: string, context?: LogContext) => 
      logger.info(message, { component: componentName, ...context }),
    
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { component: componentName, ...context }),
    
    error: (message: string, error?: Error, context?: LogContext) => 
      logger.error(message, error, { component: componentName, ...context }),
  };
}

/**
 * Utilidad para manejar errores async de forma consistente
 */
export function handleAsyncError(
  error: unknown, 
  context: string, 
  additionalContext?: LogContext
): void {
  if (error instanceof Error) {
    logger.error(`Async error in ${context}`, error, additionalContext);
  } else {
    logger.error(`Unknown async error in ${context}`, undefined, { 
      error: String(error), 
      ...additionalContext 
    });
  }
}