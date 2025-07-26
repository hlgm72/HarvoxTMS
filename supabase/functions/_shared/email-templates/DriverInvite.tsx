import * as React from 'npm:react@18.3.1';
import { Section, Text } from 'npm:@react-email/components@0.0.22';
import { InvitationBase } from './InvitationBase.tsx';

interface DriverInviteProps {
  recipientName: string;
  companyName: string;
  invitationUrl: string;
  hireDate?: string;
}

export const DriverInvite = ({
  recipientName,
  companyName,
  invitationUrl,
  hireDate
}: DriverInviteProps) => (
  <InvitationBase
    previewText={`¡Bienvenido al equipo de ${companyName}!`}
    title="¡Bienvenido a Bordo!"
    subtitle="Únete a nuestro equipo de conductores"
    recipientName={recipientName}
    companyName={companyName}
    role="Conductor"
    invitationUrl={invitationUrl}
    buttonText="Activar Mi Cuenta de Conductor"
  >
    <Section style={welcomeSection}>
      <Text style={welcomeText}>
        🎉 <strong>¡Felicidades por unirte a nuestro equipo!</strong> Estamos emocionados 
        de tenerte como parte de la familia {companyName}.
      </Text>
      {hireDate && (
        <Text style={hireDateText}>
          📅 <strong>Fecha de contratación:</strong> {hireDate}
        </Text>
      )}
    </Section>
    
    <Section style={driverBenefitsSection}>
      <Text style={benefitsTitle}>
        🚛 Tu plataforma de conductor incluye:
      </Text>
      
      <Section style={benefitsList}>
        <Text style={benefitItem}>
          <strong>📱 App Móvil:</strong> Accede desde cualquier lugar con tu smartphone
        </Text>
        <Text style={benefitItem}>
          <strong>📋 Gestión de Cargas:</strong> Ve tus asignaciones y actualiza el estado
        </Text>
        <Text style={benefitItem}>
          <strong>💰 Pagos Transparentes:</strong> Consulta tus ingresos y deducciones
        </Text>
        <Text style={benefitItem}>
          <strong>⛽ Control de Combustible:</strong> Manténte informado de tu consumo de combustible
        </Text>
        <Text style={benefitItem}>
          <strong>📄 Documentos:</strong> Accede a tus documentos y certificaciones
        </Text>
        <Text style={benefitItem}>
          <strong>📞 Comunicación:</strong> Mantente conectado con dispatch y operaciones
        </Text>
      </Section>
    </Section>
    
    <Section style={quickStartSection}>
      <Text style={quickStartTitle}>
        🚀 Comienza a utilizar tu nueva herramienta:
      </Text>
      <Text style={stepText}>
        1. Activa tu cuenta con el botón de abajo<br/>
        2. Completa tu perfil de conductor<br/>
        3. Revisa tus documentos y certificaciones<br/>
        4. Descarga la app móvil<br/>
        5. ¡Listo para tu primera carga!
      </Text>
    </Section>
    
    <Section style={supportSection}>
      <Text style={supportText}>
        💬 <strong>¿Necesitas ayuda?</strong> Nuestro equipo de soporte está disponible 
        para ayudarte en todo momento. No dudes en contactarnos.
      </Text>
    </Section>
  </InvitationBase>
);

const welcomeSection = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #f59e0b',
  margin: '24px 0',
};

const welcomeText = {
  color: '#92400e',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const hireDateText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
};

const driverBenefitsSection = {
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

const quickStartSection = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #22c55e',
  margin: '24px 0',
};

const quickStartTitle = {
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

const supportSection = {
  backgroundColor: '#fef2f2',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #ef4444',
  margin: '24px 0',
};

const supportText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
};