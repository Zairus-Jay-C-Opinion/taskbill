import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { upsertProfile, getTasks, getInvoices } from "../lib/db";

export default function Home() {
  const { user, profile, refreshProfile } = useAuth();

  // Username prompt
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptError, setPromptError] = useState("");

  // Stats
  const [stats, setStats] = useState({ unbilled: 0, drafts: 0, totalBilled: 0 });

  const needsUsername = profile !== null && !profile?.username;

  useEffect(() => {
    if (profile?.username) loadStats();
  }, [profile]);

  async function loadStats() {
    try {
      const [tasks, invoices] = await Promise.all([getTasks(), getInvoices()]);
      const totalBilled = invoices
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + i.total, 0);
      setStats({
        unbilled: tasks.length,
        drafts: invoices.filter((i) => i.status === "draft").length,
        totalBilled,
      });
    } catch {}
  }

  async function handleSaveUsername(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    setPromptError("");
    try {
      await upsertProfile({ id: user.id, username: username.trim() });
      await refreshProfile();
    } catch (err) {
      setPromptError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#F5F4F0]">
      {/* ── Username prompt modal ── */}
      {needsUsername && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F4F0]">
          <div className="w-full max-w-sm px-6">
            <h1 className="text-3xl font-bold tracking-tight text-[#0D0D0D]">
              Welcome to TaskBill
            </h1>
            <p className="mt-2 text-[#6B6B6B]">What should we call you?</p>

            <form onSubmit={handleSaveUsername} className="mt-6 space-y-3">
              <input
                required
                autoFocus
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B]"
              />
              {promptError && <p className="text-sm text-red-600">{promptError}</p>}
              <button
                type="submit"
                disabled={saving || !username.trim()}
                className="w-full rounded-xl bg-[#0D0D0D] py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {saving ? "Saving…" : "Get started"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      {!needsUsername && (
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-sm font-medium text-[#6B6B6B]">
            Good to see you, {profile?.username}.
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-[#0D0D0D] leading-tight">
            Your work, tracked.<br />Your clients, billed.
          </h1>
          <p className="mt-4 text-lg text-[#6B6B6B]">
            Manage tasks, generate invoices, and get paid — all in one place.
          </p>

          {/* ── Stat cards ── */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            <StatCard label="Unbilled tasks" value={stats.unbilled} />
            <StatCard label="Draft invoices" value={stats.drafts} />
            <StatCard label="Total billed" value={`₱${stats.totalBilled.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#E5E4E0] bg-white px-5 py-5">
      <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-widest">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0D0D0D]">{value}</p>
    </div>
  );
}
