import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIeltsAccess } from "@/hooks/useIeltsAccess";

/**
 * Renders children only for accounts (or schools) with IELTS switched on.
 * Everyone else gets the 404 route, so the feature stays undiscoverable.
 */
export function IeltsGate({ children }: { children: ReactNode }) {
  const { loading, hasAccess } = useIeltsAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) return <Navigate to="/404" replace />;

  return <>{children}</>;
}

export default IeltsGate;
