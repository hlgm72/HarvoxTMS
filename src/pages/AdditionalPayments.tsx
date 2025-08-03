import { useState } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { Calculator, Users, UserCheck } from "lucide-react";

export default function AdditionalPayments() {
  const [activeTab, setActiveTab] = useState("income");
  const [userType, setUserType] = useState("drivers"); // "drivers" | "dispatchers"

  return (
    <div className="flex-1 space-y-4 p-8">
      <PageToolbar 
        title="Pagos Adicionales" 
        subtitle="Gestión de ingresos adicionales para conductores y despachadores"
        icon={Calculator}
      />

      {/* Selector de tipo de usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seleccionar Tipo de Usuario
          </CardTitle>
          <CardDescription>
            Selecciona si deseas gestionar pagos para conductores o despachadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Label htmlFor="user-type">Tipo de Usuario:</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drivers">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Conductores
                  </div>
                </SelectItem>
                <SelectItem value="dispatchers">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Despachadores
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={userType === "drivers" ? "default" : "secondary"}>
              {userType === "drivers" ? "Conductores" : "Despachadores"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Ingresos Adicionales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          {userType === "drivers" ? (
            <OtherIncomeSection />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos Adicionales para Despachadores</CardTitle>
                <CardDescription>
                  Gestión de ingresos adicionales para despachadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidad para despachadores próximamente</p>
                  <p className="text-sm">Esta sección estará disponible una vez que se implemente el sistema de períodos de pago para despachadores</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}