import { useEffect, useState } from "react";
import { getClients, getInvoices, getTasks, createInvoice, updateTaskInvoice, updateInvoiceStatus, savePaymentLink, deleteInvoice } from "../lib/db";

const STATUS_STYLES = {
  draft: "bg-stone-100 text-stone-600",
  sent:  "bg-sky-100 text-sky-700",
  paid:  "bg-emerald-100 text-emerald-700",
};

const NEXT_STATUS = { draft: "sent", sent: "paid" };

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnGhost = "rounded-xl border border-[#E5E4E0] px-5 py-2.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [unbilledTasks, setUnbilledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ clientId: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [advancingId, setAdvancingId] = useState(null); // tracks which invoice is being advanced

  const [assigningTo, setAssigningTo] = useState(null);
  const [selected, setSelected] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
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

  async function handleCreate(e) {
    e.preventDefault();
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
        // Generate payment link FIRST — only update status if Stripe succeeds
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Invoices</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Create invoices and assign unbilled tasks to them.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Create invoice ── */}
      {clients.length > 0 && (
        <form onSubmit={handleCreate} className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">New invoice</p>
          <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} className={inputCls}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* ── Invoice list ── */}
      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-[#6B6B6B]">Loading…</p>}
        {!loading && invoices.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">No invoices yet.</p>
        )}
        {invoices.map((inv) => (
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
                <span className="text-lg font-bold text-[#0D0D0D]">₱{inv.total.toFixed(2)}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
            </div>

            <div className="border-t border-[#E5E4E0] px-6 py-4 bg-[#F5F4F0] space-y-3">
              {/* Task list — history for sent/paid, live for draft */}
              {inv.tasks?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Tasks</p>
                  {inv.tasks.map((t) => (
                    <div key={t.id} className="flex justify-between text-xs text-[#0D0D0D]">
                      <span>{t.title}</span>
                      <span className="text-[#6B6B6B]">₱{Number(t.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                {clientTasksFor(inv.client_id).length > 0 && inv.status === "draft" && (
                  <button onClick={() => { setAssigningTo(inv.id); setSelected([]); }}
                    className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors">
                    Assign tasks ({clientTasksFor(inv.client_id).length} unbilled)
                  </button>
                )}
                {NEXT_STATUS[inv.status] && (
                  <button onClick={() => handleAdvanceStatus(inv)}
                    disabled={advancingId === inv.id}
                    className="text-xs text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors disabled:opacity-50">
                    {advancingId === inv.id ? "Generating link…" : `Mark as ${NEXT_STATUS[inv.status]}`}
                  </button>
                )}
                {inv.status === "draft" && (
                  <button onClick={() => handleDelete(inv.id)}
                    disabled={deletingId === inv.id}
                    className="text-xs text-red-400 hover:text-red-600 underline underline-offset-4 transition-colors disabled:opacity-50 ml-auto">
                    {deletingId === inv.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>

              {/* Payment link */}
              {inv.payment_link && (
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
                    {t.title} — ₱{Number(t.amount).toFixed(2)}
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
