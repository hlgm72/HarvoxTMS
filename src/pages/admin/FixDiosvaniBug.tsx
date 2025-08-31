import React from 'react';
import { ForceRecalculation } from '@/components/admin/ForceRecalculation';

// PÁGINA TEMPORAL PARA CORREGIR BUG DE CÁLCULOS DE DIOSVANI
// Semana 31: período 2025-07-28 a 2025-08-03
// Problema: deducciones calculadas sobre $4,500 en lugar de $6,200

export default function FixDiosvaniBug() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Corrección Bug Cálculos</h1>
          <p className="text-muted-foreground mt-2">
            Semana 31 - Diosvani (2025-07-28 a 2025-08-03)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-800 mb-2">Problema Identificado:</h2>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Gross earnings correcto: $6,200</li>
            <li>• Deducciones incorrectas: $360 (debería ser $496)</li>
            <li>• Dispatching: $225 (debería ser $310 - 5%)</li>
            <li>• Factoring: $135 (debería ser $186 - 3%)</li>
            <li>• Net payment incorrecto: $5,840 (debería ser $5,704)</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-800 mb-2">Causa:</h2>
          <p className="text-sm text-blue-700">
            El recálculo automático no se ejecutó correctamente al agregar las cargas nuevas.
            Los porcentajes se calcularon sobre $4,500 (monto anterior) en lugar de $6,200 (monto actual).
          </p>
        </div>

        <ForceRecalculation 
          periodId="9458fa5b-2796-4841-91a1-7dccd4d3bfb8"
          driverName="Diosvani - Semana 31"
        />

        <div className="text-xs text-muted-foreground text-center">
          Esta página es temporal y se eliminará después de la corrección.
        </div>
      </div>
    </div>
  );
}