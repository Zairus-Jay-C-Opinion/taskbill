import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
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
        <Route index element={<Home />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="invoices" element={<Invoices />} />
      </Route>
    </Routes>
  );
}
