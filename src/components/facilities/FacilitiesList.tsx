import { useState } from "react";
import { Building2, MapPin, MoreHorizontal, Edit, Trash2, Eye, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Facility, useDeleteFacility } from "@/hooks/useFacilities";
import { CreateFacilityDialog } from "./CreateFacilityDialog";
import { useTranslation } from 'react-i18next';

interface FacilitiesListProps {
  facilities: Facility[];
}

export function FacilitiesList({ facilities }: FacilitiesListProps) {
  const { t } = useTranslation('facilities');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);

  const deleteFacility = useDeleteFacility();

  const handleEdit = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowEditDialog(true);
  };

  const handleDelete = (facility: Facility) => {
    setFacilityToDelete(facility);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (facilityToDelete) {
      await deleteFacility.mutateAsync(facilityToDelete.id);
      setShowDeleteDialog(false);
      setFacilityToDelete(null);
    }
  };

  const getFacilityTypeColor = (type: string) => {
    switch (type) {
      case 'shipper':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'receiver':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'both':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {facilities.map((facility) => (
        <Card key={facility.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Mobile Layout */}
            <div className="block sm:hidden space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">{facility.name}</h3>
                  <Badge className={`${getFacilityTypeColor(facility.facility_type)} text-xs mt-1`}>
                    {t(`facility_type.${facility.facility_type}`)}
                  </Badge>
                </div>
                <Badge variant={facility.is_active ? "default" : "secondary"} className="text-xs">
                  {facility.is_active ? t('status.active') : t('status.inactive')}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">
                    {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
                  </span>
                </div>
                {facility.contact_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{facility.contact_name}</span>
                  </div>
                )}
                {facility.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{facility.contact_phone}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-1 pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(facility)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(facility)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg truncate">{facility.name}</h3>
                    <Badge className={getFacilityTypeColor(facility.facility_type)}>
                      {t(`facility_type.${facility.facility_type}`)}
                    </Badge>
                    <Badge variant={facility.is_active ? "default" : "secondary"}>
                      {facility.is_active ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
                      </span>
                    </div>
                    {facility.contact_name && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{facility.contact_name}</span>
                      </div>
                    )}
                    {facility.contact_phone && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{facility.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(facility)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(facility)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Dialog */}
      {selectedFacility && (
        <CreateFacilityDialog
          facility={selectedFacility}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_delete.description', { facilityName: facilityToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirm_delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirm_delete.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
