import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getOrCreateWorkspace, getWorkspaceMembers, inviteMember, removeMember } from "../lib/db";
import { Skeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnSubtleRed = "rounded-lg border border-red-100 bg-white px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors";

export default function Team() {
  const { profile, user, workspace, workspaceRole, refreshWorkspace } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (profile?.plan !== "business") return;
    init();
  }, [profile]);

  useEffect(() => {
    if (!workspace) return;
    loadMembers();
  }, [workspace]);

  async function init() {
    setLoading(true);
    setError("");
    try {
      await getOrCreateWorkspace(user.id, profile?.username ? `${profile.username}'s workspace` : "My workspace");
      await refreshWorkspace();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const m = await getWorkspaceMembers(workspace.id);
      setMembers(m);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError("");
    try {
      await inviteMember(workspace.id, inviteEmail);
      setInviteEmail("");
      await loadMembers();
    } catch (e) {
      setError(e.message.includes("unique") ? "That email has already been invited." : e.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId) {
    setRemovingId(memberId);
    setError("");
    try {
      await removeMember(memberId);
      await loadMembers();
    } catch (e) {
      setError(e.message);
    } finally {
      setRemovingId(null);
    }
  }

  if (profile?.plan !== "business") return <Navigate to="/" replace />;

  const accepted = members.filter((m) => m.status === "accepted");
  const pending  = members.filter((m) => m.status === "pending");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Business</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0D0D0D]">Team</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">
        Invite collaborators to share your clients, tasks, and invoices.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Workspace info ── */}
          {workspace && (
            <div className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white px-6 py-4">
              <p className="text-xs text-[#6B6B6B]">Workspace</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0D0D0D]">{workspace.name}</p>
            </div>
          )}

          {/* ── Members accordion ── */}
          <div className="mt-8">
            <button
              onClick={() => setMembersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#E5E4E0] bg-white px-5 py-4 text-left transition-colors hover:bg-[#F5F4F0]"
            >
              <span className="text-sm font-semibold text-[#0D0D0D]">
                Members · {1 + accepted.length}
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-[#6B6B6B] transition-transform duration-200 ${membersOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {membersOpen && (
              <div className="mt-1 rounded-2xl border border-[#E5E4E0] bg-white divide-y divide-[#E5E4E0] overflow-hidden">
                {/* Owner row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar url={profile?.avatar_url} name={profile?.username || user?.email} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-[#0D0D0D]">
                        {profile?.username || user?.email}
                        <span className="ml-2 text-xs text-[#6B6B6B]">(you)</span>
                      </p>
                      <p className="text-xs text-[#6B6B6B]">{user?.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#0D0D0D] px-3 py-0.5 text-xs font-medium text-white">owner</span>
                </div>

                {accepted.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-[#6B6B6B]">No members yet. Invite someone below.</p>
                ) : (
                  accepted.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar url={m.avatar_url} name={m.username || m.invited_email} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#0D0D0D]">
                            {m.username || m.invited_email}
                          </p>
                          <p className="text-xs text-[#6B6B6B]">{m.invited_email}</p>
                        </div>
                      </div>
                      {workspaceRole === "owner" && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          disabled={removingId === m.id}
                          className={btnSubtleRed}>
                          {removingId === m.id ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Pending invites ── */}
          {pending.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Pending invites</p>
              <div className="space-y-2">
                {pending.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#E5E4E0] bg-white px-4 py-3">
                    <p className="text-sm text-[#0D0D0D]">{m.invited_email}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B6B6B]">pending</span>
                      {workspaceRole === "owner" && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          disabled={removingId === m.id}
                          className={btnSubtleRed}>
                          {removingId === m.id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Invite form ── */}
          {workspaceRole === "owner" && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Invite a member</p>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  id="invite-email"
                  name="invite-email"
                  type="email"
                  placeholder="colleague@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={inputCls}
                  required
                />
                <button type="submit" disabled={inviting} className={`${btnPrimary} shrink-0`}>
                  {inviting ? "Inviting…" : "Invite"}
                </button>
              </form>
              <p className="mt-2 text-xs text-[#6B6B6B]">
                They'll see a prompt to accept when they log in to TaskBill.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
