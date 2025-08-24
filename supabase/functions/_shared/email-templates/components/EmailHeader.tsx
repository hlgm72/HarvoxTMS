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
  title?: string;
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
            src="https://htaotttcnjxqzpsrqwll.supabase.co/storage/v1/object/public/fleetnest/logo_64x64.png"
            alt="FleetNest TMS Logo"
            width="40"
            height="40"
            style={logoStyle}
          />
          <Text style={brandName}>FleetNest TMS</Text>
        </div>
        
        <div style={gradientLine}></div>
      </Container>
    </Section>
  </>
);

const headerSection = {
  background: '#002652',
  padding: '30px 20px',
  borderRadius: '12px 12px 0 0',
};

const headerContainer = {
  maxWidth: '580px',
  margin: '0 auto',
  textAlign: 'center' as const,
  width: '100%',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
  width: '100%',
};

const logoStyle = {
  filter: 'brightness(0) invert(1)',
  display: 'block',
  margin: '0 auto 12px auto',
};

const brandName = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  textAlign: 'center' as const,
  display: 'block',
};

const gradientLine = {
  height: '3px',
  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
  margin: '20px 0',
  borderRadius: '2px',
};