import { useEffect, useState } from "react";
import { getClients, getInvoices, getTasks, createInvoice, updateTaskInvoice, updateInvoiceStatus } from "../lib/db";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-100 text-blue-700",
  paid:  "bg-green-100 text-green-700",
};

const NEXT_STATUS = { draft: "sent", sent: "paid" };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [unbilledTasks, setUnbilledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New invoice form
  const [form, setForm] = useState({ clientId: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  // Assign-tasks panel
  const [assigningTo, setAssigningTo] = useState(null); // invoice id
  const [selected, setSelected] = useState([]);

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
    try {
      await updateInvoiceStatus(invoice.id, next);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const clientTasksFor = (clientId) => unbilledTasks.filter((t) => t.client_id === clientId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-xl font-semibold text-slate-900">Invoices</h2>
      <p className="mt-1 text-sm text-slate-500">Create invoices and assign unbilled tasks to them.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {/* ── Create invoice ── */}
      {clients.length > 0 && (
        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-medium text-slate-700">New invoice</p>
          <select
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Due date (optional)</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Creating…" : "Create invoice"}
          </button>
        </form>
      )}

      {/* ── Invoice list ── */}
      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && invoices.length === 0 && (
          <p className="text-sm text-slate-400">No invoices yet.</p>
        )}
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{inv.client?.name}</p>
                <p className="text-xs text-slate-400">{inv.client?.email}</p>
                {inv.due_date && (
                  <p className="mt-1 text-xs text-slate-500">Due {inv.due_date}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-base font-semibold text-slate-900">₱{inv.total.toFixed(2)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 bg-slate-50">
              {/* Assign tasks button */}
              {clientTasksFor(inv.client_id).length > 0 && inv.status === "draft" && (
                <button
                  onClick={() => { setAssigningTo(inv.id); setSelected([]); }}
                  className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                >
                  Assign tasks ({clientTasksFor(inv.client_id).length} unbilled)
                </button>
              )}
              {/* Advance status */}
              {NEXT_STATUS[inv.status] && (
                <button
                  onClick={() => handleAdvanceStatus(inv)}
                  className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                >
                  Mark as {NEXT_STATUS[inv.status]}
                </button>
              )}
            </div>

            {/* Assign-tasks panel */}
            {assigningTo === inv.id && (
              <div className="border-t border-slate-200 px-5 py-4 space-y-2">
                <p className="text-xs font-medium text-slate-700">Select tasks to add:</p>
                {clientTasksFor(inv.client_id).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked ? [...s, t.id] : s.filter((id) => id !== t.id)
                        )
                      }
                    />
                    {t.title} — ₱{Number(t.amount).toFixed(2)}
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAssign(inv.id)}
                    disabled={selected.length === 0 || submitting}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Add {selected.length} task{selected.length !== 1 ? "s" : ""}
                  </button>
                  <button
                    onClick={() => { setAssigningTo(null); setSelected([]); }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
