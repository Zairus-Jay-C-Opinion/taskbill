import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getInvoices, getClients, getAllTasks } from "../lib/db";
import { currencySymbol } from "../lib/currency";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

function RevenueTooltip({ active, payload, label, sym }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-2 text-xs shadow-sm">
      <p className="text-[#6B6B6B]">{label}</p>
      <p className="font-semibold text-[#0D0D0D]">{sym}{Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
}

export default function Analytics() {
  const { profile } = useAuth();
  const sym = currencySymbol(profile?.currency);

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (profile?.plan !== "business") return <Navigate to="/" replace />;

  if (loading) return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-[#6B6B6B]">Loading…</div>;
  if (error) return <div className="mx-auto max-w-4xl px-6 py-10 text-sm text-red-600">{error}</div>;

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const sentInvoices = invoices.filter((i) => i.status === "sent");
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const outstanding = sentInvoices.reduce((s, i) => s + i.total, 0);

  // Last 6 months revenue
  const now = new Date();
  const revenueByMonth = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const label = d.toLocaleString("default", { month: "short" });
    const total = paidInvoices
      .filter((i) => {
        const c = new Date(i.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      })
      .reduce((s, i) => s + i.total, 0);
    return { label, total };
  });

  // Top clients by paid revenue
  const maxRevenue = Math.max(
    ...clients.map((c) => paidInvoices.filter((i) => i.client_id === c.id).reduce((s, i) => s + i.total, 0)),
    1
  );
  const clientRevenue = clients
    .map((c) => ({
      name: c.name,
      revenue: paidInvoices.filter((i) => i.client_id === c.id).reduce((s, i) => s + i.total, 0),
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const hasRevenue = revenueByMonth.some((m) => m.total > 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">

      {/* ── Header ── */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Analytics</p>
      <h2 className="mt-2 text-4xl font-bold tracking-tight text-[#0D0D0D]">
        {sym}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Total revenue earned</p>

      {/* ── Key metrics row ── */}
      <div className="mt-8 grid grid-cols-3 divide-x divide-[#E5E4E0] border border-[#E5E4E0] rounded-2xl overflow-hidden bg-white">
        {[
          { label: "Outstanding", value: `${sym}${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: "Clients", value: clients.length },
          { label: "Total tasks", value: tasks.length },
        ].map(({ label, value }) => (
          <div key={label} className="px-6 py-5">
            <p className="text-xs text-[#6B6B6B]">{label}</p>
            <p className="mt-1 text-xl font-bold text-[#0D0D0D]">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue trend ── */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Revenue — last 6 months</p>
        </div>
        {!hasRevenue ? (
          <p className="text-sm text-[#6B6B6B]">No paid invoices in the last 6 months.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByMonth} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D0D0D" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#0D0D0D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v}`} width={60} />
              <Tooltip content={<RevenueTooltip sym={sym} />} cursor={{ stroke: "#E5E4E0", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="total" stroke="#0D0D0D" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "#0D0D0D", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top clients ── */}
      {clientRevenue.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-5">Top clients</p>
          <div className="space-y-5">
            {clientRevenue.map((c, i) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs text-[#6B6B6B] w-4">{i + 1}</span>
                    <span className="text-sm font-medium text-[#0D0D0D]">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#0D0D0D]">
                    {sym}{c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-[#E5E4E0]">
                  <div
                    className="h-1 rounded-full bg-[#0D0D0D] transition-all"
                    style={{ width: `${(c.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
