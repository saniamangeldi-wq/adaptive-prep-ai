import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import AICoach from "./pages/AICoach";
import Settings from "./pages/Settings";
import PricingPage from "./pages/PricingPage";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import WritingHome from "./pages/writing/WritingHome";
import WritingEditor from "./pages/writing/WritingEditor";
import WritingReport from "./pages/writing/WritingReport";
import WritingHistory from "./pages/writing/WritingHistory";

const queryClient = new QueryClient();

function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center dark">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// Signed-in routes: the only check is that a user session exists.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// Public routes that send signed-in users to the dashboard.
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />

      {/* Signed in */}
      <Route path="/dashboard" element={<ProtectedRoute><AICoach /></ProtectedRoute>} />
      <Route path="/dashboard/coach" element={<ProtectedRoute><AICoach /></ProtectedRoute>} />
      <Route path="/dashboard/writing" element={<ProtectedRoute><WritingHome /></ProtectedRoute>} />
      <Route path="/dashboard/writing/session/:sessionId" element={<ProtectedRoute><WritingEditor /></ProtectedRoute>} />
      <Route path="/dashboard/writing/report/:reportId" element={<ProtectedRoute><WritingReport /></ProtectedRoute>} />
      <Route path="/dashboard/history" element={<ProtectedRoute><WritingHistory /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
