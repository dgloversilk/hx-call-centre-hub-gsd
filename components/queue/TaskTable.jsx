"use client";

import { useState, useRef, useEffect } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";
import Tag from "@/components/ui/Tag";

const STATUS_OPTIONS = Object.entries(STATUS_CFG).filter(([k]) => !["completed", "escalated"].includes(k));

/** Coloured pill that opens a custom status dropdown on click. */
function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CFG[value] ?? STATUS_CFG.pending;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1"
        style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
      >
        {cfg.label} <span style={{ opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-40">
          {STATUS_OPTIONS.map(([k, v]) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false); }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
            >
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}
              >
                {v.label}
              </span>
              {k === value && <span className="ml-auto text-xs" style={{ color: HX.purple }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Group consecutive tasks by chips_reference for visual clustering. */
function groupByRef(tasks) {
  const groups = [];
  tasks.forEach(task => {
    const ref  = task.chips_reference ?? "";
    const last = groups[groups.length - 1];
    if (last && last.ref === ref) last.tasks.push(task);
    else groups.push({ ref, tasks: [task] });
  });
  return groups;
}

/** Human-readable age from error_time or created_at. */
function ageText(task) {
  const raw = task.error_time ?? task.created_at;
  if (!raw) return null;
  const days = Math.floor((Date.now() - new Date(raw)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function AgeCell({ task }) {
  const text = ageText(task);
  if (!text) return <span className="text-gray-300 text-xs">—</span>;
  const color = text === "Today" ? "#D97706" : text === "Yesterday" ? "#6B7280" : HX.red;
  return <span className="text-xs font-medium whitespace-nowrap" style={{ color }}>{text}</span>;
}

function AssignedCell({ name }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const first    = name.split(" ")[0];
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

const YES_NO_CYCLE = { null: "Yes", Yes: "No", No: null };
const YES_NO_STYLE = {
  Yes: { background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7" },
  No:  { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" },
};

function YesNoToggle({ value, onChange }) {
  const next  = YES_NO_CYCLE[String(value)];
  const style = YES_NO_STYLE[value] ?? { color: "#9CA3AF", border: "1px solid #E5E7EB" };
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(next ?? null); }}
      className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
      style={style}
    >
      {value ?? "—"}
    </button>
  );
}

/** Renders a single data cell for a display column. */
function DataCell({ colKey, val, isFirstInGroup, isMulti, groupCount }) {
  if (colKey === "chips_reference") {
    if (isFirstInGroup && isMulti) return (
      <span className="flex items-center gap-2">
        <span className="text-gray-700 text-sm">{val}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: HX.purplePale, color: HX.purple, border: `1px solid ${HX.purpleLight}` }}
          title={`${groupCount} errors for this reference`}
        >×{groupCount}</span>
      </span>
    );
    if (!isFirstInGroup) return <span className="text-gray-300 text-xs pl-2">↳</span>;
  }
  if (val === "Yes" || val === "No") return <Tag yes={val === "Yes"} />;
  if (colKey === "error_type" || colKey === "booking_action")
    return <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{val}</span>;
  return <span className="text-gray-700 text-sm">{val}</span>;
}

export default function TaskTable({
  queue, tasks, onUpdateTask, onOpenNotes, onArchive, onRowClick,
  selectMode, selectedRows, onSelectRow, onSelectAll, user,
}) {
  const displayCols  = queue.displayCols ?? [];
  const customFields = queue.customFields ?? [];
  const customFieldMap = Object.fromEntries(customFields.map(f => [f.key, f]));
  const allSelected = tasks.length > 0 && tasks.every(t => selectedRows?.has(t._id));

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-3">✅</div>
        <div className="font-medium text-gray-500">No tasks match this filter</div>
      </div>
    );
  }

  const groups     = groupByRef(tasks);
  let   groupIndex = 0;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead className="sticky top-0 bg-gray-50 border-b z-10 shadow-sm">
          <tr>
            {selectMode && (
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll?.()}
                  className="rounded cursor-pointer"
                  style={{ accentColor: HX.purple }}
                />
              </th>
            )}
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
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {groups.map(group => {
            const isShaded = groupIndex++ % 2 === 1;
            const isMulti  = group.tasks.length > 1;
            const groupBg  = isShaded ? "#F9FAFB" : "";

            return group.tasks.map((task, rowIdx) => {
              const isSelected     = selectedRows?.has(task._id);
              const isDetailRow    = task._id === (selectMode ? null : undefined); // detail highlight only in normal mode
              const isFirstInGroup = rowIdx === 0;
              const statusBg       = STATUS_CFG[task.status]?.bg ?? groupBg;
              const rowBg          = isSelected ? "#EDE9F8" : statusBg;
              const borderStyle    = isFirstInGroup && isMulti ? { borderTop: `2px solid ${HX.purpleLight}` } : {};

              const handleClick = selectMode
                ? () => onSelectRow?.(task._id)
                : () => onRowClick?.(task);

              return (
                <tr
                  key={task._id}
                  style={{ background: rowBg, cursor: "pointer" }}
                  className="group transition-colors"
                  onClick={handleClick}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = rowBg; }}
                >
                  {selectMode && (
                    <td className="px-3 py-3 w-8" style={borderStyle} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected ?? false}
                        onChange={() => onSelectRow?.(task._id)}
                        className="rounded cursor-pointer"
                        style={{ accentColor: HX.purple }}
                      />
                    </td>
                  )}

                  {displayCols.map(key => {
                    const cf = customFieldMap[key];
                    return (
                      <td key={key} className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => cf && e.stopPropagation()}>
                        {cf?.type === "yesno" ? (
                          <YesNoToggle
                            value={task[key] ?? null}
                            onChange={val => onUpdateTask(task._id, { [key]: val })}
                          />
                        ) : cf?.type === "text" ? (
                          <span
                            className="text-xs text-gray-600 italic cursor-text"
                            title="Click in the detail panel to edit"
                          >
                            {task[key] || "—"}
                          </span>
                        ) : (
                          <DataCell
                            colKey={key}
                            val={task[key] ?? ""}
                            isFirstInGroup={isFirstInGroup}
                            isMulti={isMulti}
                            groupCount={group.tasks.length}
                          />
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-3" style={borderStyle}><AgeCell task={task} /></td>
                  <td className="px-4 py-3" style={borderStyle}><AssignedCell name={task.assigned_to} /></td>

                  <td className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <StatusSelect value={task.status} onChange={status => onUpdateTask(task._id, { status })} />
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenNotes(task)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={task.notes
                        ? { borderColor: HX.purpleLight, background: HX.purplePale, color: HX.purple }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }}
                    >
                      {task.notes ? "📝 View" : "+ Add"}
                    </button>
                  </td>

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

                  <td className="px-2 py-3 w-10 text-right" style={borderStyle} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onRowClick?.(task)}
                      title="Open details"
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg font-bold text-base"
                      style={{ background: "transparent", color: HX.purple }}
                      onMouseEnter={e => { e.currentTarget.style.background = HX.purple; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = HX.purple; }}
                    >
                      ⟩
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
