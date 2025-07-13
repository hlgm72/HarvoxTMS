import { useState } from "react";
import { Building2, Phone, Mail, MapPin, MoreHorizontal, Edit, Trash2, Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Client, useDeleteClient } from "@/hooks/useClients";
import { EditClientDialog } from "./EditClientDialog";
import { ClientDetailDialog } from "./ClientDetailDialog";

interface ClientsGridProps {
  clients: Client[];
}

export function ClientsGrid({ clients }: ClientsGridProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const deleteClient = useDeleteClient();

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowEditDialog(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setShowDetailDialog(true);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient.mutateAsync(clientToDelete.id);
      setShowDeleteDialog(false);
      setClientToDelete(null);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <Badge variant={client.is_active ? "default" : "secondary"}>
                    {client.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(client)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(client)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {client.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Contacto:</span>
                  <span>{client.contact_person}</span>
                </div>
              )}
              
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{client.phone}</span>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="flex-1">{client.address}</span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(client)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {selectedClient && (
        <EditClientDialog
          client={selectedClient}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}

      {/* Detail Dialog */}
      {selectedClient && (
        <ClientDetailDialog
          client={selectedClient}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente
              "{clientToDelete?.name}" y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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