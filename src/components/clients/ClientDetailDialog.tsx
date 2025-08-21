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
import { Client, useClientContacts, useDeleteContact, ClientContact } from "@/hooks/useClients";
import { CreateDispatcherDialog } from "./CreateDispatcherDialog";
import { EditDispatcherDialog } from "./EditDispatcherDialog";
import { useTranslation } from 'react-i18next';

interface ClientDetailDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  const { t } = useTranslation('clients');
  const [activeTab, setActiveTab] = useState("info");
  const [showCreateDispatcherDialog, setShowCreateDispatcherDialog] = useState(false);
  const [showEditDispatcherDialog, setShowEditDispatcherDialog] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState<ClientContact | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dispatcherToDelete, setDispatcherToDelete] = useState<ClientContact | null>(null);

  const { data: dispatchers = [], isLoading: dispatchersLoading } = useClientContacts(client.id);
  const deleteDispatcher = useDeleteContact();

  const handleEditDispatcher = (dispatcher: ClientContact) => {
    setSelectedDispatcher(dispatcher);
    setShowEditDispatcherDialog(true);
  };

  const handleDeleteDispatcher = (dispatcher: ClientContact) => {
    setDispatcherToDelete(dispatcher);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDispatcher = async () => {
    if (dispatcherToDelete) {
      await deleteDispatcher.mutateAsync({
        id: dispatcherToDelete.id,
        client_id: client.id
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
                {client.is_active ? t('status.active') : t('status.inactive')}
              </Badge>
              <span>•</span>
              <span>{t('messages.detailed_info')}</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">{t('contacts.tabs.info')}</TabsTrigger>
              <TabsTrigger value="contacts">{t('contacts.tabs.contacts')}</TabsTrigger>
              <TabsTrigger value="loads">{t('contacts.tabs.loads')}</TabsTrigger>
              <TabsTrigger value="stats">{t('contacts.tabs.stats')}</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('contacts.general_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('contacts.company_name')}</label>
                      <p className="text-base">{client.name}</p>
                    </div>

                    {client.alias && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('contacts.commercial_name')}</label>
                        <p className="text-base">"{client.alias}"</p>
                      </div>
                    )}

                    {client.mc_number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('contacts.mc_number')}</label>
                        <p className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-mono">{client.mc_number}</span>
                        </p>
                      </div>
                    )}

                    {client.dot_number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('contacts.dot_number')}</label>
                        <p className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-mono">{client.dot_number}</span>
                        </p>
                      </div>
                    )}

                    {client.email_domain && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('contacts.email_domain')}</label>
                        <p className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {client.email_domain}
                        </p>
                      </div>
                    )}
                  </div>

                  {client.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('contacts.address')}</label>
                      <p className="text-base flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        {client.address}
                      </p>
                    </div>
                  )}

                  {client.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('contacts.notes')}</label>
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
                <h3 className="text-lg font-medium">{t('contacts.contacts_dispatchers')}</h3>
                <Button
                  onClick={() => setShowCreateDispatcherDialog(true)}
                  size="sm"
                  className="bg-gradient-fleet hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('contacts.add_contact')}
                </Button>
              </div>

              {dispatchersLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('contacts.loading_contacts')}
                </div>
              ) : dispatchers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('contacts.no_contacts')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('messages.add_contacts_description')}
                    </p>
                    <Button
                      onClick={() => setShowCreateDispatcherDialog(true)}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('contacts.add_first_contact')}
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
                                 {dispatcher.is_active ? t('status.active') : t('status.inactive')}
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
                                   {dispatcher.phone_mobile} ({t('contacts.mobile')})
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
                                {t('contacts.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteDispatcher(dispatcher)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('contacts.delete')}
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
                  <h3 className="text-lg font-semibold mb-2">{t('contacts.load_history')}</h3>
                  <p className="text-muted-foreground">
                    {t('contacts.load_history_description')}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('stats.total_revenue')}</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$0</div>
                    <p className="text-xs text-muted-foreground">
                      {t('contacts.this_year')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('contacts.completed_loads')}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">
                      {t('contacts.total')}
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
            <AlertDialogTitle>{t('contacts.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contacts.confirm_delete_description', { contactName: dispatcherToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('contacts.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDispatcher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('contacts.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}