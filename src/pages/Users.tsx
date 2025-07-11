import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Shield, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface InviteUserForm {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Conductor' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'safety_manager', label: 'Gerente de Seguridad' },
];

export default function Users() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    role: '',
    first_name: '',
    last_name: ''
  });

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.role) {
      toast.error('Email y rol son requeridos');
      return;
    }

    setLoading(true);
    
    try {
      // Llamar a la función edge para enviar invitación
      const { data, error } = await supabase.functions.invoke('send-company-owner-invitation', {
        body: {
          email: inviteForm.email,
          role: inviteForm.role,
          first_name: inviteForm.first_name,
          last_name: inviteForm.last_name,
        }
      });

      if (error) throw error;

      toast.success('Invitación enviada exitosamente');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: '', first_name: '', last_name: '' });
      
      // Aquí podrías recargar la lista de usuarios pendientes
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    const roleOption = ROLE_OPTIONS.find(option => option.value === role);
    return roleOption ? roleOption.label : role;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de tu empresa
          </p>
        </div>
        
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitar Nuevo Usuario
              </DialogTitle>
              <DialogDescription>
                Envía una invitación por email para que se una a tu empresa.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={inviteForm.first_name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rol *</Label>
                <Select 
                  value={inviteForm.role} 
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Enviando...' : 'Enviar Invitación'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios de la Empresa</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados aún.
                  <br />
                  <span className="text-sm">Utiliza el botón "Invitar Usuario" para comenzar.</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}