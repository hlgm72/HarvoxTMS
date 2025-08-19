import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Activity } from "lucide-react";
import { LoadStatusHistoryDialog } from "./LoadStatusHistoryDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from 'react-i18next';

interface LoadStatusHistoryButtonProps {
  loadId: string;
  loadNumber: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export function LoadStatusHistoryButton({ 
  loadId, 
  loadNumber, 
  variant = "outline",
  size = "sm",
  showText = true
}: LoadStatusHistoryButtonProps) {
  const { t } = useTranslation('loads');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const ButtonContent = () => (
    <>
      <Activity className="h-4 w-4" />
      {showText && size !== "icon" && t('actions.status_history')}
    </>
  );

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={() => setIsDialogOpen(true)}
      className="flex items-center gap-2"
    >
      <ButtonContent />
    </Button>
  );

  return (
    <>
      {!showText || size === "icon" ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver historial de estados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <LoadStatusHistoryDialog
        loadId={loadId}
        loadNumber={loadNumber}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}