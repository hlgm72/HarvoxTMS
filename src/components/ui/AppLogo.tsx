import React from 'react';

interface AppLogoProps {
  className?: string;
  width?: number;
  height?: number;
  fill?: string;
  style?: React.CSSProperties;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  width = 120,
  height = 120,
  fill = 'currentColor',
  style
}) => {
  return (
    <img 
      src="/lovable-uploads/45f8eaed-03a2-459e-9bf1-4f9844e08105.png"
      alt="FleetNest Logo"
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
};

export default AppLogo;