import { DeductionsManager } from "@/components/payments/DeductionsManager";
import { PageToolbar } from "@/components/layout/PageToolbar";

export default function Deductions() {
  return (
    <>
      <PageToolbar 
        title="Gestión de Deducciones"
        subtitle="Administra gastos recurrentes y deducciones de conductores"
      />
      <div className="p-6 pt-2 min-h-screen bg-gradient-subtle">
        <DeductionsManager />
      </div>
    </>
  );
}