import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  getOrCreateWorkspace, getWorkspaceMembers, inviteMember,
  removeMember, leaveWorkspace, setMemberRole,
  getChatMessages, sendChatMessage, uploadChatFile,
} from "../lib/db";
import { supabase } from "../lib/supabaseClient";
import { Skeleton } from "../components/Skeleton";
import Avatar from "../components/Avatar";

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnSubtleRed = "rounded-lg border border-red-100 bg-white px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors";
const btnSubtle = "rounded-lg border border-[#E5E4E0] bg-white px-3 py-1 text-xs font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] disabled:opacity-40 transition-colors";

const EMOJIS = [
  "😀","😂","😊","😍","🥰","😎","🤔","😅","🙂","😢",
  "😭","😤","🤣","😆","😋","🥺","😴","🤩","😏","😬",
  "👍","👎","👏","🙌","🤝","👋","🤞","✌️","💪","🎉",
  "❤️","🧡","💛","💚","💙","💜","🖤","💯","💕","🔥",
  "✅","❌","⚠️","📝","💡","🎯","🚀","⭐","💻","📱",
  "🌟","☀️","🌙","🌈","🌸","🍀","⚡","🎊","🏆","👀",
];

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100 break-all">{part}</a>
      : part
  );
}

export default function Team() {
  const { profile, user, workspace, workspaceRole, workspaceMemberId, refreshWorkspace } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [togglingRoleId, setTogglingRoleId] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  // ── Chat state ──
  const [messages, setMessages]       = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput]     = useState("");
  const [sending, setSending]         = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [attachment, setAttachment]   = useState(null); // { url, name, type, previewUrl }
  const [uploading, setUploading]     = useState(false);
  const messagesEndRef                = useRef(null);
  const loadMessagesRef               = useRef(null);
  const fileInputRef                  = useRef(null);
  const chatInputRef                  = useRef(null);

  const isOwner = workspaceRole === "owner";
  const isAdmin = workspaceRole === "admin";
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (profile?.plan !== "business") return;
    if (workspaceRole && workspaceRole !== "owner") return;
    init();
  }, [profile]);

  useEffect(() => {
    if (!workspace) return;
    loadMembers();
  }, [workspace]);

  useEffect(() => {
    if (!workspace?.id) return;
    loadMessages();
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    const channel = supabase
      .channel(`chat-${workspace.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${workspace.id}` },
        () => { loadMessagesRef.current?.(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspace?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    function close(e) {
      if (!e.target.closest("[data-emoji-picker]")) setShowEmoji(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmoji]);

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
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    if (!workspace?.id) return;
    setChatLoading(true);
    try {
      const msgs = await getChatMessages(workspace.id);
      setMessages(msgs);
    } catch (e) {
      console.error("Chat load error:", e.message);
    } finally {
      setChatLoading(false);
    }
  }
  loadMessagesRef.current = loadMessages;

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

  async function handleLeave() {
    if (!workspaceMemberId) return;
    if (!confirm("Are you sure you want to leave this workspace?")) return;
    setLeaving(true);
    try {
      await leaveWorkspace(workspaceMemberId);
      await refreshWorkspace();
    } catch (e) {
      setError(e.message);
      setLeaving(false);
    }
  }

  async function handleToggleRole(member) {
    setTogglingRoleId(member.id);
    try {
      const newRole = member.role === "admin" ? "member" : "admin";
      await setMemberRole(member.id, newRole);
      await loadMembers();
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingRoleId(null);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadChatFile(file, workspace.id);
      const previewUrl = result.type === "image" ? URL.createObjectURL(file) : null;
      setAttachment({ ...result, previewUrl });
    } catch (e) {
      setError("File upload failed: " + e.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function insertEmoji(emoji) {
    const input = chatInputRef.current;
    if (!input) { setChatInput((p) => p + emoji); return; }
    const start = input.selectionStart ?? chatInput.length;
    const end   = input.selectionEnd   ?? chatInput.length;
    const next = chatInput.slice(0, start) + emoji + chatInput.slice(end);
    setChatInput(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!chatInput.trim() && !attachment) || !workspace?.id || !user?.id) return;
    setSending(true);
    try {
      await sendChatMessage(workspace.id, user.id, chatInput, attachment);
      setChatInput("");
      setAttachment(null);
      await loadMessages();
    } catch (e) {
      console.error("Send error:", e.message);
    } finally {
      setSending(false);
    }
  }

  if (profile?.plan !== "business" && !workspaceRole) return <Navigate to="/" replace />;

  const accepted = members.filter((m) => m.status === "accepted");
  const pending  = members.filter((m) => m.status === "pending");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">
        {isOwner ? "Business" : "Workspace"}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0D0D0D]">Team</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">
        {isOwner
          ? "Invite collaborators to share your clients, tasks, and invoices."
          : "Collaborate with your team on shared clients, tasks, and invoices."}
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
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#E5E4E0] bg-white px-6 py-4">
              <div>
                <p className="text-xs text-[#6B6B6B]">Workspace</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0D0D0D]">{workspace.name}</p>
              </div>
              {!isOwner && (
                <button onClick={handleLeave} disabled={leaving} className={btnSubtleRed}>
                  {leaving ? "Leaving…" : "Leave workspace"}
                </button>
              )}
            </div>
          )}

          {/* ── Members accordion ── */}
          <div className="mt-8">
            <button
              onClick={() => setMembersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#E5E4E0] bg-white px-5 py-4 text-left transition-colors hover:bg-[#F5F4F0]"
            >
              <span className="text-sm font-semibold text-[#0D0D0D]">Members · {1 + accepted.length}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-[#6B6B6B] transition-transform duration-200 ${membersOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {membersOpen && (
              <div className="mt-1 rounded-2xl border border-[#E5E4E0] bg-white divide-y divide-[#E5E4E0] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar url={isOwner ? profile?.avatar_url : null} name={workspace?.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-[#0D0D0D]">
                        {isOwner ? (profile?.username || user?.email) : workspace?.name}
                        {isOwner && <span className="ml-2 text-xs text-[#6B6B6B]">(you)</span>}
                      </p>
                      {isOwner && <p className="text-xs text-[#6B6B6B]">{user?.email}</p>}
                    </div>
                  </div>
                  <span className="rounded-full bg-[#0D0D0D] px-3 py-0.5 text-xs font-medium text-white">owner</span>
                </div>

                {accepted.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-[#6B6B6B]">No members yet. Invite someone below.</p>
                ) : (
                  accepted.map((m) => {
                    const isSelf = m.user_id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar url={m.avatar_url} name={m.username || m.invited_email} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#0D0D0D]">
                                {m.username || m.invited_email}
                                {isSelf && <span className="ml-1 text-xs text-[#6B6B6B]">(you)</span>}
                              </p>
                              {m.role === "admin" && (
                                <span className="rounded-full border border-[#E5E4E0] px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">admin</span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B6B6B]">{m.invited_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <button onClick={() => handleToggleRole(m)} disabled={togglingRoleId === m.id} className={btnSubtle}>
                              {togglingRoleId === m.id ? "…" : m.role === "admin" ? "Remove admin" : "Make admin"}
                            </button>
                          )}
                          {canManage && !isSelf && (
                            <button onClick={() => handleRemove(m.id)} disabled={removingId === m.id} className={btnSubtleRed}>
                              {removingId === m.id ? "Removing…" : "Remove"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
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
                      {canManage && (
                        <button onClick={() => handleRemove(m.id)} disabled={removingId === m.id} className={btnSubtleRed}>
                          {removingId === m.id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Invite form (owner + admin) ── */}
          {canManage && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Invite a member</p>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  id="invite-email" name="invite-email" type="email"
                  placeholder="colleague@email.com"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className={inputCls} required
                />
                <button type="submit" disabled={inviting} className={`${btnPrimary} shrink-0`}>
                  {inviting ? "Inviting…" : "Invite"}
                </button>
              </form>
              <p className="mt-2 text-xs text-[#6B6B6B]">They'll see a prompt to accept when they log in to TaskBill.</p>
            </div>
          )}

          {/* ── Team Chat ── */}
          {workspace && (
            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Team Chat</p>
              <div className="rounded-2xl border border-[#E5E4E0] bg-white overflow-hidden">

                {/* Message list */}
                <div className="h-80 overflow-y-auto p-4 space-y-3">
                  {chatLoading && messages.length === 0 ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-3/4" />
                      <Skeleton className="h-10 w-1/2" />
                      <Skeleton className="h-10 w-2/3" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-[#6B6B6B] text-center pt-10">No messages yet. Say hello to your team!</p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMine && <Avatar url={msg.avatar_url} name={msg.username || msg.sender_id} size="xs" />}
                          <div className={`max-w-[72%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                            {!isMine && (
                              <span className="text-xs font-semibold text-[#0D0D0D] px-1">{msg.username || "Unknown"}</span>
                            )}
                            <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isMine ? "bg-[#0D0D0D] text-white rounded-br-sm" : "bg-[#F5F4F0] text-[#0D0D0D] rounded-bl-sm"}`}>
                              {msg.content && <p>{linkify(msg.content)}</p>}
                              {msg.attachment_type === "image" && (
                                <img src={msg.attachment_url} alt={msg.attachment_name} className="mt-1.5 max-w-[220px] rounded-xl object-cover" />
                              )}
                              {msg.attachment_type === "file" && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                                  className={`mt-1.5 flex items-center gap-1.5 text-xs underline opacity-80 hover:opacity-100 ${isMine ? "text-white" : "text-[#0D0D0D]"}`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  {msg.attachment_name}
                                </a>
                              )}
                            </div>
                            <span className="text-xs text-[#6B6B6B] px-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-[#E5E4E0]" />

                {/* Attachment preview */}
                {attachment && (
                  <div className="flex items-center gap-2 px-3 pt-2">
                    {attachment.type === "image"
                      ? <img src={attachment.previewUrl} alt={attachment.name} className="h-12 w-12 rounded-lg object-cover border border-[#E5E4E0]" />
                      : (
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#F5F4F0] px-3 py-2 text-xs text-[#0D0D0D]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          {attachment.name}
                        </div>
                      )
                    }
                    <button onClick={() => setAttachment(null)} className="text-xs text-[#6B6B6B] hover:text-red-500 transition-colors">✕ Remove</button>
                  </div>
                )}

                {/* Input area */}
                <form onSubmit={handleSend} className="relative flex items-center gap-1 p-3">
                  {/* Emoji picker */}
                  <div className="relative" data-emoji-picker>
                    <button
                      type="button"
                      onClick={() => setShowEmoji((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#F5F4F0] transition-colors text-lg"
                      title="Emoji"
                    >
                      😊
                    </button>
                    {showEmoji && (
                      <div className="absolute bottom-12 left-0 z-20 w-72 rounded-2xl border border-[#E5E4E0] bg-white p-3 shadow-lg">
                        <div className="grid grid-cols-10 gap-1">
                          {EMOJIS.map((e) => (
                            <button
                              key={e} type="button"
                              onClick={() => { insertEmoji(e); setShowEmoji(false); }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-[#F5F4F0] transition-colors"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File attachment */}
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B6B6B] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40"
                    title="Attach file or image"
                  >
                    {uploading ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M12 3a9 9 0 019 9"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    )}
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="Message your team…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={sending}
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-[#E5E4E0] bg-[#F5F4F0] px-4 py-2 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!chatInput.trim() && !attachment)}
                    className={`${btnPrimary} shrink-0 px-4 py-2`}
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
