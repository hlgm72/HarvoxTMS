import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Setup from "./pages/Setup";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Companies from "./pages/Companies";
import PaymentSystem from "./pages/PaymentSystem";
import Invitation from "./pages/Invitation";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import OperationsManagerDashboard from "./pages/dashboard/OperationsManagerDashboard";
import DispatcherDashboard from "./pages/dashboard/DispatcherDashboard";
import DriverDashboard from "./pages/dashboard/DriverDashboard";
import Landing from "./pages/Landing";
import Drivers from "./pages/Drivers";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import EagleDemo from "./pages/EagleDemo";

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
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/invitation/:token" element={<Invitation />} />
        <Route path="/demo" element={<EagleDemo />} />
        
        {/* Protected routes with Layout */}
        <Route 
          path="/" 
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
                <div>Loads page coming soon</div>
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
                <div>Equipment page coming soon</div>
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
                <div>Documents page coming soon</div>
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
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserProfileProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </NotificationProvider>
      </UserProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
