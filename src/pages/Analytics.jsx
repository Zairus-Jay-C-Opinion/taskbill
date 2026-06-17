import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getInvoices, getClients, getAllTasks } from "../lib/db";
import { currencySymbol } from "../lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS = { paid: "#0D0D0D", sent: "#6B6B6B", draft: "#D4D3CF" };

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#E5E4E0] bg-white px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#0D0D0D]">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">{children}</p>;
}

export default function Analytics() {
  const { profile } = useAuth();
  const sym = currencySymbol(profile?.currency);

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (profile?.plan !== "business") return <Navigate to="/" replace />;

  useEffect(() => {
    async function load() {
      try {
        const [inv, cli, tsk] = await Promise.all([getInvoices(), getClients(), getAllTasks()]);
        setInvoices(inv);
        setClients(cli);
        setTasks(tsk);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-[#6B6B6B]">Loading…</div>;
  if (error) return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-red-600">{error}</div>;

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const sentInvoices = invoices.filter((i) => i.status === "sent");

  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const outstanding = sentInvoices.reduce((s, i) => s + i.total, 0);

  // Revenue by month — last 6 months
  const now = new Date();
  const revenueByMonth = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const total = paidInvoices
      .filter((i) => {
        const c = new Date(i.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      })
      .reduce((s, i) => s + i.total, 0);
    return { label, total };
  });

  // Invoice status breakdown
  const statusCounts = ["draft", "sent", "paid"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: invoices.filter((i) => i.status === s).length,
    color: STATUS_COLORS[s],
  })).filter((s) => s.value > 0);

  // Top 5 clients by paid revenue
  const clientRevenue = clients
    .map((c) => ({
      name: c.name,
      revenue: paidInvoices
        .filter((i) => i.client_id === c.id)
        .reduce((s, i) => s + i.total, 0),
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-2 text-xs text-[#0D0D0D] shadow-sm">
        <p className="font-semibold">{label}</p>
        <p>{sym}{Number(payload[0].value).toFixed(2)}</p>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Analytics</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Overview of your billing and task activity.</p>

      {/* ── Stat cards ── */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total revenue" value={`${sym}${totalRevenue.toFixed(2)}`} />
        <StatCard label="Outstanding" value={`${sym}${outstanding.toFixed(2)}`} />
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Total tasks" value={tasks.length} />
      </div>

      {/* ── Revenue by month ── */}
      <div className="mt-10 rounded-2xl border border-[#E5E4E0] bg-white px-6 py-6">
        <SectionTitle>Revenue by month</SectionTitle>
        {revenueByMonth.every((m) => m.total === 0) ? (
          <p className="text-sm text-[#6B6B6B]">No paid invoices yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByMonth} barSize={32}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v}`} />
              <Tooltip content={customTooltip} cursor={{ fill: "#F5F4F0" }} />
              <Bar dataKey="total" fill="#0D0D0D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">

        {/* Invoice status breakdown */}
        <div className="rounded-2xl border border-[#E5E4E0] bg-white px-6 py-6">
          <SectionTitle>Invoice status</SectionTitle>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-[#6B6B6B]">No invoices yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {statusCounts.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6B6B6B" }} />
                <Tooltip formatter={(v) => [`${v} invoice${v !== 1 ? "s" : ""}`, ""]} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #E5E4E0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top clients */}
        <div className="rounded-2xl border border-[#E5E4E0] bg-white px-6 py-6">
          <SectionTitle>Top clients by revenue</SectionTitle>
          {clientRevenue.length === 0 ? (
            <p className="text-sm text-[#6B6B6B]">No paid invoices yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientRevenue} layout="vertical" barSize={18}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-2 text-xs text-[#0D0D0D] shadow-sm">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p>{sym}{Number(payload[0].value).toFixed(2)}</p>
                    </div>
                  );
                }} cursor={{ fill: "#F5F4F0" }} />
                <Bar dataKey="revenue" fill="#0D0D0D" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
