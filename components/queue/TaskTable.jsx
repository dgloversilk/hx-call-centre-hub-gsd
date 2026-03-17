"use client";

import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";
import Tag from "@/components/ui/Tag";

/**
 * Group consecutive tasks by chips_reference so that multiple errors
 * for the same booking are visually clustered.
 *
 * Returns an array of groups: { ref, tasks[] }
 */
function groupByRef(tasks) {
  const groups = [];
  tasks.forEach(task => {
    const ref = task.chips_reference ?? "";
    const last = groups[groups.length - 1];
    if (last && last.ref === ref) {
      last.tasks.push(task);
    } else {
      groups.push({ ref, tasks: [task] });
    }
  });
  return groups;
}

export default function TaskTable({ queue, tasks, onUpdateTask, onOpenNotes, onArchive }) {
  const displayCols = queue.displayCols ?? [];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-3">✅</div>
        <div className="font-medium text-gray-500">No tasks match this filter</div>
      </div>
    );
  }

  const groups = groupByRef(tasks);
  // Alternate shading per group (not per row)
  let groupIndex = 0;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead className="sticky top-0 bg-gray-50 border-b z-10 shadow-sm">
          <tr>
            {displayCols.map(key => (
              <th
                key={key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {key.replace(/_/g, " ")}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {groups.map(group => {
            const isShaded = groupIndex++ % 2 === 1;
            const isMulti = group.tasks.length > 1;
            const groupBg = isShaded ? "#F9FAFB" : "";

            return group.tasks.map((task, rowIdx) => {
              const isFirstInGroup = rowIdx === 0;
              const isLastInGroup = rowIdx === group.tasks.length - 1;

              return (
                <tr
                  key={task._id}
                  style={{ background: groupBg }}
                  className="transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { e.currentTarget.style.background = groupBg; }}
                >
                  {displayCols.map((key, colIdx) => {
                    const val = task[key] ?? "";
                    const isYesNo = val === "Yes" || val === "No";
                    const isRefCol = key === "chips_reference";

                    return (
                      <td
                        key={key}
                        className="px-4 py-3 whitespace-nowrap"
                        style={
                          isFirstInGroup && isMulti
                            ? { borderTop: `2px solid ${HX.purpleLight}` }
                            : isMulti && isLastInGroup && colIdx === 0
                            ? {}
                            : {}
                        }
                      >
                        {/* On the first row of a multi-error group, show ref + error count badge */}
                        {isRefCol && isFirstInGroup && isMulti ? (
                          <span className="flex items-center gap-2">
                            <span className="text-gray-700 text-sm">{val}</span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: HX.purplePale, color: HX.purple, border: `1px solid ${HX.purpleLight}` }}
                              title={`${group.tasks.length} errors for this reference`}
                            >
                              ×{group.tasks.length}
                            </span>
                          </span>
                        ) : isRefCol && !isFirstInGroup ? (
                          /* Subsequent rows in group: indent to show continuation */
                          <span className="text-gray-300 text-xs pl-2">↳</span>
                        ) : isYesNo ? (
                          <Tag yes={val === "Yes"} />
                        ) : key === "ref_count" && Number(val) > 1 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{val}</span>
                        ) : key === "error_type" || key === "booking_action" ? (
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{val}</span>
                        ) : (
                          <span className="text-gray-700 text-sm">{val}</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Status dropdown */}
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    style={isFirstInGroup && isMulti ? { borderTop: `2px solid ${HX.purpleLight}` } : {}}
                  >
                    <select
                      value={task.status}
                      onChange={e => onUpdateTask(task._id, { status: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none cursor-pointer"
                    >
                      {Object.entries(STATUS_CFG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Notes button */}
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    style={isFirstInGroup && isMulti ? { borderTop: `2px solid ${HX.purpleLight}` } : {}}
                  >
                    <button
                      onClick={() => onOpenNotes(task)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={
                        task.notes
                          ? { borderColor: HX.purpleLight, background: HX.purplePale, color: HX.purple }
                          : { borderColor: "#E5E7EB", color: "#6B7280" }
                      }
                    >
                      {task.notes ? "📝 View" : "+ Add"}
                    </button>
                  </td>

                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
