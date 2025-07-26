import * as React from 'npm:react@18.3.1';
import { Button } from 'npm:@react-email/components@0.0.22';

interface EmailButtonProps {
  href: string;
  text: string;
  variant?: 'primary' | 'secondary';
}

export const EmailButton = ({ href, text, variant = 'primary' }: EmailButtonProps) => (
  <Button
    href={href}
    style={variant === 'primary' ? primaryButtonStyle : secondaryButtonStyle}
  >
    {text}
  </Button>
);

const primaryButtonStyle = {
  background: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  margin: '16px 0',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.2s ease',
};

const secondaryButtonStyle = {
  background: 'transparent',
  borderRadius: '8px',
  color: '#667eea',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  margin: '16px 0',
  border: '2px solid #667eea',
  cursor: 'pointer',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  transition: 'all 0.2s ease',
};