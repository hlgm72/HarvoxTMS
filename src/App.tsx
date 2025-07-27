import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Setup from "./pages/Setup";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NoAccess from "./pages/NoAccess";
import InvitationCallback from "./pages/InvitationCallback";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Companies from "./pages/Companies";
import PaymentSystem from "./pages/PaymentSystem";
import Equipment from "./pages/Equipment";
import Invitation from "./pages/Invitation";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import OperationsManagerDashboard from "./pages/dashboard/OperationsManagerDashboard";
import DispatcherDashboard from "./pages/dashboard/DispatcherDashboard";
import DriverDashboard from "./pages/dashboard/DriverDashboard";
import Landing from "./pages/Landing";
import Drivers from "./pages/Drivers";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Documents from "./pages/Documents";
import Payments from "./pages/Payments";
import Deductions from "./pages/Deductions";
import FuelManagement from "./pages/FuelManagement";
import Loads from "./pages/Loads";
import EagleDemo from "./pages/EagleDemo";
import DriverMobile from "./pages/DriverMobile";
import PaymentReports from "./pages/PaymentReports";
import Preview from "./pages/Preview";

import IconsPreview from "./pages/IconsPreview";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { NotificationProvider } from "./components/notifications";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useLanguageSync } from "./hooks/useLanguageSync";
import './i18n/config';

const queryClient = new QueryClient();

function AppContent() {
  // Sincronizar idioma del perfil con i18n
  useLanguageSync();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/no-access" element={<NoAccess />} />
        <Route path="/invitation/:token" element={<Invitation />} />
        <Route path="/invitation/callback" element={<InvitationCallback />} />
        <Route path="/demo" element={<EagleDemo />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        
        {/* Home route - shows landing for unauthenticated, redirects authenticated users */}
        <Route path="/" element={<Index />} />
        
        {/* Protected dashboard route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Index />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/setup" 
          element={
            <ProtectedRoute>
              <Setup />
            </ProtectedRoute>
          } 
        />
        
        {/* Dashboard routes by role */}
        <Route 
          path="/dashboard/owner" 
          element={
            <ProtectedRoute requiredRole="company_owner">
              <Layout>
                <OwnerDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/operations" 
          element={
            <ProtectedRoute requiredRole="operations_manager">
              <Layout>
                <OperationsManagerDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/dispatch" 
          element={
            <ProtectedRoute requiredRole="dispatcher">
              <Layout>
                <DispatcherDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/driver" 
          element={
            <ProtectedRoute requiredRole="driver">
              <Layout>
                <DriverDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Mobile driver interface */}
        <Route 
          path="/mobile/driver" 
          element={
            <ProtectedRoute requiredRole="driver">
              <DriverMobile />
            </ProtectedRoute>
          } 
        />
        
        {/* SuperAdmin routes */}
        <Route 
          path="/superadmin" 
          element={
            <ProtectedRoute requiredRole="superadmin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/companies" 
          element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <Companies />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Profile route - available to all authenticated users */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Other protected routes */}
        <Route 
          path="/drivers" 
          element={
            <ProtectedRoute>
              <Layout>
                <Drivers />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/loads" 
          element={
            <ProtectedRoute>
              <Layout>
                <Loads />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/clients" 
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/equipment" 
          element={
            <ProtectedRoute>
              <Layout>
                <Equipment />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/billing" 
          element={
            <ProtectedRoute>
              <Layout>
                <div>Billing page coming soon</div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payments" 
          element={
            <ProtectedRoute>
              <Layout>
                <Payments />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Deductions Management */}
        <Route 
          path="/deductions" 
          element={
            <ProtectedRoute requiredRole="company_owner">
              <Layout>
                <Deductions />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Fuel Management */}
        <Route 
          path="/fuel-management" 
          element={
            <ProtectedRoute>
              <Layout>
                <FuelManagement />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Layout>
                <div>Reports page coming soon</div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents" 
          element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment-system" 
          element={
            <ProtectedRoute>
              <Layout>
                <PaymentSystem />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/payment-reports" 
          element={
            <ProtectedRoute>
              <Layout>
                <PaymentReports />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route
          path="/users" 
          element={
            <ProtectedRoute requiredRole="company_owner">
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute requiredRole="company_owner">
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Temporary Icons Preview */}
        <Route 
          path="/icons-preview" 
          element={
            <ProtectedRoute>
              <IconsPreview />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProfileProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </UserProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
