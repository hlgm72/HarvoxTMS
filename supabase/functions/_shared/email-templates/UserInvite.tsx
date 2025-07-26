import * as React from 'npm:react@18.3.1';
import { Section, Text } from 'npm:@react-email/components@0.0.22';
import { InvitationBase } from './InvitationBase.tsx';

interface UserInviteProps {
  recipientName: string;
  companyName: string;
  role: string;
  invitationUrl: string;
}

export const UserInvite = ({
  recipientName,
  companyName,
  role,
  invitationUrl
}: UserInviteProps) => (
  <InvitationBase
    previewText={`Invitación para unirte a ${companyName} como ${role}`}
    title="Invitación al Equipo"
    subtitle={`Únete como ${role}`}
    recipientName={recipientName}
    companyName={companyName}
    role={role}
    invitationUrl={invitationUrl}
    buttonText="Unirme al Equipo"
  >
    <Section style={roleDescriptionSection}>
      <Text style={roleTitle}>
        👤 Tu rol como <strong>{role}</strong>:
      </Text>
      <Text style={roleDescription}>
        {getRoleDescription(role)}
      </Text>
    </Section>
    
    <Section style={platformBenefitsSection}>
      <Text style={benefitsTitle}>
        🌟 Acceso a la plataforma FleetNest:
      </Text>
      
      <Section style={benefitsList}>
        <Text style={benefitItem}>
          <strong>📊 Dashboard Personalizado:</strong> Vista adaptada a tu rol y responsabilidades
        </Text>
        <Text style={benefitItem}>
          <strong>🔐 Acceso Seguro:</strong> Información protegida y permisos específicos
        </Text>
        <Text style={benefitItem}>
          <strong>📱 Multi-dispositivo:</strong> Accede desde computadora, tablet o móvil
        </Text>
        <Text style={benefitItem}>
          <strong>⚡ Tiempo Real:</strong> Información actualizada al instante
        </Text>
        <Text style={benefitItem}>
          <strong>🤝 Colaboración:</strong> Trabajo en equipo eficiente y coordinado
        </Text>
        <Text style={benefitItem}>
          <strong>📈 Reportes:</strong> Análisis y métricas relevantes para tu trabajo
        </Text>
      </Section>
    </Section>
    
    <Section style={nextStepsSection}>
      <Text style={nextStepsTitle}>
        🎯 Siguientes pasos:
      </Text>
      <Text style={stepText}>
        1. Activa tu cuenta haciendo clic en el botón de arriba<br/>
        2. Completa tu perfil profesional<br/>
        3. Explora las funcionalidades de tu rol<br/>
        4. Comienza a colaborar con tu equipo<br/>
        5. Contacta a tu supervisor para cualquier pregunta
      </Text>
    </Section>
  </InvitationBase>
);

const getRoleDescription = (role: string): string => {
  const descriptions: Record<string, string> = {
    'dispatcher': 'Coordinarás las operaciones de transporte, asignarás cargas a conductores y darás seguimiento en tiempo real a las entregas.',
    'operations_manager': 'Supervisarás las operaciones diarias, gestionarás la flota y tomarás decisiones estratégicas para optimizar la eficiencia.',
    'admin': 'Tendrás acceso administrativo para gestionar usuarios, configuraciones y funcionalidades avanzadas del sistema.',
    'accountant': 'Gestionarás los aspectos financieros, pagos, facturas y reportes contables de la empresa.',
    'mechanic': 'Gestionarás el mantenimiento de la flota, programarás servicios y mantendrás registros de reparaciones.',
  };
  
  return descriptions[role] || 'Formarás parte del equipo con acceso específico según tu rol y responsabilidades.';
};

const roleDescriptionSection = {
  backgroundColor: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  margin: '24px 0',
};

const roleTitle = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const roleDescription = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
};

const platformBenefitsSection = {
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
  padding: '20px',
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