"use client";

import { HX } from "@/lib/brand";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ArchiveView({ tasks, queue, onRestore }) {
  const displayCols = queue.displayCols ?? [];

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
        <div className="text-5xl mb-3">📦</div>
        <div className="font-medium text-gray-500">No archived tasks</div>
        <div className="text-sm text-gray-400 mt-1">
          Archived tasks will appear here. Use the 📦 button on any row to archive it.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Banner */}
      <div
        className="px-4 py-2 border-b text-xs font-medium flex items-center justify-between"
        style={{ background: HX.yellowLight, color: "#7A6200", borderColor: HX.yellowDark }}
      >
        <span>📦 {tasks.length} archived task{tasks.length !== 1 ? "s" : ""} — these are hidden from the work queue</span>
        <span className="opacity-60">Click Restore to move a task back to the active queue</span>
      </div>

      <table className="w-full text-sm border-collapse min-w-max">
        <thead className="sticky top-0 bg-gray-50 border-b z-10 shadow-sm">
          <tr>
            {displayCols.map(key => (
              <th
                key={key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
              >
                {key.replace(/_/g, " ")}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed by</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed at</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Restore</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {tasks.map((task, idx) => (
            <tr
              key={task._id}
              className={`opacity-70 ${idx % 2 === 1 ? "bg-gray-50" : ""}`}
            >
              {displayCols.map(key => (
                <td key={key} className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                  {task[key] ?? ""}
                </td>
              ))}

              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={task.status} />
              </td>

              <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm font-medium">
                {task.completed_by ?? task.archived_by ?? "—"}
              </td>

              <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                {(task.completed_at ?? task.archived_at)
                  ? new Date(task.completed_at ?? task.archived_at).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => onRestore(task._id)}
                  className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:opacity-80"
                  style={{ borderColor: HX.purpleLight, color: HX.purple, background: HX.purplePale }}
                >
                  ↩ Restore
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
