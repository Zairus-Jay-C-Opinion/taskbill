import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const APP_NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/tasks", label: "Tasks" },
  { to: "/invoices", label: "Invoices" },
];

const INFO_NAV = [
  { href: "/#about", label: "About" },
  { href: "/#plans", label: "Pricing" },
];

export default function Layout() {
  const { profile, user, signOut } = useAuth();
  const displayName = profile?.username || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="flex items-center justify-between border-b border-[#E5E4E0] bg-white px-6 py-5">
        <div className="flex items-center gap-8">
          <Link to="/"><img src="/logo.png" alt="TaskBill" className="h-10 w-auto" style={{ filter: "contrast(1.5) saturate(1.4)" }} /></Link>
          <nav className="flex items-center gap-6">
            {APP_NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `text-sm transition-colors ${isActive ? "font-semibold text-[#0D0D0D]" : "text-[#6B6B6B] hover:text-[#0D0D0D]"}`
                }>
                {label}
              </NavLink>
            ))}
            <span className="text-[#E5E4E0]">|</span>
            {INFO_NAV.map(({ href, label }) => (
              <Link key={href} to={href}
                className="text-sm text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors">
                {label}
              </Link>
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

      <footer className="border-t border-[#E5E4E0] bg-white px-6 py-6 text-center text-sm text-[#6B6B6B]">
        © {new Date().getFullYear()} TaskBill. All rights reserved.
      </footer>
    </div>
  );
}
