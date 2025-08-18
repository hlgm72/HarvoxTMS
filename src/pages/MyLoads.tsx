import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsManager } from "@/components/driver/LoadsManager";
import { useAuth } from "@/hooks/useAuth";
import { useLoads } from "@/hooks/useLoads";
import { useMemo } from "react";

export default function MyLoads() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { user } = useAuth();
  const { data: loadsData = [], isLoading } = useLoads();

  // Calcular estadísticas de las cargas del conductor
  const stats = useMemo(() => {
    if (!loadsData || !user?.id) return { total: 0, active: 0, completed: 0 };
    
    const driverLoads = loadsData.filter(load => load.driver_user_id === user.id);
    const activeLoads = driverLoads.filter(load => !['delivered', 'cancelled'].includes(load.status));
    const completedLoads = driverLoads.filter(load => ['delivered'].includes(load.status));
    
    return {
      total: driverLoads.length,
      active: activeLoads.length,
      completed: completedLoads.length
    };
  }, [loadsData, user?.id]);

  const getSubtitle = () => {
    if (isLoading) {
      return t('dashboard:owner.loads.loading');
    }
    
    const parts = [];
    if (stats.active > 0) {
      parts.push(`${stats.active} ${t('common:load', { count: stats.active })} ${t('common:active', { count: stats.active })}`);
    }
    if (stats.completed > 0) {
      parts.push(`${stats.completed} ${t('common:completed', { count: stats.completed })}`);
    }
    if (parts.length === 0) {
      return t('dashboard:owner.loads.no_loads_description');
    }
    
    return parts.join(' • ');
  };

  return (
    <>
      <PageToolbar 
        icon={Package}
        title={t('common:my_loads', { defaultValue: 'Mis Cargas' })}
        subtitle={getSubtitle()}
      />

      <div className="p-2 md:p-4">
        <LoadsManager className="w-full" />
      </div>
    </>
  );
}