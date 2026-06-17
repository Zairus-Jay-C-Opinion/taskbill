import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import PlanGate from "./auth/PlanGate";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Invoices from "./pages/Invoices";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Home is always reachable — it shows the plan selection overlay if needed */}
        <Route index element={<Home />} />

        {/* Tasks and Invoices require a plan */}
        <Route path="tasks" element={<PlanGate><Tasks /></PlanGate>} />
        <Route path="invoices" element={<PlanGate><Invoices /></PlanGate>} />
      </Route>
    </Routes>
  );
}
