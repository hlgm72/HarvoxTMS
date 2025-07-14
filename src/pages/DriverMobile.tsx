import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DriverTrackingInterface } from '@/components/mobile/DriverTrackingInterface';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const DriverMobile = () => {
  const { user, userRoles } = useAuth();
  const isMobile = useIsMobile();
  
  // Check if user is a driver
  const isDriver = userRoles?.some(role => role.role === 'driver');
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isDriver) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="driver-mobile-app">
      <DriverTrackingInterface />
    </div>
  );
};

export default DriverMobile;