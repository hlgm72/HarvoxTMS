import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search, Edit, Trash2, Users, Truck, Phone, Mail, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createTextHandlers } from "@/lib/textUtils";

interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  plan_type?: string;
  status?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_title?: string;
  max_users?: number;
  max_vehicles?: number;
  created_at: string;
}

interface CompanyFormData {
  name: string;
  phone: string;
  email: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  plan_type: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  owner_title: string;
  max_users: number;
  max_vehicles: number;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    phone: "",
    email: "",
    street_address: "",
    state_id: "TX",
    zip_code: "",
    plan_type: "basic",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    owner_title: "",
    max_users: 5,
    max_vehicles: 10,
  });
  const { toast } = useToast();

  // Text handlers for phone formatting
  const phoneHandlers = createTextHandlers((value) => 
    setFormData(prev => ({ ...prev, phone: value })), 'phone'
  );
  const ownerPhoneHandlers = createTextHandlers((value) => 
    setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
  );

  // Auto-fill format detection handler
  const handleAutoFillFormat = (value: string, setter: (value: string) => void, type: 'phone') => {
    if (type === 'phone' && value && !value.includes('(') && value.replace(/\D/g, '').length === 10) {
      const digits = value.replace(/\D/g, '');
      const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      setter(formatted);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las empresas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const { error } = await supabase
        .from('companies')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Empresa creada exitosamente",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la empresa",
        variant: "destructive",
      });
    }
  };

  const handleEditCompany = async () => {
    if (!companyToEdit) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', companyToEdit.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Empresa actualizada exitosamente",
      });

      setIsEditDialogOpen(false);
      setCompanyToEdit(null);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la empresa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    try {
      // First check if company can be deleted
      const { data: canDeleteResult, error: checkError } = await supabase
        .rpc('can_delete_test_company', { company_id_param: companyId });

      if (checkError) throw checkError;

      const result = canDeleteResult as any;
      if (!result?.can_delete) {
        toast({
          title: "No se puede eliminar",
          description: result?.reason || "Esta empresa no puede ser eliminada",
          variant: "destructive",
        });
        return;
      }

      // Proceed with deletion
      const { error } = await supabase
        .rpc('delete_test_company', { company_id_param: companyId });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Empresa "${companyName}" eliminada exitosamente`,
      });

      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      street_address: "",
      state_id: "TX",
      zip_code: "",
      plan_type: "basic",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      owner_title: "",
      max_users: 5,
      max_vehicles: 10,
    });
  };

  const openEditDialog = (company: Company) => {
    setCompanyToEdit(company);
    setFormData({
      name: company.name,
      phone: company.phone || "",
      email: company.email || "",
      street_address: company.street_address,
      state_id: company.state_id,
      zip_code: company.zip_code,
      plan_type: company.plan_type || "basic",
      owner_name: company.owner_name || "",
      owner_phone: company.owner_phone || "",
      owner_email: company.owner_email || "",
      owner_title: company.owner_title || "",
      max_users: company.max_users || 5,
      max_vehicles: company.max_vehicles || 10,
    });
    setIsEditDialogOpen(true);
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Activa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactiva</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspendida</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getPlanBadge = (planType?: string) => {
    switch (planType) {
      case 'basic':
        return <Badge variant="outline">Básico</Badge>;
      case 'premium':
        return <Badge variant="default" className="bg-blue-500">Premium</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-500">Enterprise</Badge>;
      case 'trial':
        return <Badge variant="secondary">Prueba</Badge>;
      case 'demo':
        return <Badge variant="secondary">Demo</Badge>;
      default:
        return <Badge variant="outline">Básico</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Gestión de Empresas
          </h1>
          <p className="text-muted-foreground">
            Administra todas las empresas del sistema
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Empresa</DialogTitle>
              <DialogDescription>
                Completa la información para crear una nueva empresa en el sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Información de la Empresa</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Swift Transportation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono de la Empresa</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      {...phoneHandlers}
                      onBlur={(e) => {
                        phoneHandlers.onBlur?.(e);
                        handleAutoFillFormat(e.target.value, (value) => 
                          setFormData(prev => ({ ...prev, phone: value })), 'phone'
                        );
                      }}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email de la Empresa</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@company.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street_address">Dirección *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="street_address"
                      value={formData.street_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                      placeholder="123 Main Street"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="state_id">Estado *</Label>
                    <Select value={formData.state_id} onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip_code">Código Postal *</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan_type">Tipo de Plan</Label>
                  <Select value={formData.plan_type} onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Prueba</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Owner Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Información del Propietario</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Nombre del Propietario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                      placeholder="John Doe"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Teléfono del Propietario</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner_phone"
                      {...ownerPhoneHandlers}
                      onBlur={(e) => {
                        ownerPhoneHandlers.onBlur?.(e);
                        handleAutoFillFormat(e.target.value, (value) => 
                          setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
                        );
                      }}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_email">Email del Propietario</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner_email"
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                      placeholder="owner@company.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_title">Cargo del Propietario</Label>
                  <Input
                    id="owner_title"
                    value={formData.owner_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner_title: e.target.value }))}
                    placeholder="CEO, Presidente, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="max_users">Máx. Usuarios</Label>
                    <Input
                      id="max_users"
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_vehicles">Máx. Vehículos</Label>
                    <Input
                      id="max_vehicles"
                      type="number"
                      value={formData.max_vehicles}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_vehicles: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCompany}>
                Crear Empresa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas ({filteredCompanies.length})</CardTitle>
          <CardDescription>
            Lista de todas las empresas registradas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Límites</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {company.street_address}, {company.state_id} {company.zip_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.owner_name || "No especificado"}</div>
                      <div className="text-sm text-muted-foreground">
                        {company.owner_title || ""}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {company.phone && (
                        <div className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {company.phone}
                        </div>
                      )}
                      {company.email && (
                        <div className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {company.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPlanBadge(company.plan_type)}</TableCell>
                  <TableCell>{getStatusBadge(company.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company.max_users || 5} usuarios
                      </div>
                      <div className="text-sm flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {company.max_vehicles || 10} vehículos
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {(company.plan_type === 'trial' || company.plan_type === 'demo') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente la empresa "{company.name}" y todos sus datos asociados.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCompany(company.id, company.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron empresas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Similar structure to create dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Actualiza la información de la empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Same form structure as create dialog */}
            <div className="space-y-4">
              <h3 className="font-semibold">Información de la Empresa</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre de la Empresa *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Swift Transportation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Teléfono de la Empresa</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    {...phoneHandlers}
                    onBlur={(e) => {
                      phoneHandlers.onBlur?.(e);
                      handleAutoFillFormat(e.target.value, (value) => 
                        setFormData(prev => ({ ...prev, phone: value })), 'phone'
                      );
                    }}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email de la Empresa</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-street_address">Dirección *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                    placeholder="123 Main Street"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-state_id">Estado *</Label>
                  <Select value={formData.state_id} onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-zip_code">Código Postal *</Label>
                  <Input
                    id="edit-zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-plan_type">Tipo de Plan</Label>
                <Select value={formData.plan_type} onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Prueba</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Información del Propietario</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-owner_name">Nombre del Propietario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                    placeholder="John Doe"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_phone">Teléfono del Propietario</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_phone"
                    {...ownerPhoneHandlers}
                    onBlur={(e) => {
                      ownerPhoneHandlers.onBlur?.(e);
                      handleAutoFillFormat(e.target.value, (value) => 
                        setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
                      );
                    }}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_email">Email del Propietario</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_email"
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                    placeholder="owner@company.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_title">Cargo del Propietario</Label>
                <Input
                  id="edit-owner_title"
                  value={formData.owner_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_title: e.target.value }))}
                  placeholder="CEO, Presidente, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-max_users">Máx. Usuarios</Label>
                  <Input
                    id="edit-max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-max_vehicles">Máx. Vehículos</Label>
                  <Input
                    id="edit-max_vehicles"
                    type="number"
                    value={formData.max_vehicles}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_vehicles: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCompany}>
              Actualizar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}