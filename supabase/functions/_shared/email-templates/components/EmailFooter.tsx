import * as React from 'npm:react@18.3.1';
import {
  Section,
  Container,
  Text,
  Hr,
  Link,
  Img,
} from 'npm:@react-email/components@0.0.22';

export const EmailFooter = () => (
  <Section style={footerSection}>
    <Container style={footerContainer}>
      <Hr style={dividerStyle} />
      
      <Section style={footerContent}>
        <Section style={logoTitleSection}>
          <Img 
            src="https://htaotttcnjxqzpsrqwll.supabase.co/storage/v1/object/public/avatars/fleetnest-bimi-logo.svg"
            alt="FleetNest Logo"
            width="20"
            height="20"
            style={logoStyle}
          />
          <Text style={footerTitle}>FleetNest TMS</Text>
        </Section>
        <Text style={footerDescription}>
          Plataforma profesional de gestión de flotas que conecta transportistas, 
          conductores y operaciones de manera eficiente y segura.
        </Text>
        
        <Section style={linksSection}>
          <Link href="https://fleetnest.app/terms" style={footerLink}>
            Términos de Servicio
          </Link>
          <Text style={linkDivider}>•</Text>
          <Link href="https://fleetnest.app/privacy" style={footerLink}>
            Política de Privacidad
          </Link>
          <Text style={linkDivider}>•</Text>
          <Link href="https://fleetnest.app/support" style={footerLink}>
            Soporte
          </Link>
        </Section>
        
        <Text style={copyrightText}>
          © 2024 FleetNest. Todos los derechos reservados.
        </Text>
        
        <Text style={disclaimerText}>
          Si no esperabas esta invitación, puedes ignorar este email de forma segura.
          El enlace de invitación expirará en 7 días.
        </Text>
      </Section>
    </Container>
  </Section>
);

const footerSection = {
  backgroundColor: '#f8fafc',
  padding: '40px 20px',
  borderRadius: '0 0 12px 12px',
};

const footerContainer = {
  maxWidth: '580px',
  margin: '0 auto',
};

const dividerStyle = {
  borderColor: '#e2e8f0',
  margin: '0 0 32px 0',
};

const footerContent = {
  textAlign: 'center' as const,
};

const footerTitle = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const footerDescription = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 24px 0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const linksSection = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  margin: '24px 0',
};

const footerLink = {
  color: '#667eea',
  fontSize: '14px',
  textDecoration: 'none',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const linkDivider = {
  color: '#cbd5e1',
  fontSize: '14px',
  margin: '0',
};

const copyrightText = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '24px 0 16px 0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const disclaimerText = {
  color: '#94a3b8',
  fontSize: '11px',
  lineHeight: '1.4',
  margin: '0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  fontStyle: 'italic',
};

const logoTitleSection = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  margin: '0 0 12px 0',
};

const logoStyle = {
  display: 'inline-block',
  verticalAlign: 'middle',
};