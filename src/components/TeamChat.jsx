import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getChatMessages, sendChatMessage, uploadChatFile } from "../lib/db";
import { supabase } from "../lib/supabaseClient";
import { Skeleton } from "./Skeleton";
import Avatar from "./Avatar";

const EMOJIS = [
  "😀","😂","😊","😍","🥰","😎","🤔","😅","🙂","😢",
  "😭","😤","🤣","😆","😋","🥺","😴","🤩","😏","😬",
  "👍","👎","👏","🙌","🤝","👋","🤞","✌️","💪","🎉",
  "❤️","🧡","💛","💚","💙","💜","🖤","💯","💕","🔥",
  "✅","❌","⚠️","📝","💡","🎯","🚀","⭐","💻","📱",
  "🌟","☀️","🌙","🌈","🌸","🍀","⚡","🎊","🏆","👀",
];

const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100 break-all">{part}</a>
      : part
  );
}

export default function TeamChat({ workspaceId }) {
  const { user } = useAuth();

  const [messages, setMessages]     = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatInput, setChatInput]   = useState("");
  const [sending, setSending]       = useState(false);
  const [showEmoji, setShowEmoji]   = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [chatError, setChatError]   = useState("");

  const messagesEndRef = useRef(null);
  const loadMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [workspaceId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${workspaceId}` },
        () => { loadMessagesRef.current?.(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showEmoji) return;
    function close(e) {
      if (!e.target.closest("[data-emoji-picker]")) setShowEmoji(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmoji]);

  async function loadMessages() {
    setChatLoading(true);
    try {
      const msgs = await getChatMessages(workspaceId);
      setMessages(msgs);
    } catch (e) {
      console.error("Chat load error:", e.message);
    } finally {
      setChatLoading(false);
    }
  }
  loadMessagesRef.current = loadMessages;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setChatError("");
    try {
      const result = await uploadChatFile(file, workspaceId);
      const previewUrl = result.type === "image" ? URL.createObjectURL(file) : null;
      setAttachment({ ...result, previewUrl });
    } catch (e) {
      setChatError("Upload failed: " + e.message);
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
    if ((!chatInput.trim() && !attachment) || !user?.id) return;
    setSending(true);
    try {
      await sendChatMessage(workspaceId, user.id, chatInput, attachment);
      setChatInput("");
      setAttachment(null);
      await loadMessages();
    } catch (e) {
      console.error("Send error:", e.message);
    } finally {
      setSending(false);
    }
  }

  return (
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

        {chatError && (
          <p className="px-3 pt-2 text-xs text-red-500">{chatError}</p>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="relative flex items-center gap-1 p-3">
          {/* Emoji */}
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

          {/* File */}
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
  );
}
