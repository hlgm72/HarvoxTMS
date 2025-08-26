import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, User, MessageSquare, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLoadStatusHistory } from "@/hooks/useLoadStatusHistory";
import { formatDateTimeAuto } from "@/lib/dateFormatting";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadStatusHistoryDialogProps {
  loadId: string;
  loadNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  assigned: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  en_route_pickup: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  at_pickup: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  loaded: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  en_route_delivery: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  at_delivery: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  completed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const statusLabels: Record<string, string> = {
  assigned: "Assigned",
  en_route_pickup: "En Route to Pickup", 
  at_pickup: "At Pickup",
  loaded: "Loaded",
  en_route_delivery: "En Route to Delivery",
  at_delivery: "At Delivery", 
  delivered: "Delivered",
  completed: "Completed",
};

export function LoadStatusHistoryDialog({ 
  loadId, 
  loadNumber, 
  isOpen, 
  onClose 
}: LoadStatusHistoryDialogProps) {
  const { t } = useTranslation('loads');
  const { data: history = [], isLoading, error } = useLoadStatusHistory(loadId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('history.title')} - Carga #{loadNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Error al cargar el historial de estados
                </div>
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="text-center text-muted-foreground">
                  {t('history.no_history')}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <Card key={entry.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Status Badge and ETA in same line */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              className={statusColors[entry.new_status] || "bg-muted"}
                            >
                              {t(statusLabels[entry.new_status]) || entry.new_status}
                            </Badge>
                            {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {t('history.current')}
                            </Badge>
                            )}
                          </div>
                          
                          {/* ETA Information (separated but same line) */}
                          {entry.eta_provided && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {entry.new_status.includes('en_route') ? t('history.eta') : t('history.time')}
                                <span className="font-medium text-foreground">
                                  {formatDateTimeAuto(entry.eta_provided)}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Timestamp and User */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTimeAuto(entry.changed_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user_name}
                          </div>
                        </div>

                        {/* Notes */}
                        {entry.notes && (
                          <div className="flex items-start gap-2 mt-2">
                            <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground" />
                            <p className="text-sm bg-muted/50 rounded-md p-2 flex-1">
                              {entry.notes}
                            </p>
                          </div>
                        )}

                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-6 top-full w-0.5 h-3 bg-border" />
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}