import { DriverCardsManager } from '@/components/fuel/DriverCardsManager';
import { PageToolbar } from '@/components/layout/PageToolbar';

export default function FuelCards() {
  return (
    <>
      <PageToolbar 
        title="Tarjetas de Combustible WEX"
        subtitle="Gestiona las tarjetas asignadas a los conductores y configura la integración con WEX"
      />
      
      <div className="p-2 md:p-4 pr-16 md:pr-20 space-y-6">
        <DriverCardsManager />
      </div>
    </>
  );
}