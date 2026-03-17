"use client";

import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";
import Tag from "@/components/ui/Tag";

/**
 * Group consecutive tasks by chips_reference so that multiple errors
 * for the same booking are visually clustered.
 */
function groupByRef(tasks) {
  const groups = [];
  tasks.forEach(task => {
    const ref = task.chips_reference ?? "";
    const last = groups[groups.length - 1];
    if (last && last.ref === ref) last.tasks.push(task);
    else groups.push({ ref, tasks: [task] });
  });
  return groups;
}

/** Human-readable age string based on error_time or created_at. */
function ageText(task) {
  const dateStr = task.error_time ?? task.created_at;
  if (!dateStr) return null;
  try {
    const days = Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch { return null; }
}

function AgeCell({ task }) {
  const text = ageText(task);
  if (!text) return <span className="text-gray-300 text-xs">—</span>;
  const color = text === "Today" ? "#D97706"
    : text === "Yesterday"      ? "#6B7280"
    : HX.red;
  return <span className="text-xs font-medium whitespace-nowrap" style={{ color }}>{text}</span>;
}

function AssignedCell({ name }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>;
  const first = name.split(" ")[0];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: HX.purplePale, color: HX.purple, border: `1px solid ${HX.purpleLight}` }}
      title={name}
    >
      <span className="font-bold">{initials}</span>
      <span className="hidden lg:inline">{first}</span>
    </span>
  );
}

export default function TaskTable({
  queue, tasks, onUpdateTask, onOpenNotes, onArchive, onRowClick, selectedTaskId,
  selectedRows, onSelectRow, onSelectAll, user,
}) {
  const displayCols = queue.displayCols ?? [];
  const allSelected = tasks.length > 0 && tasks.every(t => selectedRows?.has(t._id));

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-3">✅</div>
        <div className="font-medium text-gray-500">No tasks match this filter</div>
      </div>
    );
  }

  const groups = groupByRef(tasks);
  let groupIndex = 0;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead className="sticky top-0 bg-gray-50 border-b z-10 shadow-sm">
          <tr>
            {/* Select-all checkbox */}
            <th className="px-3 py-3 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onSelectAll?.()}
                className="rounded cursor-pointer"
                style={{ accentColor: HX.purple }}
              />
            </th>

            {displayCols.map(key => (
              <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {key.replace(/_/g, " ")}
              </th>
            ))}

            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Retry</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {groups.map(group => {
            const isShaded = groupIndex++ % 2 === 1;
            const isMulti = group.tasks.length > 1;
            const groupBg = isShaded ? "#F9FAFB" : "";

            return group.tasks.map((task, rowIdx) => {
              const isSelected  = selectedRows?.has(task._id);
              const isDetailRow = task._id === selectedTaskId;
              const isFirstInGroup = rowIdx === 0;
              const rowBg = isDetailRow ? HX.purplePale
                : isSelected ? "#EDE9F8"
                : groupBg;
              const borderStyle = isFirstInGroup && isMulti ? { borderTop: `2px solid ${HX.purpleLight}` } : {};

              return (
                <tr
                  key={task._id}
                  style={{ background: rowBg, cursor: "pointer" }}
                  className="transition-colors"
                  onClick={() => onRowClick?.(task)}
                  onMouseEnter={e => { if (!isDetailRow && !isSelected) e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { if (!isDetailRow && !isSelected) e.currentTarget.style.background = rowBg; }}
                >
                  {/* Checkbox — stops row-click from toggling */}
                  <td className="px-3 py-3 w-8" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected ?? false}
                      onChange={() => onSelectRow?.(task._id)}
                      className="rounded cursor-pointer"
                      style={{ accentColor: HX.purple }}
                    />
                  </td>

                  {displayCols.map((key) => {
                    const val = task[key] ?? "";
                    const isYesNo = val === "Yes" || val === "No";
                    const isRefCol = key === "chips_reference";

                    return (
                      <td key={key} className="px-4 py-3 whitespace-nowrap" style={borderStyle}>
                        {isRefCol && isFirstInGroup && isMulti ? (
                          <span className="flex items-center gap-2">
                            <span className="text-gray-700 text-sm">{val}</span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: HX.purplePale, color: HX.purple, border: `1px solid ${HX.purpleLight}` }}
                              title={`${group.tasks.length} errors for this reference`}
                            >×{group.tasks.length}</span>
                          </span>
                        ) : isRefCol && !isFirstInGroup ? (
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

                  {/* Age */}
                  <td className="px-4 py-3" style={borderStyle}><AgeCell task={task} /></td>

                  {/* Assigned */}
                  <td className="px-4 py-3" style={borderStyle}><AssignedCell name={task.assigned_to} /></td>

                  {/* Status dropdown */}
                  <td className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => e.stopPropagation()}>
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

                  {/* Notes */}
                  <td className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenNotes(task)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={task.notes
                        ? { borderColor: HX.purpleLight, background: HX.purplePale, color: HX.purple }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }
                      }
                    >
                      {task.notes ? "📝 View" : "+ Add"}
                    </button>
                  </td>

                  {/* Retry */}
                  <td className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <button
                      disabled
                      title="Smart Retry — coming soon"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-not-allowed opacity-50"
                      style={{ borderColor: HX.green, color: HX.green, background: HX.greenPale }}
                    >
                      ↺ Retry
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
