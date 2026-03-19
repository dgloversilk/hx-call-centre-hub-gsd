"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList,
} from "recharts";
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

const QUEUE_COLORS = {
  uk:           HX.purple,
  uk_transfers: HX.blue,
  de:           HX.green,
  de_transfers: HX.orange,
};

export default function Dashboard({ queues, taskData, initialCounts, onPage }) {
  const today     = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  const allTasks = useMemo(
    () => queues.flatMap(q => (taskData[q.id] ?? []).map(t => ({ ...t, _queueId: q.id, _queueName: q.name }))),
    [queues, taskData]
  );

  const allArchived = useMemo(() => allTasks.filter(t => t.archived), [allTasks]);
  const errorDate = (t) => (t.error_time ?? "").slice(0, 10) || null;

  const s = useMemo(() => {
    const active = allTasks.filter(t => !t.archived);
    const completedToday = allArchived.filter(t => t.completed_at && toDateStr(new Date(t.completed_at)) === today);
    const completedYesterday = allArchived.filter(t => t.completed_at && toDateStr(new Date(t.completed_at)) === yesterday);

    // Avg lifecycle time for today's completions
    const lifecycleTimes = completedToday
      .map(t => {
        if (!t.error_time || !t.completed_at) return null;
        return new Date(t.completed_at) - new Date(t.error_time);
      })
      .filter(Boolean);
    const avgLifecycleMs = lifecycleTimes.length > 0
      ? lifecycleTimes.reduce((a, b) => a + b, 0) / lifecycleTimes.length
      : null;

    const outstanding = active.length;
    const assigned = active.filter(t => !!t.assigned_to).length;

    return {
      outstanding,
      assigned,
      assignedPct:        outstanding > 0 ? Math.round((assigned / outstanding) * 100) : 0,
      needsAttention:     active.filter(t => t.status === "blocked" || t.status === "escalated").length,
      completedToday:     completedToday.length,
      completedYesterday: completedYesterday.length,
      avgLifecycle:       formatDuration(avgLifecycleMs),
    };
  }, [allTasks, allArchived, today, yesterday]);

  // Stacked bar data
  const barData = useMemo(() => {
    const byDate = {};
    allTasks.forEach(t => {
      const d = errorDate(t);
      if (!d) return;
      if (!byDate[d]) byDate[d] = {};
      byDate[d][t._queueId] = (byDate[d][t._queueId] ?? 0) + 1;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: date.slice(5),
        ...counts,
        _total: Object.values(counts).reduce((s, n) => s + n, 0),
      }));
  }, [allTasks]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => onPage("upload")}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: HX.purple }}
        >
          ⬆️ Upload Tasks
        </button>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Outstanding"  value={s.outstanding}     sub="active tasks remaining"                   accent="purple" />
        <StatCard label="Assigned"     value={`${s.assigned}`}   sub={`${s.assignedPct}% of outstanding`}       accent="blue" />
        <StatCard label="Completed Today" value={s.completedToday} sub={`${s.completedYesterday} yesterday`}    accent="green" />
        <StatCard label="Avg Completion Time" value={s.avgLifecycle} sub="from error to done (today)"           accent="gray" />
      </div>

      {/* Outstanding by queue + Errors by date chart */}
      <div className="grid grid-cols-3 gap-5">

        {/* Outstanding by queue table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Outstanding by Queue</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-2">Queue</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Total</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Assigned</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Attn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {queues.map(q => {
                const active   = (taskData[q.id] ?? []).filter(t => !t.archived);
                const total    = active.length;
                const assigned = active.filter(t => !!t.assigned_to).length;
                const attn     = active.filter(t => t.status === "blocked" || t.status === "escalated").length;
                const pct      = total > 0 ? Math.round((assigned / total) * 100) : 0;
                return (
                  <tr key={q.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => onPage(q.id)}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span>{q.icon}</span>
                        <span className="font-medium text-gray-700">{q.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold text-gray-900 tabular-nums">{total}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className="font-semibold" style={{ color: HX.blue }}>{assigned}</span>
                      <span className="text-gray-400 text-xs ml-1">{pct}%</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-semibold" style={{ color: attn > 0 ? HX.red : "#D1D5DB" }}>{attn}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 text-xs font-semibold text-gray-500 uppercase">Total</td>
                <td className="py-2 text-right font-bold text-gray-900 tabular-nums">{s.outstanding}</td>
                <td className="py-2 text-right font-bold tabular-nums" style={{ color: HX.blue }}>{s.assigned}</td>
                <td className="py-2 text-right font-bold tabular-nums" style={{ color: s.needsAttention > 0 ? HX.red : "#D1D5DB" }}>{s.needsAttention}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Stacked bar chart */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Errors by Date & Queue</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barSize={18} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [value, queues.find(q => q.id === name)?.name ?? name]}
                  labelFormatter={l => `Error date: ${l}`}
                />
                <Legend
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={name => queues.find(q => q.id === name)?.name ?? name}
                />
                {queues.map((q, i) => {
                  const isLast = i === queues.length - 1;
                  return (
                    <Bar
                      key={q.id}
                      dataKey={q.id}
                      stackId="a"
                      fill={QUEUE_COLORS[q.id] ?? HX.gray2}
                      radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                      {isLast && (
                        <LabelList
                          dataKey="_total"
                          position="top"
                          style={{ fontSize: 10, fontWeight: 700, fill: "#374151" }}
                        />
                      )}
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No error date data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
