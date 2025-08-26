import { getTodayInUserTimeZone, getUserTimeZone } from '@/lib/dateFormatting';
import { formatDateSafe } from '@/lib/dateFormatting';

// Componente temporal para debug
export const DateDebugger = () => {
  const userTimeZone = getUserTimeZone();
  const todayInUserTZ = getTodayInUserTimeZone();
  const utcToday = formatDateSafe(new Date().toISOString(), 'yyyy-MM-dd');
  
  console.log('🕐 Debug timezone info:', {
    userTimeZone,
    todayInUserTZ, 
    utcToday,
    currentTime: new Date().toString()
  });
  
  return (
    <div className="p-4 bg-muted rounded border">
      <h3 className="font-semibold mb-2">Debug Zona Horaria</h3>
      <p>Tu zona horaria: {userTimeZone}</p>
      <p>Fecha hoy (tu zona): {todayInUserTZ}</p>
      <p>Fecha hoy (UTC): {utcToday}</p>
      <p>Hora actual: {new Date().toString()}</p>
    </div>
  );
};