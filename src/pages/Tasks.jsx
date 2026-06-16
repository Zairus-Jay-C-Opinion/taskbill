import { useEffect, useState } from "react";
import { getClients, getTasks, createTask, createClient } from "../lib/db";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create-task form
  const [form, setForm] = useState({ clientId: "", title: "", description: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);

  // New-client inline form
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", email: "" });

  useEffect(() => {
    load();
  }, []);

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
      const task = await createTask({
        clientId: form.clientId,
        title: form.title,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
      });
      // Reload to get joined client name
      await load();
      setForm((f) => ({ ...f, title: "", description: "", amount: "" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
      <p className="mt-1 text-sm text-slate-500">Unbilled tasks — add them to an invoice when ready.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {/* ── Add client inline ── */}
      {showClientForm ? (
        <form onSubmit={handleAddClient} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-medium text-slate-700">New client</p>
          <input
            required
            placeholder="Name"
            value={clientForm.name}
            onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={clientForm.email}
            onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Save client
            </button>
            <button type="button" onClick={() => { setShowClientForm(false); setClientForm({ name: "", email: "" }); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowClientForm(true)} className="mt-4 text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2">
          + Add a client first
        </button>
      )}

      {/* ── Add task form ── */}
      {clients.length > 0 && (
        <form onSubmit={handleAddTask} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-medium text-slate-700">New task</p>
          <select
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount (₱)"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Adding…" : "Add task"}
          </button>
        </form>
      )}

      {/* ── Task list ── */}
      <div className="mt-8 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-slate-400">No unbilled tasks yet.</p>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-900">{task.title}</p>
              {task.description && <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>}
              <p className="mt-1 text-xs text-slate-400">{task.client?.name}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900">₱{Number(task.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
