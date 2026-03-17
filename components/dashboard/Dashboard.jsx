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

// One colour per queue for the stacked bar
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

  // Extract date from error_time field ("2026-03-01 01:05:12 UTC" → "2026-03-01")
  const errorDate = (t) => (t.error_time ?? "").slice(0, 10) || null;

  const s = useMemo(() => {
    const active = allTasks.filter(t => !t.archived);
    return {
      outstanding:       active.length,
      assigned:          active.filter(t => !!t.assigned_to).length,
      needsAttention:    active.filter(t => t.status === "blocked" || t.status === "escalated").length,
      addedToday:        allTasks.filter(t => errorDate(t) === today).length,
      completedToday:    allArchived.filter(t => t.completed_at && toDateStr(new Date(t.completed_at)) === today).length,
      addedYesterday:    allTasks.filter(t => errorDate(t) === yesterday).length,
      completedYesterday:allArchived.filter(t => t.completed_at && toDateStr(new Date(t.completed_at)) === yesterday).length,
    };
  }, [allTasks, allArchived, today, yesterday]);

  // Stacked bar: tasks by error_date, stacked by queue
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
        date: date.slice(5), // "MM-DD" for readability
        ...counts,
        _total: Object.values(counts).reduce((s, n) => s + n, 0),
      }));
  }, [allTasks]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

      {/* Heading */}
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

      {/* 7 stat cards */}
      <div className="grid grid-cols-7 gap-4 mb-6">
        <StatCard label="Outstanding"        value={s.outstanding}        sub="active tasks remaining"  accent="purple" />
        <StatCard label="Assigned"           value={s.assigned}           sub={`of ${s.outstanding} outstanding`} accent="blue" />
        <StatCard label="Needs Attention"    value={s.needsAttention}     sub="blocked or escalated"    accent="red"    />
        <StatCard label="Added Today"        value={s.addedToday}         sub="errors logged today"     accent="blue"   />
        <StatCard label="Completed Today"    value={s.completedToday}     sub="completed today"         accent="green"  />
        <StatCard label="Added Yesterday"    value={s.addedYesterday}     sub="errors logged yesterday" accent="blue"   />
        <StatCard label="Completed Yesterday"value={s.completedYesterday} sub="completed yesterday"     accent="green"  />
      </div>

      {/* Outstanding by queue table + Errors by date bar chart side by side */}
      <div className="grid grid-cols-3 gap-5 mb-6">

        {/* Outstanding by queue — simple table */}
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
                const active  = (taskData[q.id] ?? []).filter(t => !t.archived);
                const total   = active.length;
                const assigned = active.filter(t => !!t.assigned_to).length;
                const attn    = active.filter(t => t.status === "blocked" || t.status === "escalated").length;
                const pct     = total > 0 ? Math.round((assigned / total) * 100) : 0;
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

        {/* Stacked bar: errors by date, split by queue — takes 2 cols */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Errors by Date &amp; Queue</h3>
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

      {/* Queue summary cards */}
      <h3 className="font-semibold text-gray-800 mb-3">Queue Summary</h3>
      <div className="grid grid-cols-2 gap-4">
        {queues.map(q => {
          const allQ           = taskData[q.id] ?? [];
          const active         = allQ.filter(t => !t.archived);
          const total          = allQ.length;
          const outstanding    = active.length;
          const assigned       = active.filter(t => !!t.assigned_to).length;
          const doneYest       = allQ.filter(t => t.completed_at && toDateStr(new Date(t.completed_at)) === today).length;
          const needsAttention = active.filter(t => t.status === "blocked" || t.status === "escalated").length;

          // Status strip proportions
          const pending    = active.filter(t => t.status === "pending").length;
          const inProgress = active.filter(t => t.status === "in_progress").length;
          const done       = allQ.filter(t => t.archived).length;
          const pPct = total > 0 ? (pending / total) * 100 : 0;
          const iPct = total > 0 ? (inProgress / total) * 100 : 0;
          const dPct = total > 0 ? (done / total) * 100 : 0;

          return (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onPage(q.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{q.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{q.name}</div>
                    <div className="text-xs text-gray-500">{q.schedule}</div>
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{ background: HX.purplePale, color: HX.purple }}
                >
                  View →
                </span>
              </div>

              {/* 4 matching stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{outstanding}</div>
                  <div className="text-xs text-gray-500">Outstanding</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: HX.blue }}>{assigned}</div>
                  <div className="text-xs text-gray-500">Assigned</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: HX.green }}>{doneYest}</div>
                  <div className="text-xs text-gray-500">Done Today</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: needsAttention > 0 ? HX.red : HX.gray2 }}>{needsAttention}</div>
                  <div className="text-xs text-gray-500">Attention</div>
                </div>
              </div>

              {/* Status strip: pending | in progress | done */}
              <div className="h-2 rounded-full overflow-hidden flex" style={{ background: HX.gray3 }}>
                <div style={{ width: `${pPct}%`, background: HX.gray2 }} />
                <div style={{ width: `${iPct}%`, background: HX.blue }} />
                <div style={{ width: `${dPct}%`, background: HX.green }} />
              </div>
              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                <span>{pending} pending</span>
                <span style={{ color: HX.blue }}>{inProgress} in progress</span>
                <span style={{ color: HX.green }}>{done} done</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
