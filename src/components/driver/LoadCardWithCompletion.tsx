import { useLoadCompletion } from '@/hooks/useLoadCompletion';
import { CelebrationLoadCard } from './CelebrationLoadCard';
import { LoadCard } from './LoadCard';

interface LoadCardWithCompletionProps {
  load: {
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
    progress: number;
    latest_status_notes?: string;
    latest_status_eta?: string;
    stops?: any[];
  };
  onUpdateStatus: (loadId: string, newStatus: string, actionText: string, stopId?: string, stopInfo?: any) => void;
  onUploadPOD: (loadId: string) => void;
  onViewDetails: (load: any) => void;
  onCallContact: (load: any) => void;
  onViewRoute: (load: any) => void;
  updateLoadStatus: { isPending: boolean };
  getNextActionText: (status: string) => string;
}

export function LoadCardWithCompletion(props: LoadCardWithCompletionProps) {
  const completionState = useLoadCompletion(props.load.id, props.load.status);

  // Si está en celebración, mostrar tarjeta especial
  if (completionState.showCelebration) {
    return (
      <CelebrationLoadCard
        load={props.load}
        showCelebration={true}
      />
    );
  }

  // Renderizar tarjeta normal
  return <LoadCard {...props} />;
}