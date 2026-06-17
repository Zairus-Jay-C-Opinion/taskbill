import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading || profile === undefined) return null;
  if (!session) return <Navigate to="/login" replace />;
  // Profile loaded but no plan selected yet → Home shows the plan selection overlay
  if (profile && !profile.plan) return <Navigate to="/" replace />;

  return children;
}
