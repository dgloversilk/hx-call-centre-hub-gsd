"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { HX } from "@/lib/brand";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";

function toDateStr(date) {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// Status display config for workload breakdown
const WORKLOAD_STATUS = [
  { key: "in_progress", label: "In progress",    color: "#7C3AED" },
  { key: "pending",     label: "Pending",        color: "#D97706" },
  { key: "blocked",     label: "Needs Attention", color: "#DC2626" },
  { key: "escalated",   label: "Needs Attention", color: "#DC2626" },
];

export default function DailySummary({ queues, taskData }) {
  const today     = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);

  // Clamp: from can't be after to, to can't be before from
  const handleFrom = (val) => { setFromDate(val); if (val > toDate) setToDate(val); };
  const handleTo   = (val) => { setToDate(val);   if (val < fromDate) setFromDate(val); };

  const setPreset = (from, to) => { setFromDate(from); setToDate(to); };

  // Filter tasks whose status_updated_at falls within [fromDate, toDate]
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = toDateStr(new Date(dateStr));
    return d >= fromDate && d <= toDate;
  };

  const rangeLabel = fromDate === toDate
    ? new Date(fromDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${new Date(fromDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(toDate + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  // Use status_updated_at for in-progress/blocked/escalated tasks,
  // and completed_at / archived_at for done tasks
  const taskDate = (t) => t.status_updated_at ?? t.completed_at ?? t.archived_at ?? null;

  const updated = useMemo(() =>
    queues.flatMap(q =>
      (taskData[q.id] ?? [])
        .filter(t => inRange(taskDate(t)))
        .map(t => ({ ...t, queueName: q.name, queueIcon: q.icon }))
    ),
  [queues, taskData, fromDate, toDate]);

  const completed  = updated.filter(t => t.status === "completed" || t.status === "done");
  const attention  = updated.filter(t => t.status === "blocked" || t.status === "escalated");
  const inProgress = updated.filter(t => t.status === "in_progress");

  // Agent name: prefer whoever last changed status, then assigned agent
  const agentOf = (t) => t.status_updated_by ?? t.completed_by ?? t.archived_by ?? t.assigned_to ?? "Unknown";

  const byAgent = useMemo(() => {
    const map = {};
    completed.forEach(t => { const n = agentOf(t); map[n] = (map[n] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [completed]);

  const byQueue = useMemo(() => {
    const map = {};
    completed.forEach(t => { map[t.queueName] = (map[t.queueName] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name: name.replace(" Bookings", ""), count }));
  }, [completed]);

  const noActivity = updated.length === 0;

  // ── Live workload snapshot (not date-range filtered) ──────────────────────
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

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

      {/* Heading + date filter */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Daily Summary</h2>
          <p className="text-gray-500 text-sm mt-0.5">{rangeLabel}</p>
        </div>

        {/* Calendar filter */}
        <div className="flex flex-col gap-2 items-end">
          {/* Preset buttons */}
          <div className="flex gap-2">
            {[
              { label: "Today",     from: today,     to: today     },
              { label: "Yesterday", from: yesterday,  to: yesterday  },
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

          {/* Date range inputs */}
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={fromDate} max={toDate} onChange={e => handleFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
              onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
            <span className="text-gray-400">→</span>
            <input type="date" value={toDate} min={fromDate} onChange={e => handleTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
              onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
          </div>
        </div>
      </div>

      {/* ── Team Workload — always shown, live snapshot ─────────────────── */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="font-semibold text-gray-800 text-base">Team Workload</h3>
          <span className="text-xs text-gray-400">Live · tasks currently assigned</span>
        </div>

        {workload.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No tasks are currently assigned to any agent.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {workload.map(({ name, total, byStatus }) => {
              const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              // Build a mini stacked bar
              const segments = WORKLOAD_STATUS.filter(s => byStatus[s.key]);
              return (
                <div key={name}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3"
                >
                  {/* Agent header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: HX.purple }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{name}</div>
                      <div className="text-xs text-gray-400">{total} active task{total !== 1 ? "s" : ""}</div>
                    </div>
                    <div
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: HX.purple }}
                    >
                      {total}
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="h-2 rounded-full overflow-hidden flex gap-px bg-gray-100">
                    {segments.map(s => (
                      <div
                        key={s.key}
                        title={`${s.label}: ${byStatus[s.key]}`}
                        style={{
                          flex: byStatus[s.key],
                          background: s.color,
                          minWidth: 4,
                        }}
                      />
                    ))}
                  </div>

                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {segments.map(s => (
                      <span key={s.key} className="text-xs flex items-center gap-1 text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Completed"       value={completed.length}  sub="tasks resolved" accent="green"  />
            <StatCard label="In Progress"     value={inProgress.length} sub="picked up"      accent="purple" />
            <StatCard label="Needs Attention" value={attention.length}  sub="blocked or escalated" accent="red" />
          </div>

          {/* Charts */}
          {(byAgent.length > 0 || byQueue.length > 0) && (
            <div className="grid grid-cols-2 gap-5 mb-6">
              {byAgent.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Completions by Agent</h3>
                  <ResponsiveContainer width="100%" height={Math.max(180, byAgent.length * 44)}>
                    <BarChart data={byAgent} barSize={28} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill={HX.purple} radius={[0, 4, 4, 0]} name="Completed">
                        <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: HX.purpleDark }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {byQueue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Completions by Queue</h3>
                  <ResponsiveContainer width="100%" height={Math.max(180, byQueue.length * 44)}>
                    <BarChart data={byQueue} barSize={28} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill={HX.yellow} radius={[0, 4, 4, 0]} name="Completed">
                        <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "#7A6200" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Activity log */}
          <h3 className="font-semibold text-gray-800 mb-3">Activity Log</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Task Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Queue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...updated]
                  .sort((a, b) => new Date(taskDate(b)) - new Date(taskDate(a)))
                  .map((task, idx) => {
                    const ts = taskDate(task);
                    return (
                      <tr key={task._id}
                        className={idx % 2 === 1 ? "bg-gray-50/60" : ""}
                        onMouseEnter={e => { e.currentTarget.style.background = HX.purplePale; }}
                        onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 1 ? "#F9FAFB" : ""; }}
                      >
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {" "}
                          {new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {task.chips_reference ?? task.ref ?? task._id}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          <span className="mr-1">{task.queueIcon}</span>{task.queueName}
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{agentOf(task)}</td>
                        <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                        <td className="px-4 py-3 text-gray-500 text-sm max-w-48 truncate">{task.notes || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
