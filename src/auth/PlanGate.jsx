import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

// Redirects to Home (plan selection overlay) if the user hasn't chosen a plan yet.
// Only wraps /tasks and /invoices — Home itself must stay reachable so the overlay can show.
export default function PlanGate({ children }) {
  const { profile } = useAuth();

  if (profile && !profile.plan) return <Navigate to="/" replace />;

  return children;
}
