import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/tasks", label: "Tasks" },
  { to: "/invoices", label: "Invoices" },
];

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-slate-900">TaskBill</span>
          <nav className="flex gap-4">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
