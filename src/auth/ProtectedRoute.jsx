import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading || profile === undefined) return null;
  if (!session) return <Navigate to="/login" replace />;

  return children;
}
