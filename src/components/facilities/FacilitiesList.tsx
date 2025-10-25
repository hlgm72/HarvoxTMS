import { useState } from "react";
import { Building2, MapPin, MoreHorizontal, Edit, Trash2, Phone, RotateCcw } from "lucide-react";
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
import { Facility, useDeleteFacility, useValidateFacilityDeletion, useInactivateFacility, useReactivateFacility } from "@/hooks/useFacilities";
import { CreateFacilityDialog } from "./CreateFacilityDialog";
import { useTranslation } from 'react-i18next';

interface FacilitiesListProps {
  facilities: Facility[];
  showReactivate?: boolean;
}

export function FacilitiesList({ facilities, showReactivate = false }: FacilitiesListProps) {
  const { t } = useTranslation('facilities');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInUseDialog, setShowInUseDialog] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);
  const [inUseInfo, setInUseInfo] = useState<{ load_stops_count: number } | null>(null);

  const deleteFacility = useDeleteFacility();
  const validateDeletion = useValidateFacilityDeletion();
  const inactivateFacility = useInactivateFacility();
  const reactivateFacility = useReactivateFacility();

  const handleEdit = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowEditDialog(true);
  };

  const handleDelete = async (facility: Facility) => {
    setFacilityToDelete(facility);
    
    // Validate if facility can be deleted
    try {
      const validationResult = await validateDeletion.mutateAsync(facility.id);
      
      if (validationResult.is_in_use) {
        // Show in-use dialog
        setInUseInfo({ load_stops_count: validationResult.load_stops_count });
        setShowInUseDialog(true);
      } else {
        // Show normal delete dialog
        setShowDeleteDialog(true);
      }
    } catch (error) {
      console.error('Error validating facility deletion:', error);
    }
  };

  const confirmDelete = async () => {
    if (facilityToDelete) {
      await deleteFacility.mutateAsync(facilityToDelete.id);
      setShowDeleteDialog(false);
      setFacilityToDelete(null);
    }
  };

  const confirmInactivate = async () => {
    if (facilityToDelete) {
      await inactivateFacility.mutateAsync(facilityToDelete.id);
      setShowInUseDialog(false);
      setFacilityToDelete(null);
      setInUseInfo(null);
    }
  };

  const handleReactivate = async (facility: Facility) => {
    await reactivateFacility.mutateAsync(facility.id);
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
                    {showReactivate ? (
                      <DropdownMenuItem onClick={() => handleReactivate(facility)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('actions.reactivate')}
                      </DropdownMenuItem>
                    ) : (
                      <>
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
                      </>
                    )}
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
                    {showReactivate ? (
                      <DropdownMenuItem onClick={() => handleReactivate(facility)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('actions.reactivate')}
                      </DropdownMenuItem>
                    ) : (
                      <>
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
                      </>
                    )}
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

      {/* Facility In Use Dialog */}
      <AlertDialog open={showInUseDialog} onOpenChange={setShowInUseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_inactivate.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_inactivate.description', { 
                facilityName: facilityToDelete?.name,
                count: inUseInfo?.load_stops_count || 0
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowInUseDialog(false);
              setFacilityToDelete(null);
              setInUseInfo(null);
            }}>
              {t('confirm_inactivate.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmInactivate}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {t('confirm_inactivate.inactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
