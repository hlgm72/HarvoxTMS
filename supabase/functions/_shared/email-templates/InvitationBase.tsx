import * as React from 'npm:react@18.3.1';
import {
  Html,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from 'npm:@react-email/components@0.0.22';
import { EmailHeader } from './components/EmailHeader.tsx';
import { EmailButton } from './components/EmailButton.tsx';
import { EmailFooter } from './components/EmailFooter.tsx';

interface InvitationBaseProps {
  previewText: string;
  title: string;
  subtitle?: string;
  recipientName: string;
  companyName: string;
  role: string;
  invitationUrl: string;
  buttonText: string;
  children?: React.ReactNode;
}

export const InvitationBase = ({
  previewText,
  title,
  subtitle,
  recipientName,
  companyName,
  role,
  invitationUrl,
  buttonText,
  children
}: InvitationBaseProps) => (
  <Html>
    <Preview>{previewText}</Preview>
    <Body style={bodyStyle}>
      <Container style={containerStyle}>
        <EmailHeader title={title} subtitle={subtitle} />
        
        <Section style={contentSection}>
          <Container style={contentContainer}>
            <Text style={greetingText}>
              Hola <strong>{recipientName}</strong>,
            </Text>
            
            <Text style={mainText}>
              Has sido invitado(a) a formar parte de <strong>{companyName}</strong> en FleetNest como <strong>{role}</strong>.
            </Text>
            
            {children}
            
            <Section style={ctaSection}>
              <EmailButton
                href={invitationUrl}
                text={buttonText}
                variant="primary"
              />
            </Section>
            
            <Section style={alternativeSection}>
              <Text style={alternativeText}>
                O copia y pega este enlace en tu navegador:
              </Text>
              <Text style={linkText}>{invitationUrl}</Text>
            </Section>
            
            <Section style={expirationSection}>
              <Text style={expirationText}>
                ⏰ Esta invitación expirará en <strong>7 días</strong>
              </Text>
            </Section>
          </Container>
        </Section>
        
        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

const bodyStyle = {
  backgroundColor: '#f1f5f9',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '20px',
};

const containerStyle = {
  maxWidth: '620px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
};

const contentSection = {
  padding: '40px 20px',
};

const contentContainer = {
  maxWidth: '580px',
  margin: '0 auto',
};

const greetingText = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '400',
  margin: '0 0 24px 0',
  lineHeight: '1.4',
};

const mainText = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const alternativeSection = {
  backgroundColor: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
};

const alternativeText = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const linkText = {
  color: '#667eea',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
  margin: '0',
  padding: '8px',
  backgroundColor: '#ffffff',
  borderRadius: '4px',
  border: '1px solid #e2e8f0',
};

const expirationSection = {
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #f59e0b',
  margin: '24px 0',
};

const expirationText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
};