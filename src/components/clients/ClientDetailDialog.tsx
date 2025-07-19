import { useState } from "react";
import { Building2, Users, Plus, Edit, Trash2, Phone, Mail, MapPin, FileText, TrendingUp, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Client, useClientDispatchers, useDeleteDispatcher, ClientDispatcher } from "@/hooks/useClients";
import { CreateDispatcherDialog } from "./CreateDispatcherDialog";
import { EditDispatcherDialog } from "./EditDispatcherDialog";

interface ClientDetailDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [showCreateDispatcherDialog, setShowCreateDispatcherDialog] = useState(false);
  const [showEditDispatcherDialog, setShowEditDispatcherDialog] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState<ClientDispatcher | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dispatcherToDelete, setDispatcherToDelete] = useState<ClientDispatcher | null>(null);

  const { data: dispatchers = [], isLoading: dispatchersLoading } = useClientDispatchers(client.id);
  const deleteDispatcher = useDeleteDispatcher();

  const handleEditDispatcher = (dispatcher: ClientDispatcher) => {
    setSelectedDispatcher(dispatcher);
    setShowEditDispatcherDialog(true);
  };

  const handleDeleteDispatcher = (dispatcher: ClientDispatcher) => {
    setDispatcherToDelete(dispatcher);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDispatcher = async () => {
    if (dispatcherToDelete) {
      await deleteDispatcher.mutateAsync({
        id: dispatcherToDelete.id,
        broker_id: client.id
      });
      setShowDeleteDialog(false);
      setDispatcherToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {client.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant={client.is_active ? "default" : "secondary"}>
                {client.is_active ? "Activo" : "Inactivo"}
              </Badge>
              <span>•</span>
              <span>Información detallada del cliente</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="loads">Cargas</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nombre de la Empresa</label>
                      <p className="text-base">{client.name}</p>
                    </div>

                    {client.alias && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nombre Comercial / Alias</label>
                        <p className="text-base">"{client.alias}"</p>
                      </div>
                    )}

                    {client.mc_number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Número MC</label>
                        <p className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-mono">{client.mc_number}</span>
                        </p>
                      </div>
                    )}

                    {client.dot_number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Número DOT</label>
                        <p className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-mono">{client.dot_number}</span>
                        </p>
                      </div>
                    )}

                    {client.email_domain && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Dominio de Email</label>
                        <p className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {client.email_domain}
                        </p>
                      </div>
                    )}
                  </div>

                  {client.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                      <p className="text-base flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        {client.address}
                      </p>
                    </div>
                  )}

                  {client.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Notas</label>
                      <p className="text-base flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5" />
                        {client.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Contactos y Despachadores</h3>
                <Button
                  onClick={() => setShowCreateDispatcherDialog(true)}
                  size="sm"
                  className="bg-gradient-fleet hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Contacto
                </Button>
              </div>

              {dispatchersLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando contactos...
                </div>
              ) : dispatchers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay contactos</h3>
                    <p className="text-muted-foreground mb-4">
                      Agrega contactos y despachadores para este cliente
                    </p>
                    <Button
                      onClick={() => setShowCreateDispatcherDialog(true)}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Contacto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {dispatchers.map((dispatcher) => (
                    <Card key={dispatcher.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{dispatcher.name}</h4>
                              <Badge variant={dispatcher.is_active ? "default" : "secondary"}>
                                {dispatcher.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {dispatcher.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {dispatcher.email}
                                </span>
                              )}
                              {dispatcher.phone_office && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {dispatcher.phone_office}
                                  {dispatcher.extension && ` ext. ${dispatcher.extension}`}
                                </span>
                              )}
                              {dispatcher.phone_mobile && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {dispatcher.phone_mobile} (móvil)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditDispatcher(dispatcher)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteDispatcher(dispatcher)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="loads" className="space-y-4">
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Historial de Cargas</h3>
                  <p className="text-muted-foreground">
                    El historial de cargas estará disponible cuando se implemente la gestión de cargas
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$0</div>
                    <p className="text-xs text-muted-foreground">
                      Este año
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cargas Completadas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">
                      Total
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Dispatcher Dialog */}
      <CreateDispatcherDialog
        clientId={client.id}
        open={showCreateDispatcherDialog}
        onOpenChange={setShowCreateDispatcherDialog}
      />

      {/* Edit Dispatcher Dialog */}
      {selectedDispatcher && (
        <EditDispatcherDialog
          dispatcher={selectedDispatcher}
          open={showEditDispatcherDialog}
          onOpenChange={setShowEditDispatcherDialog}
        />
      )}

      {/* Delete Dispatcher Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el contacto
              "{dispatcherToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDispatcher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}