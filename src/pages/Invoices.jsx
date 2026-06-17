import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getClients, getInvoices, getTasks, createInvoice, updateTaskInvoice, updateInvoiceStatus, savePaymentLink, deleteInvoice, getInvoiceCountThisWeek } from "../lib/db";
import { useAuth } from "../auth/AuthProvider";
import { currencySymbol } from "../lib/currency";

const STATUS_STYLES = {
  draft: "bg-stone-100 text-stone-600",
  sent:  "bg-sky-100 text-sky-700",
  paid:  "bg-emerald-100 text-emerald-700",
};

const NEXT_STATUS = { draft: "sent" }; // sent → paid is webhook-only

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnGhost = "rounded-xl border border-[#E5E4E0] px-5 py-2.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors";

export default function Invoices() {
  const { profile } = useAuth();
  const sym = currencySymbol(profile?.currency);

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [unbilledTasks, setUnbilledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ clientId: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [advancingId, setAdvancingId] = useState(null);

  const [assigningTo, setAssigningTo] = useState(null);
  const [selected, setSelected] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sort, setSort] = useState("latest");
  const [searchClient, setSearchClient] = useState("");
  const [draftingId, setDraftingId] = useState(null);
  const [copiedDraftId, setCopiedDraftId] = useState(null);
  const [collapsedDrafts, setCollapsedDrafts] = useState(new Set());

  const draftsKey = `taskbill-ai-drafts-${profile?.id}`;
  const [aiDrafts, setAiDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(draftsKey) || "{}"); } catch { return {}; }
  });

  // Keep a stable ref to load() so the Realtime callback never goes stale
  const loadRef = useRef(null);

  async function load() {
    setError("");
    try {
      const [inv, cli, tasks] = await Promise.all([getInvoices(), getClients(), getTasks()]);
      setInvoices(inv);
      setClients(cli);
      setUnbilledTasks(tasks);
      if (cli.length > 0 && !form.clientId) {
        setForm((f) => ({ ...f, clientId: cli[0].id }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = load;

  useEffect(() => {
    load();

    // Realtime — auto-refreshes when webhook marks invoice as paid
    const channel = supabase
      .channel("invoice-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices" }, () => {
        loadRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Persist AI drafts to localStorage so they survive page refreshes
  useEffect(() => {
    if (profile?.id) localStorage.setItem(draftsKey, JSON.stringify(aiDrafts));
  }, [aiDrafts, draftsKey, profile?.id]);

  // Polling fallback — every 5 s while any invoice is "sent", in case Realtime isn't enabled yet
  useEffect(() => {
    const hasSent = invoices.some((inv) => inv.status === "sent");
    if (!hasSent) return;
    const id = setInterval(() => { loadRef.current(); }, 5000);
    return () => clearInterval(id);
  }, [invoices]);

  async function handleCreate(e) {
    e.preventDefault();
    const hasUnbilled = unbilledTasks.some((t) => t.client_id === form.clientId);
    if (!hasUnbilled) {
      const clientName = clients.find((c) => c.id === form.clientId)?.name ?? "this client";
      setError(`No new unbilled tasks for ${clientName}. Add new tasks before creating an invoice.`);
      return;
    }
    if (profile?.plan === "free") {
      const count = await getInvoiceCountThisWeek();
      if (count >= 5) {
        setError("Free plan is limited to 5 invoices per week. Upgrade to Pro for unlimited invoices.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      await createInvoice({ clientId: form.clientId, dueDate: form.dueDate });
      setForm((f) => ({ ...f, dueDate: "" }));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(invoiceId) {
    setSubmitting(true);
    setError("");
    try {
      await Promise.all(selected.map((taskId) => updateTaskInvoice(taskId, invoiceId)));
      setAssigningTo(null);
      setSelected([]);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvanceStatus(invoice) {
    const next = NEXT_STATUS[invoice.status];
    if (!next) return;

    if (next === "sent" && !(invoice.total > 0)) {
      setError("Assign at least one task before marking this invoice as sent.");
      return;
    }

    setError("");
    setAdvancingId(invoice.id);
    try {
      if (next === "sent") {
        const res = await fetch("/api/stripe/create-payment-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: invoice.id,
            amount: invoice.total,
            clientName: invoice.client?.name,
            description: `Invoice for ${invoice.client?.name}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Stripe error — check that STRIPE_SECRET_KEY is set in Vercel env vars");

        await updateInvoiceStatus(invoice.id, "sent");
        await savePaymentLink(invoice.id, {
          paymentLink: data.url,
          paymentLinkId: data.paymentLinkId,
        });
      } else {
        await updateInvoiceStatus(invoice.id, next);
      }

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdvancingId(null);
    }
  }

  async function handleCopyLink(invoiceId, url) {
    await navigator.clipboard.writeText(url);
    setCopiedId(invoiceId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(invoiceId) {
    setDeletingId(invoiceId);
    setError("");
    try {
      await deleteInvoice(invoiceId);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const clientTasksFor = (clientId) => unbilledTasks.filter((t) => t.client_id === clientId);

  async function handleQuickInvoice(clientId, tasks) {
    if (profile?.plan === "free") {
      const count = await getInvoiceCountThisWeek();
      if (count >= 5) {
        setError("Free plan is limited to 5 invoices per week. Upgrade to Pro for unlimited invoices.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const inv = await createInvoice({ clientId, dueDate: "" });
      await Promise.all(tasks.map((t) => updateTaskInvoice(t.id, inv.id)));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAiDraft(inv) {
    if (!(inv.total > 0)) {
      setError("Assign at least one task before drafting with AI.");
      return;
    }
    setDraftingId(inv.id);
    try {
      let paymentLink = inv.payment_link;

      // No payment link yet — generate one first then mark as sent
      if (!paymentLink) {
        const linkRes = await fetch("/api/stripe/create-payment-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: inv.id,
            amount: inv.total,
            clientName: inv.client?.name,
            description: `Invoice for ${inv.client?.name}`,
          }),
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok) throw new Error(linkData.error || "Failed to generate payment link");
        await updateInvoiceStatus(inv.id, "sent");
        await savePaymentLink(inv.id, { paymentLink: linkData.url, paymentLinkId: linkData.paymentLinkId });
        paymentLink = linkData.url;
        await load();
      }

      const res = await fetch("/api/ai/draft-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: inv.client?.name,
          tasks: inv.tasks,
          total: inv.total,
          currency: sym,
          paymentLink,
          username: profile?.username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI draft failed");
      setAiDrafts((prev) => ({ ...prev, [inv.id]: data.draft }));
    } catch (e) {
      setError(e.message);
    } finally {
      setDraftingId(null);
    }
  }

  const clientsWithDraft = new Set(
    invoices.filter((inv) => inv.status === "draft").map((inv) => inv.client_id)
  );
  // Only surface unbilled tasks for clients that have at least one paid invoice —
  // new tasks with no invoice history use the Create Invoice form instead
  const clientsWithPaid = new Set(
    invoices.filter((inv) => inv.status === "paid").map((inv) => inv.client_id)
  );
  const unbilledByClient = clients
    .map((c) => ({ client: c, tasks: clientTasksFor(c.id) }))
    .filter(({ client, tasks }) =>
      tasks.length > 0 &&
      !clientsWithDraft.has(client.id) &&
      clientsWithPaid.has(client.id)
    );

  // Top form only shows clients that don't already have a draft and aren't
  // in the amber quick-invoice section — prevents creating duplicate invoices
  const quickInvoiceClientIds = new Set(unbilledByClient.map(({ client }) => client.id));
  const clientsForNewInvoice = clients.filter(
    (c) => !clientsWithDraft.has(c.id) && !quickInvoiceClientIds.has(c.id)
  );

  const displayedInvoices = [...invoices]
    .filter((inv) => !searchClient || inv.client?.name?.toLowerCase().includes(searchClient.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case "oldest":    return new Date(a.created_at) - new Date(b.created_at);
        case "total-hi":  return b.total - a.total;
        case "total-lo":  return a.total - b.total;
        case "due-soon": {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        }
        case "due-late": {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date) - new Date(a.due_date);
        }
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Invoices</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Create invoices and assign unbilled tasks to them.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Create invoice ── */}
      {clientsForNewInvoice.length > 0 && (
        <form onSubmit={handleCreate} className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">New invoice</p>
          <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} className={inputCls}>
            {clientsForNewInvoice.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1.5">Due date (optional)</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
          </div>
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Creating…" : "Create invoice"}
          </button>
        </form>
      )}

      {/* ── Unbilled tasks — quick invoice ── */}
      {unbilledByClient.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Unbilled tasks</p>
          {unbilledByClient.map(({ client, tasks }) => (
            <div key={client.id} className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">{client.name}</p>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  {tasks.map((t) => t.title).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  {sym}{tasks.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)} total
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleQuickInvoice(client.id, tasks)}
                disabled={submitting}
                className="shrink-0 ml-4 rounded-xl bg-[#0D0D0D] px-4 py-2 text-xs font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                Create invoice
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter / sort ── */}
      <div className="mt-6 flex gap-3">
        <input
          placeholder="Search by client…"
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
          className="flex-1 rounded-xl border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] transition-colors"
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="total-hi">Total: High to Low</option>
          <option value="total-lo">Total: Low to High</option>
          <option value="due-soon">Due date: Soonest</option>
          <option value="due-late">Due date: Latest</option>
        </select>
      </div>

      {/* ── Invoice list ── */}
      <div className="mt-4 space-y-4">
        {loading && <p className="text-sm text-[#6B6B6B]">Loading…</p>}
        {!loading && displayedInvoices.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">{invoices.length === 0 ? "No invoices yet." : "No invoices match."}</p>
        )}
        {displayedInvoices.map((inv) => (
          <div key={inv.id} className="rounded-2xl border border-[#E5E4E0] bg-white overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">{inv.client?.name}</p>
                <p className="text-xs text-[#6B6B6B]">{inv.client?.email}</p>
                {inv.due_date && (
                  <p className="mt-1.5 text-xs text-[#6B6B6B]">Due {inv.due_date}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-lg font-bold text-[#0D0D0D]">{sym}{inv.total.toFixed(2)}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
            </div>

            <div className="border-t border-[#E5E4E0] px-6 py-4 bg-[#F5F4F0] space-y-3">
              {/* Task list */}
              {inv.tasks?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Tasks</p>
                  {inv.tasks.map((t) => (
                    <div key={t.id} className="flex justify-between text-xs text-[#0D0D0D]">
                      <span>
                        {t.title}
                        {t.due_date && <span className="ml-2 text-[#6B6B6B]">· due {t.due_date}</span>}
                      </span>
                      <span className="text-[#6B6B6B]">{sym}{Number(t.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 flex-wrap">
                {clientTasksFor(inv.client_id).length > 0 && inv.status === "draft" && (
                  <button onClick={() => { setAssigningTo(inv.id); setSelected([]); }}
                    className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors">
                    Assign tasks ({clientTasksFor(inv.client_id).length} unbilled)
                  </button>
                )}
                {inv.tasks?.length > 0 && profile?.plan !== "free" && (
                  <button type="button" onClick={() => handleAiDraft(inv)}
                    disabled={draftingId === inv.id}
                    className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors disabled:opacity-50">
                    {draftingId === inv.id ? "Drafting…" : "Draft with AI"}
                  </button>
                )}
                {NEXT_STATUS[inv.status] && (
                  <button onClick={() => handleAdvanceStatus(inv)}
                    disabled={advancingId === inv.id}
                    className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors disabled:opacity-50">
                    {advancingId === inv.id ? "Generating link…" : "Get payment link"}
                  </button>
                )}
                {/* TEMP: delete allowed on all statuses for cleanup */}
                <button onClick={() => handleDelete(inv.id)}
                  disabled={deletingId === inv.id}
                  className="text-xs text-red-400 hover:text-red-600 underline underline-offset-4 transition-colors disabled:opacity-50 ml-auto">
                  {deletingId === inv.id ? "Deleting…" : "Delete"}
                </button>
              </div>

              {/* AI draft result */}
              {aiDrafts[inv.id] && (
                <div className="rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">AI Draft</p>
                    <button type="button"
                      onClick={() => setCollapsedDrafts((prev) => {
                        const next = new Set(prev);
                        next.has(inv.id) ? next.delete(inv.id) : next.add(inv.id);
                        return next;
                      })}
                      className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors">
                      {collapsedDrafts.has(inv.id) ? "Show" : "Hide"}
                    </button>
                  </div>
                  {!collapsedDrafts.has(inv.id) && (
                    <>
                      <p className="text-xs text-[#0D0D0D] leading-relaxed whitespace-pre-wrap">{aiDrafts[inv.id]}</p>
                      <button type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiDrafts[inv.id]);
                          setCopiedDraftId(inv.id);
                          setTimeout(() => setCopiedDraftId(null), 2000);
                        }}
                        className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors">
                        {copiedDraftId === inv.id ? "Copied!" : "Copy"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Payment link — hidden once paid */}
              {inv.payment_link && inv.status !== "paid" && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B6B6B] truncate max-w-xs">{inv.payment_link}</span>
                  <button
                    onClick={() => handleCopyLink(inv.id, inv.payment_link)}
                    className="shrink-0 rounded-lg border border-[#E5E4E0] bg-white px-3 py-1 text-xs font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors"
                  >
                    {copiedId === inv.id ? "Copied!" : "Copy link"}
                  </button>
                </div>
              )}
            </div>

            {assigningTo === inv.id && (
              <div className="border-t border-[#E5E4E0] px-6 py-5 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Select tasks to add</p>
                {clientTasksFor(inv.client_id).map((t) => (
                  <label key={t.id} className="flex items-center gap-3 text-sm text-[#0D0D0D] cursor-pointer">
                    <input type="checkbox" checked={selected.includes(t.id)}
                      onChange={(e) => setSelected((s) => e.target.checked ? [...s, t.id] : s.filter((id) => id !== t.id))}
                      className="accent-[#0D0D0D]" />
                    {t.title} — {sym}{Number(t.amount).toFixed(2)}
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleAssign(inv.id)} disabled={selected.length === 0 || submitting} className={btnPrimary}>
                    Add {selected.length} task{selected.length !== 1 ? "s" : ""}
                  </button>
                  <button onClick={() => { setAssigningTo(null); setSelected([]); }} className={btnGhost}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
