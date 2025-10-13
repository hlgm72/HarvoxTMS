import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ExpenseTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseType?: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  } | null;
  mode: "create" | "edit";
}

interface FormData {
  name: string;
  category: string;
  description: string;
}

export function ExpenseTypeDialog({
  isOpen,
  onClose,
  onSuccess,
  expenseType,
  mode
}: ExpenseTypeDialogProps) {
  const { t } = useTranslation('payments');
  const { userRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      category: "operational",
      description: ""
    }
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    if (mode === "edit" && expenseType) {
      setValue("name", expenseType.name);
      setValue("category", expenseType.category);
      setValue("description", expenseType.description || "");
    } else {
      reset();
    }
  }, [mode, expenseType, setValue, reset]);

  const onSubmit = async (formData: FormData) => {
    if (!userRole?.company_id) {
      toast.error(t("deductions.errors.noCompany"));
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const { error } = await supabase
          .from("expense_types")
          .insert({
            company_id: userRole.company_id,
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null,
            is_active: true
          });

        if (error) throw error;
        toast.success(t("deductions.expenseTypes.createSuccess"));
      } else {
        const { error } = await supabase
          .from("expense_types")
          .update({
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null
          })
          .eq("id", expenseType!.id);

        if (error) throw error;
        toast.success(t("deductions.expenseTypes.updateSuccess"));
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving expense type:", error);
      toast.error(error.message || t("deductions.errors.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col p-0 gap-0 max-h-[90vh]">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" 
                ? t("deductions.expenseTypes.newType")
                : t("deductions.expenseTypes.editType")}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 pt-0">
          <form id="expense-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("deductions.labels.name")} *</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder={t("deductions.placeholders.expenseTypeName")}
              />
              {errors.name && (
                <span className="text-sm text-destructive">
                  {t("deductions.errors.nameRequired")}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="category">{t("deductions.labels.category")} *</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">{t("deductions.categories.operational")}</SelectItem>
                  <SelectItem value="administrative">{t("deductions.categories.administrative")}</SelectItem>
                  <SelectItem value="percentage_deduction">{t("deductions.categories.percentage_deduction")}</SelectItem>
                  <SelectItem value="fuel">{t("deductions.categories.fuel")}</SelectItem>
                  <SelectItem value="advance">{t("deductions.categories.advance")}</SelectItem>
                  <SelectItem value="equipment">{t("deductions.categories.equipment")}</SelectItem>
                  <SelectItem value="insurance">{t("deductions.categories.insurance")}</SelectItem>
                  <SelectItem value="technology">{t("deductions.categories.technology")}</SelectItem>
                  <SelectItem value="maintenance">{t("deductions.categories.maintenance")}</SelectItem>
                  <SelectItem value="regulatory">{t("deductions.categories.regulatory")}</SelectItem>
                  <SelectItem value="communication">{t("deductions.categories.communication")}</SelectItem>
                  <SelectItem value="transportation">{t("deductions.categories.transportation")}</SelectItem>
                  <SelectItem value="training">{t("deductions.categories.training")}</SelectItem>
                  <SelectItem value="vehicle">{t("deductions.categories.vehicle")}</SelectItem>
                  <SelectItem value="other">{t("deductions.categories.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">{t("deductions.labels.description")}</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder={t("deductions.placeholders.description")}
                rows={3}
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex gap-2 p-4 border-t flex-shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t("deductions.actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="expense-type-form"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting 
              ? t("deductions.actions.saving")
              : mode === "create"
              ? t("deductions.actions.create")
              : t("deductions.actions.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
