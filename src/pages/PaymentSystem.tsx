import { PaymentSystemDemo } from '@/components/payment/PaymentSystemDemo';
import { PageToolbar } from '@/components/layout/PageToolbar';

export default function PaymentSystem() {
  return (
    <>
      <PageToolbar 
        title="Sistema de Pagos"
      />
      <div className="container mx-auto p-6 space-y-8">
        <PaymentSystemDemo />
      </div>
    </>
  );
}