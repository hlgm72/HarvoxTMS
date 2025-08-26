import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";

interface Load {
  id: string;
  load_number: string;
  client_name: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  progress?: number;
  latest_status_notes?: string;
  latest_status_eta?: string;
  latest_status_stop_id?: string;
  documents?: Array<{
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
  }>;
  stops?: Array<{
    id: string;
    stop_number: number;
    stop_type: 'pickup' | 'delivery';
    company_name?: string;
    address: string;
    city: string;
    state: string;
    scheduled_date?: string;
    scheduled_time?: string;
  }>;
}

interface CompletedLoadsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  completedLoads: Load[];
  onNavigateToStop: (stop: any) => void;
  isNavigating: boolean;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  openPODUpload: (loadId: string, loadNumber: string) => void;
  setDocumentsDialog: (state: { isOpen: boolean; load?: any }) => void;
}

export function CompletedLoadsModal({ 
  isOpen, 
  onOpenChange, 
  completedLoads,
  onNavigateToStop,
  isNavigating,
  getStatusColor,
  getStatusText,
  openPODUpload,
  setDocumentsDialog
}: CompletedLoadsModalProps) {
  const { t } = useTranslation(['loads', 'dashboard']);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('dashboard:loads.completed_loads_all')} ({completedLoads.length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {completedLoads.map((load) => (
              <Card key={load.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="text-base font-semibold">{load.load_number}</h3>
                    </div>
                     <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/15 hover:border-success/30">
                        {getStatusText('delivered')}
                      </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{load.client_name}</p>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <p>{load.origin_city} → {load.destination_city}</p>
                      <p className="text-muted-foreground">
                        {load.delivery_date ? new Date(load.delivery_date).toLocaleDateString() : 'Sin fecha'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDocumentsDialog({ isOpen: true, load })}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <p className="font-bold text-green-600">${load.total_amount.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}