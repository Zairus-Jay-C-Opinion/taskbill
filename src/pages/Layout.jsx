import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/tasks", label: "Tasks" },
  { to: "/invoices", label: "Invoices" },
];

export default function Layout() {
  const { profile, user, signOut } = useAuth();
  const displayName = profile?.username || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="flex items-center justify-between border-b border-[#E5E4E0] bg-white px-6 py-5">
        <div className="flex items-center gap-8">
          <img src="/logo.png" alt="TaskBill" className="h-16 w-auto" />
          <nav className="flex gap-6">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive
                      ? "font-semibold text-[#0D0D0D]"
                      : "text-[#6B6B6B] hover:text-[#0D0D0D]"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {displayName && (
            <span className="text-sm text-[#6B6B6B]">{displayName}</span>
          )}
          <button
            onClick={signOut}
            className="rounded-xl border border-[#E5E4E0] px-4 py-1.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors"
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
