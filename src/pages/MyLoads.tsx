import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { LoadsManager } from "@/components/driver/LoadsManager";
import { useAuth } from "@/hooks/useAuth";
import { useLoads } from "@/hooks/useLoads";
import { useMemo } from "react";

export default function MyLoads() {
  const { t } = useTranslation();
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
      return "Cargando información de cargas...";
    }
    
    const parts = [];
    if (stats.active > 0) {
      parts.push(`${stats.active} carga${stats.active !== 1 ? 's' : ''} activa${stats.active !== 1 ? 's' : ''}`);
    }
    if (stats.completed > 0) {
      parts.push(`${stats.completed} completada${stats.completed !== 1 ? 's' : ''}`);
    }
    if (parts.length === 0) {
      return "No hay cargas asignadas";
    }
    
    return parts.join(' • ');
  };

  return (
    <>
      <PageToolbar 
        icon={Package}
        title="Mis Cargas"
        subtitle={getSubtitle()}
      />

      <div className="p-2 md:p-4">
        <LoadsManager className="w-full" />
      </div>
    </>
  );
}