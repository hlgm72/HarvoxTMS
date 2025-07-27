import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PaymentReportEmailProps {
  driverName: string;
  companyName: string;
  periodStart: string;
  periodEnd: string;
  grossEarnings: number;
  fuelExpenses: number;
  totalDeductions: number;
  otherIncome: number;
  netPayment: number;
  hasNegativeBalance: boolean;
  reportUrl?: string;
}

export const PaymentReportEmail = ({
  driverName,
  companyName,
  periodStart,
  periodEnd,
  grossEarnings,
  fuelExpenses,
  totalDeductions,
  otherIncome,
  netPayment,
  hasNegativeBalance,
  reportUrl,
}: PaymentReportEmailProps) => {
  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('es-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Html>
      <Head />
      <Preview>Tu reporte de pago está listo - {formatDate(periodStart)} al {formatDate(periodEnd)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Reporte de Pago</Heading>
            <Text style={companyText}>{companyName}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hola {driverName},</Text>
            <Text style={paragraph}>
              Tu reporte de pago para el período del <strong>{formatDate(periodStart)}</strong> al <strong>{formatDate(periodEnd)}</strong> está listo para revisar.
            </Text>

            {hasNegativeBalance && (
              <Section style={alertSection}>
                <Text style={alertText}>
                  ⚠️ <strong>Atención:</strong> Tu balance neto es negativo. Por favor, revisa los detalles a continuación.
                </Text>
              </Section>
            )}

            <Section style={summarySection}>
              <Heading as="h2" style={h2}>Resumen Financiero</Heading>
              
              <Row style={summaryRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Ingresos Brutos:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={positiveValue}>{formatCurrency(grossEarnings)}</Text>
                </Column>
              </Row>

              <Row style={summaryRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Otros Ingresos:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={positiveValue}>{formatCurrency(otherIncome)}</Text>
                </Column>
              </Row>

              <Row style={summaryRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Gastos de Combustible:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={negativeValue}>-{formatCurrency(fuelExpenses)}</Text>
                </Column>
              </Row>

              <Row style={summaryRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Otras Deducciones:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={negativeValue}>-{formatCurrency(totalDeductions)}</Text>
                </Column>
              </Row>

              <Hr style={separator} />

              <Row style={totalRow}>
                <Column style={labelColumn}>
                  <Text style={totalLabel}>PAGO NETO:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={netPayment >= 0 ? totalValuePositive : totalValueNegative}>
                    {netPayment >= 0 ? '' : '-'}{formatCurrency(netPayment)}
                  </Text>
                </Column>
              </Row>
            </Section>

            {reportUrl && (
              <Section style={actionSection}>
                <Link href={reportUrl} style={button}>
                  Ver Reporte Completo
                </Link>
              </Section>
            )}

            <Text style={paragraph}>
              Si tienes alguna pregunta sobre este reporte, no dudes en contactar a tu supervisor o al departamento de pagos.
            </Text>

            <Text style={footerText}>
              Este es un email automático. Por favor, no respondas a este correo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentReportEmail;

// Estilos
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  backgroundColor: '#1f2937',
  padding: '32px 48px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const companyText = {
  color: '#e5e7eb',
  fontSize: '16px',
  margin: '0',
};

const content = {
  padding: '48px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#4b5563',
  margin: '16px 0',
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  margin: '32px 0 16px',
};

const alertSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const alertText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
};

const summarySection = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const summaryRow = {
  margin: '8px 0',
};

const labelColumn = {
  width: '70%',
  verticalAlign: 'top' as const,
};

const valueColumn = {
  width: '30%',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const label = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const positiveValue = {
  fontSize: '14px',
  color: '#059669',
  fontWeight: '600',
  margin: '0',
};

const negativeValue = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '600',
  margin: '0',
};

const separator = {
  border: 'none',
  borderTop: '2px solid #e5e7eb',
  margin: '16px 0',
};

const totalRow = {
  margin: '16px 0 0',
};

const totalLabel = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
};

const totalValuePositive = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0',
};

const totalValueNegative = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#dc2626',
  margin: '0',
};

const actionSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.4',
  textAlign: 'center' as const,
  margin: '32px 0 0',
};