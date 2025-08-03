import { useState } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { DispatcherOtherIncomeSection } from "@/components/payments/DispatcherOtherIncomeSection";
import { CreateOtherIncomeForm } from "@/components/payments/CreateOtherIncomeForm";
import { CreateDispatcherOtherIncomeForm } from "@/components/payments/CreateDispatcherOtherIncomeForm";
import { Calculator, Users, UserCheck, Plus, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdditionalPayments() {
  const { isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const [userType, setUserType] = useState("drivers"); // "drivers" | "dispatchers"
  const [isCreateDriverIncomeDialogOpen, setIsCreateDriverIncomeDialogOpen] = useState(false);
  const [isCreateDispatcherIncomeDialogOpen, setIsCreateDispatcherIncomeDialogOpen] = useState(false);

  // Subtitle general para la página
  const getSubtitle = () => {
    return "Gestión de ingresos adicionales para conductores y despachadores";
  };

  const handleAddIncomeDriver = () => {
    setIsCreateDriverIncomeDialogOpen(true);
  };

  const handleAddIncomeDispatcher = () => {
    setIsCreateDispatcherIncomeDialogOpen(true);
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
        {/* Tabs principales para tipo de usuario */}
        <Tabs value={userType} onValueChange={setUserType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Conductores
            </TabsTrigger>
            <TabsTrigger value="dispatchers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Despachadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-4">
            <OtherIncomeSection hideAddButton={true} />
          </TabsContent>

          <TabsContent value="dispatchers" className="space-y-4">
            <DispatcherOtherIncomeSection />
          </TabsContent>
        </Tabs>

      {/* Dialog para crear ingreso de conductor desde el toolbar */}
      <Dialog open={isCreateDriverIncomeDialogOpen} onOpenChange={setIsCreateDriverIncomeDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso para Conductor</DialogTitle>
          </DialogHeader>
          <CreateOtherIncomeForm onClose={() => setIsCreateDriverIncomeDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog para crear ingreso de despachador desde el toolbar */}
      <Dialog open={isCreateDispatcherIncomeDialogOpen} onOpenChange={setIsCreateDispatcherIncomeDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso para Despachador</DialogTitle>
          </DialogHeader>
          <CreateDispatcherOtherIncomeForm onClose={() => setIsCreateDispatcherIncomeDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}