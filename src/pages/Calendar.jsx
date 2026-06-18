import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getAllTasks, getInvoices } from "../lib/db";
import { currencySymbol } from "../lib/currency";
import { Skeleton } from "../components/Skeleton";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES = {
  draft: "bg-stone-100 text-stone-600",
  sent:  "bg-sky-100 text-sky-700",
  paid:  "bg-emerald-100 text-emerald-700",
};

function buildGrid(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Calendar() {
  const { profile } = useAuth();
  const sym = currencySymbol(profile?.currency);

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [tasks, setTasks]         = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, inv] = await Promise.all([getAllTasks(), getInvoices()]);
        setTasks(t);
        setInvoices(inv);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function prevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // Build event map: "YYYY-MM-DD" → { tasks[], invoices[] }
  const eventMap = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    if (!eventMap[t.due_date]) eventMap[t.due_date] = { tasks: [], invoices: [] };
    eventMap[t.due_date].tasks.push(t);
  });
  invoices.forEach((inv) => {
    if (!inv.due_date) return;
    if (!eventMap[inv.due_date]) eventMap[inv.due_date] = { tasks: [], invoices: [] };
    eventMap[inv.due_date].invoices.push(inv);
  });

  const grid    = buildGrid(viewYear, viewMonth);
  const selected = selectedDay ? eventMap[selectedDay] : null;
  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Calendar</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Task and invoice due dates at a glance.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Month navigation ── */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-2 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-[#0D0D0D]">{monthLabel}</p>
        <button
          onClick={nextMonth}
          className="rounded-xl border border-[#E5E4E0] bg-white px-3 py-2 text-sm font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors"
        >
          →
        </button>
      </div>

      {/* ── Calendar grid ── */}
      <div className="mt-4 rounded-2xl border border-[#E5E4E0] bg-white overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-[#E5E4E0]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 border-b border-r border-[#E5E4E0] p-2">
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="h-16 border-b border-r border-[#E5E4E0] bg-[#F5F4F0]/50" />;
              }
              const dateStr  = toDateStr(viewYear, viewMonth, day);
              const events   = eventMap[dateStr];
              const isToday  = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const hasEvents = !!events;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`h-16 border-b border-r border-[#E5E4E0] p-2 text-left flex flex-col transition-colors
                    ${isSelected ? "bg-[#0D0D0D]" : hasEvents ? "hover:bg-[#F5F4F0] cursor-pointer" : "cursor-default"}
                  `}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday && !isSelected ? "bg-[#0D0D0D] text-white" : isSelected ? "text-white" : "text-[#0D0D0D]"}
                  `}>
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1 ml-0.5">
                      {events.tasks.length > 0 && (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-amber-300" : "bg-amber-400"}`} />
                      )}
                      {events.invoices.length > 0 && (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-sky-300" : "bg-sky-500"}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex items-center gap-4 text-xs text-[#6B6B6B]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Tasks</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Invoices</span>
      </div>

      {/* ── Selected day panel ── */}
      {selectedDay && (
        <div className="mt-6 rounded-2xl border border-[#E5E4E0] bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E4E0]">
            <p className="text-sm font-semibold text-[#0D0D0D]">
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("default", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          {!selected ? (
            <p className="px-6 py-4 text-sm text-[#6B6B6B]">No due dates on this day.</p>
          ) : (
            <div className="divide-y divide-[#E5E4E0]">
              {selected.tasks.length > 0 && (
                <div className="px-6 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Tasks</p>
                  {selected.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-[#0D0D0D]">{t.title}</p>
                        {t.client?.name && <p className="text-xs text-[#6B6B6B]">{t.client.name}</p>}
                      </div>
                      <span className="text-sm font-semibold text-[#0D0D0D]">
                        {sym}{Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {selected.invoices.length > 0 && (
                <div className="px-6 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Invoices</p>
                  {selected.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-[#0D0D0D]">{inv.client?.name}</p>
                        <p className="text-xs text-[#6B6B6B]">{inv.client?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                        <span className="font-semibold text-[#0D0D0D]">
                          {sym}{inv.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
