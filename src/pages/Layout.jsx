import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { saveCurrency, acceptInvite } from "../lib/db";
import { CURRENCIES, currencySymbol } from "../lib/currency";
import { supabase } from "../lib/supabaseClient";
import Avatar from "../components/Avatar";

const APP_NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/tasks", label: "Tasks" },
  { to: "/invoices", label: "Invoices" },
  { to: "/calendar", label: "Calendar" },
];

const INFO_NAV = [
  { href: "/#about", label: "About" },
  { href: "/#plans", label: "Pricing" },
];

export default function Layout() {
  const { profile, user, signOut, refreshProfile, pendingInvites, refreshWorkspace, workspace, workspaceRole, workspaceId } = useAuth();
  const displayName = profile?.username || user?.email?.split("@")[0] || "";
  const currentCurrency = profile?.currency ?? "PHP";
  const location = useLocation();

  const [acceptingId, setAcceptingId] = useState(null);
  const [noPlanInviteId, setNoPlanInviteId] = useState(null);
  const [chatUnread, setChatUnread] = useState(0);

  // Reset unread count when user visits /team
  useEffect(() => {
    if (location.pathname === "/team") setChatUnread(0);
  }, [location.pathname]);

  // Global chat Realtime listener for unread badge + browser notifications
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`layout-chat-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const isOwnMessage = payload.new?.sender_id === user?.id;
          if (isOwnMessage) return;
          if (location.pathname !== "/team") {
            setChatUnread((n) => n + 1);
            const notifEnabled = localStorage.getItem("taskbill_chat_notif") === "true";
            if (notifEnabled && Notification.permission === "granted") {
              new Notification("New team message", {
                body: payload.new?.content?.slice(0, 100) || "New attachment",
                icon: "/logo.png",
              });
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, user?.id]);

  async function handleAcceptInvite(inviteId) {
    if (!profile?.plan) {
      setNoPlanInviteId(inviteId);
      return;
    }
    setNoPlanInviteId(null);
    setAcceptingId(inviteId);
    try {
      await acceptInvite(inviteId);
      await refreshWorkspace();
    } catch {
      // silent — user can retry
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleCurrencyChange(e) {
    const currency = e.target.value;
    try {
      await saveCurrency(user.id, currency);
      await refreshProfile();
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
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
            {(profile?.plan === "business" || workspace) && (
              <NavLink to="/team"
                className={({ isActive }) =>
                  `relative text-sm transition-colors ${isActive ? "font-semibold text-[#0D0D0D]" : "text-[#6B6B6B] hover:text-[#0D0D0D]"}`
                }>
                Team
                {chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                )}
              </NavLink>
            )}
            {profile?.plan === "business" && workspaceRole === "owner" && (
              <>
                <NavLink to="/analytics"
                  className={({ isActive }) =>
                    `text-sm transition-colors ${isActive ? "font-semibold text-[#0D0D0D]" : "text-[#6B6B6B] hover:text-[#0D0D0D]"}`
                  }>
                  Analytics
                </NavLink>
                <NavLink to="/branding"
                  className={({ isActive }) =>
                    `text-sm transition-colors ${isActive ? "font-semibold text-[#0D0D0D]" : "text-[#6B6B6B] hover:text-[#0D0D0D]"}`
                  }>
                  Branding
                </NavLink>
              </>
            )}
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
            <NavLink to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${isActive ? "border-[#0D0D0D] bg-[#0D0D0D] text-white" : "border-[#E5E4E0] bg-white text-[#0D0D0D] hover:bg-[#F5F4F0]"}`
              }>
              <Avatar url={profile?.avatar_url} name={displayName} size="xs" />
              <span className="text-sm font-medium">{displayName}</span>
            </NavLink>
          )}
          <select
            value={currentCurrency}
            onChange={handleCurrencyChange}
            className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-1.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] transition-colors"
            title="Currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>
            ))}
          </select>
          <button
            onClick={signOut}
            className="rounded-xl border border-[#E5E4E0] px-4 py-1.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Pending invite banner ── */}
      {pendingInvites?.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 space-y-2">
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[#0D0D0D]">
                  <span className="font-semibold">{invite.ownerUsername || "Someone"}</span>
                  {" "}invited you to join{" "}
                  <span className="font-semibold">{invite.workspace?.name}</span>.
                </p>
                <button
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={acceptingId === invite.id}
                  className="shrink-0 rounded-lg bg-[#0D0D0D] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  {acceptingId === invite.id ? "Accepting…" : "Accept"}
                </button>
              </div>
              {noPlanInviteId === invite.id && (
                <p className="text-xs text-amber-800">
                  You need a plan before joining a workspace.{" "}
                  <a href="/#plans" className="font-semibold underline hover:opacity-80" onClick={() => setNoPlanInviteId(null)}>
                    Pick a plan →
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[#E5E4E0] bg-white px-6 py-6 text-center text-sm text-[#6B6B6B]">
        © {new Date().getFullYear()} TaskBill. All rights reserved.
      </footer>
    </div>
  );
}
