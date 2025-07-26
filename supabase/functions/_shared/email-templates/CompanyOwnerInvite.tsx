import * as React from 'npm:react@18.3.1';
import { Section, Text } from 'npm:@react-email/components@0.0.22';
import { InvitationBase } from './InvitationBase.tsx';

interface CompanyOwnerInviteProps {
  recipientName: string;
  companyName: string;
  invitationUrl: string;
}

export const CompanyOwnerInvite = ({
  recipientName,
  companyName,
  invitationUrl
}: CompanyOwnerInviteProps) => (
  <InvitationBase
    previewText={`Invitación para administrar ${companyName} en FleetNest`}
    title="Invitación de Propietario"
    subtitle="Gestiona tu empresa en FleetNest"
    recipientName={recipientName}
    companyName={companyName}
    role="Propietario de Empresa"
    invitationUrl={invitationUrl}
    buttonText="Crear mi cuenta"
  >
    <Section style={ownerBenefitsSection}>
      <Text style={benefitsTitle}>
        🚚 Como Propietario de Empresa tendrás acceso completo a:
      </Text>
      
      <Section style={benefitsList}>
        <Text style={benefitItem}>
          <strong>📊 Dashboard Ejecutivo:</strong> Visión completa de tu operación en tiempo real
        </Text>
        <Text style={benefitItem}>
          <strong>👥 Gestión de Equipo:</strong> Administra conductores, despachadores y personal
        </Text>
        <Text style={benefitItem}>
          <strong>💰 Control Financiero:</strong> Pagos, deducciones y reportes detallados
        </Text>
        <Text style={benefitItem}>
          <strong>🚛 Gestión de Flota:</strong> Equipos, mantenimiento y documentación
        </Text>
        <Text style={benefitItem}>
          <strong>📋 Operaciones:</strong> Cargas, clientes y seguimiento en tiempo real
        </Text>
        <Text style={benefitItem}>
          <strong>⚙️ Configuración:</strong> Personaliza la plataforma según tus necesidades
        </Text>
      </Section>
    </Section>
    
    <Section style={nextStepsSection}>
      <Text style={nextStepsTitle}>
        🎯 Primeros pasos después de activar tu cuenta:
      </Text>
      <Text style={stepText}>
        1. Configura los datos básicos de tu empresa<br/>
        2. Invita a tu equipo (conductores, despachadores, etc.)<br/>
        3. Registra tu flota de vehículos<br/>
        4. Configura tus clientes y brokers<br/>
        5. ¡Comienza a gestionar tus operaciones!
      </Text>
    </Section>
  </InvitationBase>
);

const ownerBenefitsSection = {
  backgroundColor: '#f0f9ff',
  padding: '24px',
  borderRadius: '8px',
  border: '1px solid #0ea5e9',
  margin: '24px 0',
};

const benefitsTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const benefitsList = {
  margin: '0',
};

const benefitItem = {
  color: '#075985',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px 0',
  paddingLeft: '8px',
};

const nextStepsSection = {
  backgroundColor: '#f0fdf4',
  padding: '24px',
  borderRadius: '8px',
  border: '1px solid #22c55e',
  margin: '24px 0',
};

const nextStepsTitle = {
  color: '#14532d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const stepText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  paddingLeft: '8px',
};