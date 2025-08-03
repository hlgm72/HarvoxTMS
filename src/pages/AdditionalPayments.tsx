import { useState } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { Calculator, Users, UserCheck, Plus, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdditionalPayments() {
  const { isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const [activeTab, setActiveTab] = useState("income");
  const [userType, setUserType] = useState("drivers"); // "drivers" | "dispatchers"

  // Generar subtitle dinámico basado en el tipo de usuario seleccionado
  const getSubtitle = () => {
    const userTypeText = userType === "drivers" ? "conductores" : "despachadores";
    return `Gestión de ingresos adicionales para ${userTypeText}`;
  };

  const handleAddIncomeDriver = () => {
    // TODO: Abrir modal para agregar ingreso a conductor
    console.log("Agregar ingreso a conductor");
  };

  const handleAddIncomeDispatcher = () => {
    // TODO: Abrir modal para agregar ingreso a despachador
    console.log("Agregar ingreso a despachador");
  };

  return (
    <>
      <PageToolbar 
        icon={Calculator}
        title="Pagos Adicionales" 
        subtitle={getSubtitle()}
        actions={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Ingreso a...
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddIncomeDriver}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Conductor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddIncomeDispatcher}>
                  <Users className="mr-2 h-4 w-4" />
                  Despachador
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="p-2 md:p-4 pr-16 md:pr-20 space-y-6">
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
    </>
  );
}