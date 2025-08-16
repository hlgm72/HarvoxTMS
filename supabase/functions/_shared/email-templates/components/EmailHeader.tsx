import * as React from 'npm:react@18.3.1';
import {
  Section,
  Container,
  Img,
  Text,
  Head,
  Font,
} from 'npm:@react-email/components@0.0.22';

interface EmailHeaderProps {
  title: string;
  subtitle?: string;
}

export const EmailHeader = ({ title, subtitle }: EmailHeaderProps) => (
  <>
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="Helvetica"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
    <Section style={headerSection}>
      <Container style={headerContainer}>
        <div style={logoSection}>
          <Img
            src="https://cdn.jsdelivr.net/gh/user-attachments/assets/4ca477a6-e9f1-4afd-bf78-6c3f91a0e52c"
            alt="Logo"
            width="40"
            height="40"
            style={logoStyle}
          />
          <Text style={brandName}>FleetPro</Text>
        </div>
        
        <div style={gradientLine}></div>
        
        <div style={titleSection}>
          <Text style={mainTitle}>{title}</Text>
          {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
        </div>
      </Container>
    </Section>
  </>
);

const headerSection = {
  background: '#002652',
  padding: '40px 20px',
  borderRadius: '12px 12px 0 0',
};

const headerContainer = {
  maxWidth: '580px',
  margin: '0 auto',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
};

const logoStyle = {
  filter: 'brightness(0) invert(1)',
};

const brandName = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const gradientLine = {
  height: '3px',
  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
  margin: '20px 0',
  borderRadius: '2px',
};

const titleSection = {
  textAlign: 'center' as const,
};

const mainTitle = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0 0 8px 0',
  lineHeight: '1.2',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const subtitleStyle = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '16px',
  fontWeight: '400',
  margin: '0',
  lineHeight: '1.4',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};