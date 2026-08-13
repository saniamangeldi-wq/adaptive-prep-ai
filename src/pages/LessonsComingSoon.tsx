import { Navigate } from "react-router-dom";

/**
 * Legacy placeholder route. Lessons are live, so this redirects instead of
 * showing a dead "coming soon" screen.
 */
export default function LessonsComingSoon() {
  return <Navigate to="/dashboard/lessons" replace />;
}
