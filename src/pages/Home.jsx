import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { upsertProfile } from "../lib/db";

export default function Home() {
  const { user, profile, loading, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptError, setPromptError] = useState("");

  // profile === undefined means still fetching — don't flash anything
  if (loading || profile === undefined) return null;

  const needsUsername = !profile?.username;

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

  if (needsUsername) {
    return (
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
    );
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-73px)] items-center justify-center"
      style={{
        backgroundImage: "url('https://i.pinimg.com/736x/a7/51/99/a751991b13838b80e6b9e59c7f815636.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay so text stays legible over the bright photo */}
      <div className="absolute inset-0 bg-white/60" />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        <p className="text-sm font-medium tracking-widest uppercase text-[#6B6B6B]">
          Good to see you, {profile.username}.
        </p>
        <h1 className="mt-4 text-6xl font-bold tracking-tight text-[#0D0D0D] leading-tight">
          Your work, tracked.<br />Your clients, billed.
        </h1>
        <p className="mt-5 text-lg text-[#6B6B6B]">
          Manage tasks, generate invoices, and get paid — all in one place.
        </p>
      </div>
    </div>
  );
}
