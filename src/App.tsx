import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PracticeTests from "./pages/PracticeTests";
import TakeTest from "./pages/TakeTest";
import TestResults from "./pages/TestResults";
import AICoach from "./pages/AICoach";
import Progress from "./pages/Progress";
import Flashcards from "./pages/Flashcards";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

// School admin pages
import CreateSchool from "./pages/school/CreateSchool";
import SchoolOverview from "./pages/school/SchoolOverview";
import SchoolTeachers from "./pages/school/SchoolTeachers";
import SchoolStudents from "./pages/school/SchoolStudents";
import SchoolAnalytics from "./pages/school/SchoolAnalytics";
import SchoolInvite from "./pages/school/SchoolInvite";
import SchoolBilling from "./pages/school/SchoolBilling";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      
      {/* Protected routes */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/tests" element={<ProtectedRoute><PracticeTests /></ProtectedRoute>} />
      <Route path="/dashboard/tests/:testId" element={<ProtectedRoute><TakeTest /></ProtectedRoute>} />
      <Route path="/dashboard/tests/:testId/results" element={<ProtectedRoute><TestResults /></ProtectedRoute>} />
      <Route path="/dashboard/coach" element={<ProtectedRoute><AICoach /></ProtectedRoute>} />
      <Route path="/dashboard/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/dashboard/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* School admin routes */}
      <Route path="/dashboard/school" element={<ProtectedRoute><SchoolOverview /></ProtectedRoute>} />
      <Route path="/dashboard/school/create" element={<ProtectedRoute><CreateSchool /></ProtectedRoute>} />
      <Route path="/dashboard/school/teachers" element={<ProtectedRoute><SchoolTeachers /></ProtectedRoute>} />
      <Route path="/dashboard/school/students" element={<ProtectedRoute><SchoolStudents /></ProtectedRoute>} />
      <Route path="/dashboard/school/analytics" element={<ProtectedRoute><SchoolAnalytics /></ProtectedRoute>} />
      <Route path="/dashboard/school/invite" element={<ProtectedRoute><SchoolInvite /></ProtectedRoute>} />
      <Route path="/dashboard/school/billing" element={<ProtectedRoute><SchoolBilling /></ProtectedRoute>} />
      
      {/* Tutor/Teacher routes - redirect to appropriate pages */}
      <Route path="/dashboard/students" element={<ProtectedRoute><SchoolStudents /></ProtectedRoute>} />
      <Route path="/dashboard/students/add" element={<ProtectedRoute><SchoolInvite /></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><SchoolAnalytics /></ProtectedRoute>} />
      <Route path="/dashboard/classroom" element={<ProtectedRoute><SchoolStudents /></ProtectedRoute>} />
      <Route path="/dashboard/classroom/add" element={<ProtectedRoute><SchoolInvite /></ProtectedRoute>} />
      <Route path="/dashboard/classroom/assign" element={<ProtectedRoute><PracticeTests /></ProtectedRoute>} />
      <Route path="/dashboard/assignments" element={<ProtectedRoute><PracticeTests /></ProtectedRoute>} />
      <Route path="/dashboard/schedule" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/resources" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
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

export default App;
