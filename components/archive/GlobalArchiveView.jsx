"use client";

import { useState, useMemo } from "react";
import { HX } from "@/lib/brand";
import StatusBadge from "@/components/ui/StatusBadge";

export default function GlobalArchiveView({ queues, taskData, onRestore }) {
  const [queueFilter, setQueueFilter] = useState("all");

  // Flatten archived tasks from all queues, attaching queue info to each
  const allArchived = useMemo(() => {
    return queues.flatMap(q =>
      (taskData[q.id] ?? [])
        .filter(t => t.archived)
        .map(t => ({ ...t, _queueId: q.id, _queueName: q.name, _queueIcon: q.icon, _firstCol: q.displayCols?.[0] ?? null }))
    );
  }, [queues, taskData]);

  const filtered = queueFilter === "all"
    ? allArchived
    : allArchived.filter(t => t._queueId === queueFilter);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Archive</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All archived tasks across every queue — restore them at any time
          </p>
        </div>
        <div className="text-2xl font-bold" style={{ color: HX.purple }}>
          {allArchived.length}
          <span className="text-sm font-normal text-gray-400 ml-1">archived</span>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="px-6 py-3 border-b flex items-center gap-4 flex-shrink-0"
        style={{ background: HX.purplePale }}
      >
        <label className="text-sm font-medium text-gray-600">Filter by queue:</label>
        <select
          value={queueFilter}
          onChange={e => setQueueFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2"
          style={{ focusRingColor: HX.purple }}
        >
          <option value="all">All queues ({allArchived.length})</option>
          {queues.map(q => {
            const count = (taskData[q.id] ?? []).filter(t => t.archived).length;
            return (
              <option key={q.id} value={q.id}>
                {q.name} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
          <div className="text-5xl mb-3">📦</div>
          <div className="font-medium text-gray-500">No archived tasks</div>
          <div className="text-sm text-gray-400 mt-1">
            {queueFilter === "all"
              ? "Archive tasks from any queue using the 📦 button on a task row."
              : "No archived tasks in this queue yet."}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead className="sticky top-0 bg-gray-50 border-b z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Queue</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Completed by</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Completed at</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Restore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task, idx) => (
                <tr key={`${task._queueId}-${task._id}`} className={`opacity-75 ${idx % 2 === 1 ? "bg-gray-50" : ""}`}>

                  {/* Queue */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: HX.purplePale, color: HX.purple }}
                    >
                      <span>{task._queueIcon}</span>
                      {task._queueName}
                    </span>
                  </td>

                  {/* Reference (first meaningful column for that queue) */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-medium text-sm">
                    {task._firstCol ? task[task._firstCol] : task._id}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={task.status} />
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-xs truncate">
                    {task.notes || <span className="italic text-gray-300">—</span>}
                  </td>

                  {/* Completed by */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-sm font-medium">
                    {task.completed_by ?? task.archived_by ?? "—"}
                  </td>

                  {/* Completed at */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                    {(task.completed_at ?? task.archived_at)
                      ? new Date(task.completed_at ?? task.archived_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </td>

                  {/* Restore */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onRestore(task._queueId, task._id)}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:opacity-80"
                      style={{ borderColor: HX.purpleLight, color: HX.purple, background: "white" }}
                    >
                      ↩ Restore
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
