import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentSystemHealthDashboard } from "@/components/payments/PaymentSystemHealthDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function PaymentSystemHealth() {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Obtener las empresas del usuario
  const { data: userCompanies = [] } = useQuery({
    queryKey: ['user-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['company_owner', 'operations_manager', 'superadmin']);

      if (error) throw error;
      
      // Obtener nombres de empresas
      const companyIds = data.map(item => item.company_id);
      if (companyIds.length === 0) return [];
      
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      if (companiesError) throw companiesError;
      return companies || [];
    },
    enabled: !!user?.id,
  });

  // Auto-seleccionar la primera empresa si solo hay una
  if (userCompanies.length === 1 && !selectedCompanyId) {
    setSelectedCompanyId(userCompanies[0].id);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🔧 Sistema de Cálculos - Salud y Monitoreo</h1>
        <p className="text-muted-foreground">
          Monitoreo en tiempo real de la integridad del sistema de cálculos de pagos
        </p>
      </div>

      {/* Company Selector */}
      {userCompanies.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Empresa</CardTitle>
            <CardDescription>
              Selecciona la empresa para monitorear su sistema de cálculos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Seleccionar empresa..." />
              </SelectTrigger>
              <SelectContent>
                {userCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Sistema de Salud */}
      {selectedCompanyId && (
        <PaymentSystemHealthDashboard companyId={selectedCompanyId} />
      )}
      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre este Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold mb-3">🔄 Triggers Automáticos</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Cargas:</strong> Recálculo automático al crear/editar/eliminar</li>
                <li>• <strong>Combustible:</strong> Recálculo automático de gastos</li>
                <li>• <strong>Otros Ingresos:</strong> Actualización inmediata de totales</li>
                <li>• <strong>Deducciones:</strong> Recálculo automático de períodos</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-3">✅ Validaciones de Integridad</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Verificación automática:</strong> Cada 5 minutos</li>
                <li>• <strong>Detección de inconsistencias:</strong> Totales vs. datos base</li>
                <li>• <strong>Corrección automática:</strong> Un click para arreglar</li>
                <li>• <strong>Alertas de severidad:</strong> Baja, Media, Alta</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-lg font-semibold text-green-800 mb-2">✨ Beneficios del Nuevo Sistema</h4>
            <p className="text-sm text-green-700">
              Este sistema elimina errores como el "período 35" asegurando que todos los cálculos 
              estén siempre correctos y actualizados. Los triggers automáticos garantizan consistencia 
              en tiempo real, mientras que las validaciones preventivas detectan y corrigen inconsistencias 
              antes de que se conviertan en problemas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}