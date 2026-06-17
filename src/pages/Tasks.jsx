import { useEffect, useState } from "react";
import { getClients, getTasks, createTask, createClient } from "../lib/db";

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnGhost = "rounded-xl border border-[#E5E4E0] px-5 py-2.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ clientId: "", title: "", description: "", amount: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", email: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [t, c] = await Promise.all([getTasks(), getClients()]);
      setTasks(t);
      setClients(c);
      if (c.length > 0 && !form.clientId) {
        setForm((f) => ({ ...f, clientId: c[0].id }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const client = await createClient(clientForm);
      setClients((prev) => [...prev, client]);
      setForm((f) => ({ ...f, clientId: client.id }));
      setClientForm({ name: "", email: "" });
      setShowClientForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createTask({
        clientId: form.clientId,
        title: form.title,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        dueDate: form.dueDate,
      });
      await load();
      setForm((f) => ({ ...f, title: "", description: "", amount: "", dueDate: "" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Tasks</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Unbilled tasks — add them to an invoice when ready.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Add client ── */}
      {showClientForm ? (
        <form onSubmit={handleAddClient} className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">New client</p>
          <input required placeholder="Name" value={clientForm.name}
            onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input required type="email" placeholder="Email" value={clientForm.email}
            onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className={btnPrimary}>Save client</button>
            <button type="button" onClick={() => { setShowClientForm(false); setClientForm({ name: "", email: "" }); }} className={btnGhost}>Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowClientForm(true)} className="mt-5 text-sm text-[#6B6B6B] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors">
          + Add a client first
        </button>
      )}

      {/* ── Add task ── */}
      {clients.length > 0 && (
        <form onSubmit={handleAddTask} className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">New task</p>
          <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} className={inputCls}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
          <input placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          <input required type="number" min="0" step="0.01" placeholder="Amount (₱)" value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} />
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1.5">Due date (optional)</label>
            <input type="date" value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
          </div>
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Adding…" : "Add task"}
          </button>
        </form>
      )}

      {/* ── Task list ── */}
      <div className="mt-8 space-y-3">
        {loading && <p className="text-sm text-[#6B6B6B]">Loading…</p>}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">No unbilled tasks yet.</p>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start justify-between rounded-2xl border border-[#E5E4E0] bg-white px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">{task.title}</p>
              {task.description && <p className="mt-0.5 text-xs text-[#6B6B6B]">{task.description}</p>}
              <p className="mt-1.5 text-xs text-[#6B6B6B]">{task.client?.name}</p>
              {task.due_date && <p className="mt-0.5 text-xs text-[#6B6B6B]">Due {task.due_date}</p>}
            </div>
            <span className="text-sm font-bold text-[#0D0D0D]">₱{Number(task.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
