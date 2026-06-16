import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/**
 * Wraps routes that require a signed-in user. While the initial session
 * check is running we render nothing (avoids a login-page flash); once
 * resolved, no session means redirect to /login.
 */
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return children;
}
