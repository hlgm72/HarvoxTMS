import { useState, useEffect } from 'react';
import { Button } from './button';
import { X, Terminal } from 'lucide-react';

interface ConsoleLog {
  id: number;
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

export function MobileConsole() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [logId, setLogId] = useState(0);

  useEffect(() => {
    // Solo mostrar en móviles
    if (window.innerWidth >= 768) return;

    // Interceptar console.log, console.error, console.warn
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), {
        id: logId,
        type: 'log',
        message,
        timestamp: new Date()
      }]);
      setLogId(prev => prev + 1);
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), {
        id: logId,
        type: 'error',
        message,
        timestamp: new Date()
      }]);
      setLogId(prev => prev + 1);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), {
        id: logId,
        type: 'warn',
        message,
        timestamp: new Date()
      }]);
      setLogId(prev => prev + 1);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [logId]);

  if (window.innerWidth >= 768) return null;

  return (
    <>
      {/* Botón flotante para abrir la consola */}
      {!isVisible && (
        <Button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 right-4 z-[999999] w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          <Terminal className="h-5 w-5" />
        </Button>
      )}

      {/* Console modal */}
      {isVisible && (
        <div className="fixed inset-0 z-[999999] bg-black/80 flex flex-col">
          <div className="bg-white h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-800 text-white">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-semibold">Mobile Console</span>
                <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                  {logs.length} logs
                </span>
              </div>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-auto p-2 bg-gray-900 text-green-400 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No hay logs aún. Interactúa con la app para ver los logs.
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`mb-2 p-2 rounded border-l-2 ${
                      log.type === 'error' ? 'border-red-500 bg-red-900/20 text-red-300' :
                      log.type === 'warn' ? 'border-yellow-500 bg-yellow-900/20 text-yellow-300' :
                      'border-green-500 bg-green-900/20 text-green-300'
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1">
                      {log.timestamp.toLocaleTimeString()} | {log.type.toUpperCase()}
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-xs">
                      {log.message}
                    </pre>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="p-3 border-t bg-gray-100 flex gap-2">
              <Button
                onClick={() => setLogs([])}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Limpiar Logs
              </Button>
              <Button
                onClick={() => {
                  console.log('🧪 Test log from mobile console');
                  console.error('🚨 Test error from mobile console');
                  console.warn('⚠️ Test warning from mobile console');
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Test Logs
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}