import { useEffect, useState } from "react";
import { getClients, getTasks, createTask, createClient, deleteTask, getTaskCountThisMonth } from "../lib/db";
import { useAuth } from "../auth/AuthProvider";
import { currencySymbol } from "../lib/currency";
import { Skeleton } from "../components/Skeleton";

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";
const btnGhost = "rounded-xl border border-[#E5E4E0] px-5 py-2.5 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors";

function checkDueNotifications(taskList, sym) {
  if (!("Notification" in window)) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() + 3);

  const dueSoon = taskList.filter((t) => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due >= today && due <= cutoff;
  });
  if (dueSoon.length === 0) return;

  const todayStr = today.toDateString();
  const storageKey = `taskbill-notified-${todayStr}`;
  const alreadyNotified = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));

  const pending = dueSoon.filter((t) => !alreadyNotified.has(t.id));
  if (pending.length === 0) return;

  const fire = async () => {
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    pending.forEach((task) => {
      const due = new Date(task.due_date);
      due.setHours(0, 0, 0, 0);
      const diff = Math.round((due - today) / 86400000);
      const when = diff === 0 ? "today" : diff === 1 ? "tomorrow" : `in ${diff} days`;
      new Notification(`Task due ${when}`, {
        body: `${task.title} — ${sym}${Number(task.amount).toFixed(2)}`,
        icon: "/logo.png",
      });
      alreadyNotified.add(task.id);
    });

    localStorage.setItem(storageKey, JSON.stringify([...alreadyNotified]));
  };

  fire();
}

const FREE_CLIENT_LIMIT = 3;

export default function Tasks() {
  const { profile, workspaceId } = useAuth();
  const sym = currencySymbol(profile?.currency);

  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ clientId: "", title: "", description: "", amount: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");

  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", email: "" });

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [t, c] = await Promise.all([getTasks({ workspaceId }), getClients(workspaceId)]);
      setTasks(t);
      setClients(c);
      checkDueNotifications(t, sym);
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
    if (profile?.plan === "free" && clients.length >= FREE_CLIENT_LIMIT) {
      setError(`Free plan is limited to ${FREE_CLIENT_LIMIT} clients. Upgrade to Pro to add more.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const client = await createClient({ ...clientForm, workspaceId });
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
    setError("");
    if (profile?.plan === "free") {
      const count = await getTaskCountThisMonth();
      if (count >= 20) {
        setError("Free plan is limited to 20 tasks per month. Upgrade to Pro for unlimited tasks.");
        return;
      }
    }
    setSubmitting(true);
    try {
      await createTask({
        clientId: form.clientId,
        title: form.title,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        dueDate: form.dueDate,
        workspaceId,
      });
      await load();
      setForm((f) => ({ ...f, title: "", description: "", amount: "", dueDate: "" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTask(taskId) {
    setDeletingId(taskId);
    setError("");
    try {
      await deleteTask(taskId);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTasks = [...tasks]
    .filter((t) => !search || t.client?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case "oldest":   return new Date(a.created_at) - new Date(b.created_at);
        case "price-hi": return Number(b.amount) - Number(a.amount);
        case "price-lo": return Number(a.amount) - Number(b.amount);
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

  // Tasks due within 3 days — for in-app banner
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() + 3);
  const dueSoonTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due >= today && due <= cutoff;
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Tasks</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Unbilled tasks — add them to an invoice when ready.</p>

      {/* Due-soon banner */}
      {dueSoonTasks.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Due soon:</span>{" "}
          {dueSoonTasks.map((t) => {
            const due = new Date(t.due_date);
            due.setHours(0, 0, 0, 0);
            const diff = Math.round((due - today) / 86400000);
            const when = diff === 0 ? "today" : diff === 1 ? "tomorrow" : `in ${diff} days`;
            return `${t.title} (${when})`;
          }).join(" · ")}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Add client ── */}
      {showClientForm ? (
        <form onSubmit={handleAddClient} className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">New client</p>
          <input id="client-name" name="client-name" required placeholder="Name" value={clientForm.name}
            onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input id="client-email" name="client-email" required type="email" placeholder="Email" value={clientForm.email}
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
          <input id="task-title" name="task-title" required placeholder="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
          <input placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          <input id="task-amount" name="task-amount" required type="number" min="0" step="0.01" placeholder={`Amount (${sym})`} value={form.amount}
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

      {/* ── Filter / sort ── */}
      {!loading && tasks.length > 0 && (
        <div className="mt-6 flex gap-3">
          <input
            placeholder="Search by client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] transition-colors"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="price-hi">Price: High to Low</option>
            <option value="price-lo">Price: Low to High</option>
            <option value="due-soon">Due date: Soonest</option>
            <option value="due-late">Due date: Latest</option>
          </select>
        </div>
      )}

      {/* ── Task list ── */}
      <div className="mt-4 space-y-3">
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#E5E4E0] bg-white px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-4 w-16 ml-4 shrink-0" />
            </div>
          </div>
        ))}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">No unbilled tasks yet.</p>
        )}
        {!loading && tasks.length > 0 && filteredTasks.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">No tasks match "{search}".</p>
        )}
        {filteredTasks.map((task) => (
          <div key={task.id} className="flex items-start justify-between rounded-2xl border border-[#E5E4E0] bg-white px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">{task.title}</p>
              {task.description && <p className="mt-0.5 text-xs text-[#6B6B6B]">{task.description}</p>}
              <p className="mt-1.5 text-xs text-[#6B6B6B]">{task.client?.name}</p>
              {task.due_date && <p className="mt-0.5 text-xs text-[#6B6B6B]">Due {task.due_date}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm font-bold text-[#0D0D0D]">{sym}{Number(task.amount).toFixed(2)}</span>
              {/* TEMP: delete allowed for cleanup */}
              <button onClick={() => handleDeleteTask(task.id)}
                disabled={deletingId === task.id}
                className="text-xs text-red-400 hover:text-red-600 underline underline-offset-4 transition-colors disabled:opacity-50">
                {deletingId === task.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
