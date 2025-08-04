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
      src="/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png"
      alt="FleetNest Logo"
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
};

export default AppLogo;