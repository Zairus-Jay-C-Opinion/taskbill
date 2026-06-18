import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { upsertProfile, uploadAvatar, saveAvatar } from "../lib/db";
import Avatar from "../components/Avatar";

const PASSWORD_RULES = [
  { id: "length",  label: "At least 8 characters",  test: (p) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",    test: (p) => /[A-Z]/.test(p) },
  { id: "number",  label: "One number",              test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";

function Section({ title, children }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">{title}</p>
      <div className="rounded-2xl border border-[#E5E4E0] bg-white px-6 py-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // ── Avatar
  const avatarRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // ── Account
  const [username, setUsername] = useState(profile?.username || "");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState("");

  // ── Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setSavingAvatar(true);
    setAvatarError("");
    try {
      const url = await uploadAvatar(user.id, file);
      await saveAvatar(user.id, url);
      await refreshProfile();
    } catch (err) {
      setAvatarError(err.message);
      setAvatarPreview(profile?.avatar_url || null);
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setSavingAvatar(true);
    setAvatarError("");
    try {
      await saveAvatar(user.id, null);
      await refreshProfile();
      setAvatarPreview(null);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleSaveUsername(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setSavingUsername(true);
    setUsernameMsg("");
    try {
      await upsertProfile({ id: user.id, username: username.trim() });
      await refreshProfile();
      setUsernameMsg("Saved.");
    } catch (err) {
      setUsernameMsg(err.message);
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    const unmet = PASSWORD_RULES.filter((r) => !r.test(newPassword));
    if (unmet.length > 0) {
      setPasswordError(`New password must meet all requirements.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setSavingPassword(true);
    try {
      // Verify current password by re-authenticating
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) { setPasswordError("Current password is incorrect."); return; }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated.");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  const planLabel = { free: "Free", pro: "Pro", business: "Business" }[profile?.plan] ?? "None";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Settings</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0D0D0D]">Profile</h2>

      {/* ── Account ── */}
      <Section title="Account">
        {/* Avatar */}
        <div className="flex items-center gap-5 pb-2 border-b border-[#F5F4F0]">
          <div className="relative">
            <Avatar url={avatarPreview} name={profile?.username} size="lg" />
            {savingAvatar && (
              <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <span className="text-xs text-[#6B6B6B]">…</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              type="button"
              disabled={savingAvatar}
              onClick={() => avatarRef.current?.click()}
              className="rounded-lg border border-[#E5E4E0] bg-white px-3 py-1.5 text-xs font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] disabled:opacity-40 transition-colors">
              {avatarPreview ? "Change photo" : "Upload photo"}
            </button>
            {avatarPreview && (
              <button
                type="button"
                disabled={savingAvatar}
                onClick={handleRemoveAvatar}
                className="block rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                Remove photo
              </button>
            )}
            {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
            <p className="text-xs text-[#6B6B6B]">PNG or JPG. Max 2 MB.</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#6B6B6B] mb-1">Email</p>
          <p className="text-sm font-medium text-[#0D0D0D]">{user?.email}</p>
        </div>
        <form onSubmit={handleSaveUsername} className="space-y-3">
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">Display name</label>
            <input
              id="profile-username"
              name="profile-username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setUsernameMsg(""); }}
              placeholder="Your name"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={savingUsername || !username.trim()} className={btnPrimary}>
              {savingUsername ? "Saving…" : "Save name"}
            </button>
            {usernameMsg && (
              <p className={`text-sm ${usernameMsg === "Saved." ? "text-emerald-600" : "text-red-600"}`}>
                {usernameMsg}
              </p>
            )}
          </div>
        </form>
      </Section>

      {/* ── Plan ── */}
      <Section title="Plan">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0D0D0D]">{planLabel} plan</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              {profile?.plan === "business"
                ? "Full access to all features including Team and Analytics."
                : profile?.plan === "pro"
                ? "Unlimited tasks, invoices, and AI drafting."
                : profile?.plan === "free"
                ? "Up to 3 clients, 20 tasks/month, 5 invoices/week."
                : "No plan selected yet."}
            </p>
          </div>
          {profile?.plan !== "business" && (
            <a href="/#plans"
              className="shrink-0 rounded-xl border border-[#0D0D0D] px-4 py-2 text-sm font-semibold text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-colors">
              Upgrade
            </a>
          )}
        </div>
      </Section>

      {/* ── Security / change password ── */}
      <Section title="Security">
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">Current password</label>
            <div className="relative">
              <input
                id="current-password"
                name="current-password"
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputCls + " pr-10"}
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B] hover:text-[#0D0D0D]">
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">New password</label>
            <div className="relative">
              <input
                id="new-password"
                name="new-password"
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                className={inputCls + " pr-10"}
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B] hover:text-[#0D0D0D]">
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-emerald-600" : "text-[#6B6B6B]"}`}>
                      <span>{met ? "✓" : "·"}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">Confirm new password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={savingPassword} className={btnPrimary}>
              {savingPassword ? "Updating…" : "Update password"}
            </button>
            {passwordMsg && <p className="text-sm text-emerald-600">{passwordMsg}</p>}
          </div>
        </form>
      </Section>

      {/* ── Danger zone ── */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Danger zone</p>
        <div className="rounded-2xl border border-red-100 bg-white px-6 py-6">
          {!showDeleteZone ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">Delete account</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Permanently removes your account and all data. This cannot be undone.</p>
              </div>
              <button
                onClick={() => setShowDeleteZone(true)}
                className="shrink-0 ml-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                Delete account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-600">Are you absolutely sure?</p>
              <p className="text-xs text-[#6B6B6B]">
                All your clients, tasks, invoices, and workspace data will be permanently deleted.
                Type <span className="font-mono font-semibold text-[#0D0D0D]">DELETE</span> to confirm.
              </p>
              <input
                id="delete-confirm"
                name="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(""); }}
                placeholder="Type DELETE to confirm"
                className={inputCls}
              />
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
                  {deleting ? "Deleting…" : "Delete my account"}
                </button>
                <button
                  onClick={() => { setShowDeleteZone(false); setDeleteConfirm(""); setDeleteError(""); }}
                  className="rounded-xl border border-[#E5E4E0] px-5 py-2.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
