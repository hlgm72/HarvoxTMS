import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Fuel,
  Receipt
} from "lucide-react";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";

export default function Payments() {
  const { user, isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const [activeTab, setActiveTab] = useState("other-income");

  // Mock data para estadísticas
  const paymentStats = {
    currentPeriod: {
      grossEarnings: 2840.50,
      otherIncome: 320.00,
      totalDeductions: 485.75,
      netPayment: 2674.75,
      status: "in_progress" as const
    },
    lastPeriod: {
      netPayment: 2456.30,
      status: "paid" as const
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />En Progreso</Badge>;
      case "paid":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Pagado</Badge>;
      case "pending":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageToolbar 
        icon={DollarSign}
        title="Gestión de Pagos"
        subtitle={isDriver ? "Mis ingresos y deducciones" : "Administración de pagos de conductores"}
      />

      {/* Resumen de período actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Brutos</p>
                <p className="text-xl font-semibold">${paymentStats.currentPeriod.grossEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Otros Ingresos</p>
                <p className="text-xl font-semibold">${paymentStats.currentPeriod.otherIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Receipt className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deducciones</p>
                <p className="text-xl font-semibold">-${paymentStats.currentPeriod.totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago Neto</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold">${paymentStats.currentPeriod.netPayment.toLocaleString()}</p>
                  {getStatusBadge(paymentStats.currentPeriod.status)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Período anterior para comparación */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Período Anterior</p>
                <p className="font-medium">${paymentStats.lastPeriod.netPayment.toLocaleString()}</p>
              </div>
            </div>
            {getStatusBadge(paymentStats.lastPeriod.status)}
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes secciones */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="other-income" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Otros Ingresos
          </TabsTrigger>
          <TabsTrigger value="fuel-expenses" className="gap-2">
            <Fuel className="h-4 w-4" />
            Combustible
          </TabsTrigger>
          <TabsTrigger value="deductions" className="gap-2">
            <Receipt className="h-4 w-4" />
            Deducciones
          </TabsTrigger>
          <TabsTrigger value="periods" className="gap-2">
            <Calendar className="h-4 w-4" />
            Períodos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="other-income" className="space-y-6">
          <OtherIncomeSection />
        </TabsContent>

        <TabsContent value="fuel-expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Gastos de Combustible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sección en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Deducciones y Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sección en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Períodos de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sección en desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}