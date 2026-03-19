"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { HX } from "@/lib/brand";
import StatCard from "@/components/ui/StatCard";

function toDateStr(date) {
  return date.toLocaleDateString("en-CA");
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "—";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function lifecycleMs(task) {
  if (!task.error_time || !task.completed_at) return null;
  const ms = new Date(task.completed_at) - new Date(task.error_time);
  return ms > 0 ? ms : null;
}

const WORKLOAD_STATUS = [
  { key: "in_progress", label: "In progress",     color: HX.blue },
  { key: "pending",     label: "Pending",          color: "#D97706" },
  { key: "blocked",     label: "Needs Attention",  color: HX.red },
  { key: "escalated",   label: "Needs Attention",  color: HX.red },
];

export default function DailySummary({ queues, taskData }) {
  const today     = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);

  const handleFrom = (val) => { setFromDate(val); if (val > toDate) setToDate(val); };
  const handleTo   = (val) => { setToDate(val);   if (val < fromDate) setFromDate(val); };
  const setPreset  = (from, to) => { setFromDate(from); setToDate(to); };

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = toDateStr(new Date(dateStr));
    return d >= fromDate && d <= toDate;
  };

  const rangeLabel = fromDate === toDate
    ? new Date(fromDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${new Date(fromDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${new Date(toDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  const agentOf  = (t) => t.completed_by ?? t.status_updated_by ?? t.archived_by ?? t.assigned_to ?? "Unknown";

  // All tasks across all queues with queue metadata
  const allTasks = useMemo(() =>
    queues.flatMap(q =>
      (taskData[q.id] ?? []).map(t => ({ ...t, queueName: q.name, queueIcon: q.icon }))
    ),
  [queues, taskData]);

  // Completed: archived tasks whose completed_at falls in the date range (matches Dashboard logic)
  const completed = useMemo(() =>
    allTasks.filter(t => {
      if (!t.archived || !t.completed_at) return false;
      const d = toDateStr(new Date(t.completed_at));
      return d >= fromDate && d <= toDate;
    }),
  [allTasks, fromDate, toDate]);

  // Attention: active tasks with blocked/escalated status (live snapshot, not date-filtered)
  const attention = useMemo(() =>
    allTasks.filter(t => !t.archived && (t.status === "blocked" || t.status === "escalated")),
  [allTasks]);

  // Avg lifecycle time
  const avgLifecycle = useMemo(() => {
    const times = completed.map(lifecycleMs).filter(Boolean);
    if (!times.length) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }, [completed]);

  // Completions by agent (with avg time)
  const byAgent = useMemo(() => {
    const map = {};
    completed.forEach(t => {
      const n = agentOf(t);
      if (!map[n]) map[n] = { count: 0, totalMs: 0, withTime: 0 };
      map[n].count++;
      const ms = lifecycleMs(t);
      if (ms) { map[n].totalMs += ms; map[n].withTime++; }
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, d]) => ({
        name,
        count: d.count,
        avgMs: d.withTime > 0 ? d.totalMs / d.withTime : null,
      }));
  }, [completed]);

  // Completions by queue (with avg time)
  const byQueue = useMemo(() => {
    const map = {};
    completed.forEach(t => {
      const n = t.queueName;
      if (!map[n]) map[n] = { count: 0, totalMs: 0, withTime: 0 };
      map[n].count++;
      const ms = lifecycleMs(t);
      if (ms) { map[n].totalMs += ms; map[n].withTime++; }
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, d]) => ({
        name: name.replace(" Bookings", ""),
        count: d.count,
        avgMs: d.withTime > 0 ? d.totalMs / d.withTime : null,
      }));
  }, [completed]);

  // Live workload (not date-filtered)
  const workload = useMemo(() => {
    const map = {};
    queues.forEach(q => {
      (taskData[q.id] ?? [])
        .filter(t => !t.archived && t.assigned_to && t.status !== "done" && t.status !== "completed")
        .forEach(t => {
          if (!map[t.assigned_to]) map[t.assigned_to] = { total: 0, byStatus: {} };
          map[t.assigned_to].total++;
          map[t.assigned_to].byStatus[t.status] = (map[t.assigned_to].byStatus[t.status] ?? 0) + 1;
        });
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({ name, ...data }));
  }, [queues, taskData]);

  const noActivity = completed.length === 0 && attention.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

      {/* Header + date filter */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Performance</h2>
          <p className="text-gray-500 text-sm mt-0.5">{rangeLabel}</p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            {[
              { label: "Today",     from: today,     to: today },
              { label: "Yesterday", from: yesterday, to: yesterday },
              { label: "Last 7d",   from: toDateStr(new Date(Date.now() - 6 * 86_400_000)), to: today },
              { label: "This month",from: today.slice(0, 7) + "-01", to: today },
            ].map(({ label, from, to }) => {
              const active = fromDate === from && toDate === to;
              return (
                <button key={label} onClick={() => setPreset(from, to)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                  style={active
                    ? { background: HX.purple, color: "white", borderColor: HX.purple }
                    : { background: "white", color: "#374151", borderColor: "#E5E7EB" }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={fromDate} max={toDate} onChange={e => handleFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
              style={{ "--tw-ring-color": HX.purple }} />
            <span className="text-gray-400">→</span>
            <input type="date" value={toDate} min={fromDate} onChange={e => handleTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
              style={{ "--tw-ring-color": HX.purple }} />
          </div>
        </div>
      </div>

      {/* Team Workload — live snapshot */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="font-semibold text-gray-800 text-base">Team Workload</h3>
          <span className="text-xs text-gray-400">Live snapshot</span>
        </div>

        {workload.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No tasks currently assigned.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {workload.map(({ name, total, byStatus }) => {
              const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              const segments = WORKLOAD_STATUS.filter(s => byStatus[s.key]);
              return (
                <div key={name} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: HX.purple }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{name}</div>
                      <div className="text-xs text-gray-400">{total} active</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex gap-px bg-gray-100 mb-2">
                    {segments.map(s => (
                      <div key={s.key} title={`${s.label}: ${byStatus[s.key]}`}
                        style={{ flex: byStatus[s.key], background: s.color, minWidth: 3 }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {segments.map(s => (
                      <span key={s.key} className="text-xs flex items-center gap-1 text-gray-500">
                        <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: s.color }} />
                        {byStatus[s.key]} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {noActivity ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-700">No activity in this date range</div>
          <div className="text-sm text-gray-400 mt-1">Try adjusting the dates above.</div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard label="Completed"       value={completed.length}  sub="tasks resolved"       accent="green" />
            <StatCard label="Needs Attention"  value={attention.length}  sub="blocked or escalated" accent="red" />
          </div>

          {/* Charts — side by side */}
          {(byAgent.length > 0 || byQueue.length > 0) && (
            <div className="grid grid-cols-2 gap-5">
              {byAgent.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Completions by Agent</h3>
                  <ResponsiveContainer width="100%" height={Math.max(160, byAgent.length * 52)}>
                    <BarChart data={byAgent} barSize={24} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(value) => [`${value} completed`, ""]} />
                      <Bar dataKey="count" fill={HX.purple} radius={[0, 4, 4, 0]} name="Completed">
                        <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {byQueue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Completions by Queue</h3>
                  <ResponsiveContainer width="100%" height={Math.max(160, byQueue.length * 52)}>
                    <BarChart data={byQueue} barSize={24} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(value) => [`${value} completed`, ""]} />
                      <Bar dataKey="count" fill={HX.green} radius={[0, 4, 4, 0]} name="Completed">
                        <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
