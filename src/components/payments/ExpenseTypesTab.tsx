import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ExpenseTypeDialog } from "./ExpenseTypeDialog";

interface ExpenseType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
  company_id: string;
}

export function ExpenseTypesTab() {
  const { t } = useTranslation('payments');
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);

  // Fetch expense types
  const { data: expenseTypes = [], isLoading } = useQuery({
    queryKey: ['expense-types-all', userRole?.company_id],
    queryFn: async () => {
      if (!userRole?.company_id) return [];

      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('company_id', userRole.company_id)
        .order('name');

      if (error) throw error;
      return data as ExpenseType[];
    },
    enabled: !!userRole?.company_id
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deductions.expenseTypes.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ['expense-types-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      setIsDeleteDialogOpen(false);
      setSelectedExpenseType(null);
    },
    onError: (error: any) => {
      console.error("Error deleting expense type:", error);
      toast.error(error.message || t("deductions.errors.deleteFailed"));
    }
  });

  const handleEdit = (expenseType: ExpenseType) => {
    setSelectedExpenseType(expenseType);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (expenseType: ExpenseType) => {
    setSelectedExpenseType(expenseType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedExpenseType) {
      deleteMutation.mutate(selectedExpenseType.id);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['expense-types-all'] });
    queryClient.invalidateQueries({ queryKey: ['expense-types'] });
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      operational: "default",
      administrative: "secondary",
      percentage_deduction: "outline",
      fuel: "default",
      other: "secondary"
    };

    return (
      <Badge variant={variants[category] || "default"}>
        {t(`deductions.categories.${category}`) || category}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">{t("deductions.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t("deductions.expenseTypes.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("deductions.expenseTypes.description")}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("deductions.expenseTypes.new")}
        </Button>
      </div>

      {expenseTypes.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">{t("deductions.expenseTypes.noTypes")}</p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            {t("deductions.expenseTypes.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("deductions.labels.name")}</TableHead>
                <TableHead>{t("deductions.labels.category")}</TableHead>
                <TableHead>{t("deductions.labels.description")}</TableHead>
                <TableHead className="text-right">{t("deductions.labels.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{getCategoryBadge(type.category)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {type.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <ExpenseTypeDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleSuccess}
        mode="create"
      />

      {/* Edit Dialog */}
      <ExpenseTypeDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedExpenseType(null);
        }}
        onSuccess={handleSuccess}
        expenseType={selectedExpenseType}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deductions.expenseTypes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deductions.expenseTypes.deleteConfirm", { name: selectedExpenseType?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedExpenseType(null)}>
              {t("deductions.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("deductions.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
