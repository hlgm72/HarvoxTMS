import { useState } from "react";
import { Building2, Phone, Mail, MapPin, MoreHorizontal, Edit, Trash2, Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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

interface ClientsListProps {
  clients: Client[];
}

export function ClientsList({ clients }: ClientsListProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card key={client.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={client.logo_url} alt={client.name} />
                  <AvatarFallback>
                    {getInitials(client.alias || client.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      {client.alias && (
                        <p className="text-sm text-muted-foreground">"{client.alias}"</p>
                      )}
                    </div>
                    <Badge variant={client.is_active ? "default" : "secondary"}>
                      {client.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {client.email_domain && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email_domain}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {client.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(client)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
            </div>
          </CardContent>
        </Card>
      ))}

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
    </div>
  );
}