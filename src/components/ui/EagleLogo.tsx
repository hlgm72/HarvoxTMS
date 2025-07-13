import React from 'react';

interface EagleLogoProps {
  className?: string;
  width?: number;
  height?: number;
  fill?: string;
  style?: React.CSSProperties;
}

export const EagleLogo: React.FC<EagleLogoProps> = ({
  className = '',
  width = 120,
  height = 120,
  fill = 'currentColor',
  style
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Eagle head and beak */}
      <path
        d="M95 35C98 32 102 30 105 35C107 38 105 42 102 44C100 46 95 48 90 50C85 52 80 54 75 56C70 58 65 60 60 62C58 63 56 64 54 65C52 66 50 67 48 68C46 69 44 70 42 71C40 72 38 73 36 74C34 75 32 76 30 77C28 78 26 79 24 80C22 81 20 82 18 83C16 84 14 85 12 86C10 87 8 88 6 89C4 90 2 91 0 92"
        fill={fill}
      />
      
      {/* Main eagle body/neck flowing curves */}
      <path
        d="M42 25C45 20 50 18 55 20C60 22 64 26 66 31C68 36 68 42 66 47C64 52 60 56 55 58C50 60 44 60 39 58C34 56 30 52 28 47C26 42 26 36 28 31C30 26 34 22 39 20C42 19 44 20 45 22C46 24 46 26 45 28C44 30 42 31 40 30C38 29 37 27 38 25C39 23 41 22 42 25Z"
        fill={fill}
      />
      
      {/* Eagle eye */}
      <circle cx="75" cy="40" r="3" fill="white" />
      
      {/* Upper wing/feather details */}
      <path
        d="M20 15C25 12 32 12 38 15C44 18 48 23 50 29C52 35 52 42 50 48C48 54 44 59 38 62C32 65 25 65 19 62C13 59 9 54 7 48C5 42 5 35 7 29C9 23 13 18 19 15C20 14 20 14 20 15Z"
        fill={fill}
      />
      
      {/* Lower flowing feathers */}
      <path
        d="M15 70C20 65 27 63 34 65C41 67 46 72 48 78C50 84 49 91 46 96C43 101 38 104 32 105C26 106 20 104 16 100C12 96 10 90 11 84C12 78 15 72 20 68C22 66 24 65 26 66C28 67 29 69 28 71C27 73 25 74 23 73C21 72 20 70 21 68C22 66 24 65 26 66"
        fill={fill}
      />
      
      {/* Side feather details */}
      <path
        d="M85 70C88 65 93 62 98 63C103 64 107 67 109 72C111 77 110 83 107 87C104 91 99 93 94 93C89 93 85 90 83 86C81 82 81 77 83 73C84 71 86 70 88 71C90 72 91 74 90 76C89 78 87 79 85 78C83 77 82 75 83 73"
        fill={fill}
      />
      
      {/* Bottom flowing curves */}
      <path
        d="M30 95C35 90 42 88 49 90C56 92 61 97 63 103C65 109 64 116 61 121C58 126 53 129 47 130C41 131 35 129 31 125C27 121 25 115 26 109C27 103 30 97 35 93"
        fill={fill}
      />
      
      <path
        d="M70 100C73 95 78 92 83 93C88 94 92 97 94 102C96 107 95 113 92 117C89 121 84 123 79 123C74 123 70 120 68 116C66 112 66 107 68 103"
        fill={fill}
      />
    </svg>
  );
};

export default EagleLogo;