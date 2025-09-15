import React from 'react';
import { PaymentPeriodDiagnosticWidget } from './PaymentPeriodDiagnosticWidget';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PaymentPeriodDiagnosticWidget />
      </div>
    </div>
  );
}