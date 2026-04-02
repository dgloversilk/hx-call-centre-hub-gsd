"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, isManager, MOCK_USERS } from "@/lib/constants";
import TakeTasks from "@/components/my-tasks/TakeTasks";
import TaskDetailPanel from "@/components/queue/TaskDetailPanel";
import NotesPanel from "@/components/queue/NotesPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_URGENCY = { blocked: 0, escalated: 0, in_progress: 1, pending: 2 };

const URGENCY = {
  overdue: { bar: HX.red,    bg: "#FEF2F2", color: HX.redDark,  label: "Overdue"  },
  today:   { bar: "#F59E0B", bg: "#FFFBEB", color: "#92400E",   label: "Today"    },
  future:  { bar: "#D1D5DB", bg: "#F9FAFB", color: "#9CA3AF",   label: null       },
  neutral: { bar: "#E5E7EB", bg: "#F9FAFB", color: "#9CA3AF",   label: null       },
};

function getUrgency(task) {
  const raw = task.start_date ?? task.booking_date ?? task.error_time ?? task.stay_date;
  if (!raw) return "neutral";
  const today = new Date().toISOString().slice(0, 10);
  const d = raw.slice(0, 10);
  if (d < today) return "overdue";
  if (d === today) return "today";
  return "future";
}

function fmtDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function primaryRef(task, queue) {
  if (queue?.primaryKey && task[queue.primaryKey]) return task[queue.primaryKey];
  return task.chips_reference ?? task.ref ?? task.email ?? task._id;
}

function taskDetail(task) {
  return task.error_type ?? task.error_code ?? task.category ?? task.booking_platform ?? "";
}

function taskDate(task) {
  return task.start_date ?? task.booking_date ?? task.error_time ?? task.stay_date ?? null;
}

function sortKey(task, priority) {
  const u = STATUS_URGENCY[task.status] ?? 3;
  const d = taskDate(task) ?? "9999";
  return [u, d.slice(0, 10), priority];
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);

// ── Stat chip ─────────────────────────────────────────────────────────────────

function Chip({ count, label, color, bg, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-4 py-2 rounded-xl border transition-all"
      style={{
        background: active ? bg : "white",
        borderColor: active ? color : "#E5E7EB",
        cursor: onClick ? "pointer" : "default",
        opacity: count === 0 ? 0.4 : 1,
      }}
    >
      <span className="text-xl font-bold leading-none" style={{ color }}>{count}</span>
      <span className="text-xs mt-0.5 font-medium" style={{ color: active ? color : "#6B7280" }}>{label}</span>
    </button>
  );
}

// ── Team strip (manager only) ─────────────────────────────────────────────────

function TeamStrip({ queues, taskData, currentUser }) {
  const agents = useMemo(() => {
    return MOCK_USERS.map(u => {
      let total = 0, attention = 0, inProgress = 0, doneToday = 0;
      queues.forEach(q => {
        (taskData[q.id] ?? []).forEach(t => {
          if (t.archived) return;
          if (t.assigned_to === u.name) {
            total++;
            if (t.status === "blocked" || t.status === "escalated") attention++;
            if (t.status === "in_progress") inProgress++;
          }
          if ((t.status === "done" || t.status === "completed") &&
              t.status_updated_by === u.name &&
              t.status_updated_at?.slice(0, 10) === TODAY_ISO) {
            doneToday++;
          }
        });
      });
      return { ...u, total, attention, inProgress, doneToday };
    });
  }, [queues, taskData]);

  return (
    <div className="flex items-center gap-2 pb-4 overflow-x-auto flex-shrink-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Team</span>
      {agents.map(a => (
        <div key={a.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: a.id === currentUser?.id ? HX.purple : "#94A3B8" }}>
            {a.initials}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 leading-none">
              {a.name.split(" ")[0]}
              {a.id === currentUser?.id && <span className="ml-1 text-gray-400">(you)</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5 leading-none">
              {a.total > 0 ? `${a.total} task${a.total !== 1 ? "s" : ""}` : "clear"}
              {a.doneToday > 0 && <span className="ml-1.5" style={{ color: HX.green }}>· {a.doneToday} done</span>}
              {a.attention > 0 && <span className="ml-1.5" style={{ color: HX.red }}>· {a.attention}⚠</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Queue filter chips ────────────────────────────────────────────────────────

function QueueFilter({ queues, taskData, user, activeQueue, onChange }) {
  const counts = useMemo(() => {
    const out = { all: 0 };
    queues.forEach(q => {
      const tasks = (taskData[q.id] ?? []).filter(t => !t.archived && t.assigned_to === user?.name);
      out[q.id] = tasks.length;
      out.all += tasks.length;
    });
    return out;
  }, [queues, taskData, user]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
      <button
        onClick={() => onChange(null)}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
        style={{
          background: !activeQueue ? HX.purplePale : "white",
          borderColor: !activeQueue ? HX.purple : "#E5E7EB",
          color: !activeQueue ? HX.purple : "#6B7280",
        }}
      >
        All {counts.all > 0 && <span className="ml-1">{counts.all}</span>}
      </button>
      {queues.filter(q => counts[q.id] > 0).map(q => (
        <button
          key={q.id}
          onClick={() => onChange(activeQueue === q.id ? null : q.id)}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={{
            background: activeQueue === q.id ? HX.purplePale : "white",
            borderColor: activeQueue === q.id ? HX.purple : "#E5E7EB",
            color: activeQueue === q.id ? HX.purple : "#6B7280",
          }}
        >
          {q.icon} {q.name} {counts[q.id]}
        </button>
      ))}
    </div>
  );
}

// ── Spotlight card (active task) ──────────────────────────────────────────────

function SpotlightCard({ item, user, updateTask, onNext, onClose, onOpenPanel, onOpenNotes, taskIdx, totalTasks }) {
  const { task, queue } = item;
  const scfg      = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const urgency   = getUrgency(task);
  const ucfg      = URGENCY[urgency];
  const dateStr   = fmtDate(taskDate(task));
  const isAttn    = task.status === "blocked" || task.status === "escalated";
  const isDone    = task.status === "done" || task.status === "completed";
  const isWorking = task.status === "in_progress";

  return (
    <div className="rounded-xl border-2 mb-4 overflow-hidden flex-shrink-0"
      style={{ borderColor: isAttn ? HX.red : isWorking ? HX.blue : HX.purple }}>

      {/* Header strip */}
      <div className="px-4 py-2.5 flex items-center gap-2.5"
        style={{ background: isAttn ? HX.redPale : isWorking ? HX.bluePale : HX.purplePale }}>
        <span className="text-base">{queue.icon}</span>
        <span className="text-xs font-bold" style={{ color: isAttn ? HX.redDark : isWorking ? HX.blueDark : HX.purple }}>
          {queue.name}
        </span>
        <span className="text-xs opacity-50" style={{ color: HX.purple }}>
          #{taskIdx + 1} of {totalTasks}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
            style={{ background: scfg.bg, color: scfg.color, borderColor: scfg.border }}>
            {scfg.label}
          </span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded">
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-start gap-4">
          {/* Left: reference + detail + date */}
          <div className="flex-shrink-0 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-gray-900 text-base leading-tight">
                {primaryRef(task, queue)}
              </span>
              {dateStr && (
                <span className="text-xs text-gray-400">{dateStr}</span>
              )}
              {ucfg.label && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ background: ucfg.bg, color: ucfg.color }}>
                  {ucfg.label}
                </span>
              )}
            </div>
            {taskDetail(task) && (
              <div className="text-xs text-gray-500 mt-0.5">{taskDetail(task)}</div>
            )}
            {task.notes && (
              <div className="mt-1.5 flex items-start gap-1 text-xs text-gray-500 max-w-xs">
                <span>📝</span>
                <span className="italic truncate">{task.notes}</span>
              </div>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="ml-auto flex flex-wrap gap-1.5 items-center flex-shrink-0">
            {!isWorking && !isDone && (
              <button onClick={() => updateTask(queue.id, task._id, { status: "in_progress" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: HX.blue }}>
                ▶ Start
              </button>
            )}
            {!isDone && (
              <button onClick={() => updateTask(queue.id, task._id, {
                  status: "done", completed_by: user?.name, completed_at: new Date().toISOString()
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: HX.green }}>
                ✅ Done
              </button>
            )}
            {!isAttn && !isDone && (
              <button onClick={() => updateTask(queue.id, task._id, { status: "blocked" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ background: HX.redPale, color: HX.redDark, borderColor: HX.redLight }}>
                ⚠ Flag
              </button>
            )}
            {isAttn && (
              <button onClick={() => updateTask(queue.id, task._id, { status: "in_progress" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ background: HX.bluePale, color: HX.blueDark, borderColor: HX.blueLight }}>
                ↩ Resume
              </button>
            )}
            <button onClick={() => onOpenNotes(task, queue)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ background: HX.purplePale, color: HX.purple, borderColor: HX.purpleLight }}>
              📝 {task.notes ? "Notes" : "+ Note"}
            </button>
            <button onClick={onOpenPanel}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
              Full details
            </button>
            <button onClick={onNext}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: HX.purple }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Task row with hover actions ───────────────────────────────────────────────

function TaskRow({ item, idx, isSelected, onSelect, updateTask, user }) {
  const { task, queue } = item;
  const [hovered, setHovered]   = useState(false);
  const scfg    = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const urgency = getUrgency(task);
  const ucfg    = URGENCY[urgency];
  const date    = taskDate(task);
  const isAttn  = task.status === "blocked" || task.status === "escalated";
  const isDone  = task.status === "done" || task.status === "completed";
  const isWork  = task.status === "in_progress";

  return (
    <tr
      onClick={() => onSelect(task, queue)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer transition-colors group"
      style={{ background: isSelected ? HX.purplePale : hovered ? "#F9FAFB" : scfg.bg }}
    >
      {/* Urgency bar */}
      <td className="w-1 p-0">
        <div className="h-full w-1 rounded-sm" style={{ background: ucfg.bar, minHeight: "44px" }} />
      </td>

      {/* Rank */}
      <td className="px-3 py-3 text-center w-8">
        <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
      </td>

      {/* Queue */}
      <td className="px-3 py-3 w-32">
        <div className="flex items-center gap-1">
          <span className="text-sm">{queue.icon}</span>
          <span className="text-xs font-medium text-gray-600 leading-tight truncate max-w-20">{queue.name}</span>
        </div>
      </td>

      {/* Reference + detail */}
      <td className="px-3 py-3 min-w-0">
        <div className="font-mono text-xs font-bold text-gray-800 leading-tight">
          {primaryRef(task, queue)}
        </div>
        {taskDetail(task) && (
          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-48">{taskDetail(task)}</div>
        )}
        {task.notes && (
          <div className="text-xs text-gray-400 mt-0.5 italic truncate max-w-48">📝 {task.notes}</div>
        )}
      </td>

      {/* Date + urgency */}
      <td className="px-3 py-3 whitespace-nowrap w-36">
        {date ? (
          <div>
            <div className="text-xs text-gray-500">{fmtDate(date)}</div>
            {ucfg.label && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                style={{ background: ucfg.bg, color: ucfg.color }}>
                {ucfg.label}
              </span>
            )}
          </div>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Status + hover quick actions */}
      <td className="px-3 py-3 w-44">
        {hovered ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {!isWork && !isDone && (
              <button onClick={() => updateTask(queue.id, task._id, { status: "in_progress" })}
                className="px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap"
                style={{ background: HX.blue }}>▶ Start</button>
            )}
            {!isDone && (
              <button onClick={() => updateTask(queue.id, task._id, {
                  status: "done", completed_by: user?.name, completed_at: new Date().toISOString()
                })}
                className="px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap"
                style={{ background: HX.green }}>✅</button>
            )}
            {!isAttn && !isDone && (
              <button onClick={() => updateTask(queue.id, task._id, { status: "blocked" })}
                className="px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap"
                style={{ background: HX.redPale, color: HX.redDark, borderColor: HX.redLight }}>⚠</button>
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
            style={{ background: scfg.bg, color: scfg.color, borderColor: scfg.border }}>
            {scfg.label}
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Available to pull section ─────────────────────────────────────────────────

function AvailableSection({ queues, taskData, user, updateTask, manager, onClaim }) {
  const [collapsed, setCollapsed] = useState(false);

  const available = useMemo(() => {
    const flat = [];
    queues.forEach((q, priority) => {
      (taskData[q.id] ?? [])
        .filter(t => !t.archived && !t.assigned_to && t.status === "pending")
        .forEach(t => flat.push({ task: t, queue: q, priority }));
    });
    return flat.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const da = (taskDate(a.task) ?? "9999").slice(0, 10);
      const db = (taskDate(b.task) ?? "9999").slice(0, 10);
      return da.localeCompare(db);
    }).slice(0, 8);
  }, [queues, taskData]);

  if (!available.length) return null;

  const claim = (queue, task) => {
    updateTask(queue.id, task._id, {
      status:      "in_progress",
      assigned_to: user?.name,
      assigned_by: user?.name,
      assigned_at: new Date().toISOString(),
    });
    onClaim?.(queue, task);
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 mb-3 group"
      >
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Available to pull
        </span>
        <span className="text-xs text-gray-400">{available.length} unassigned</span>
        <span className="text-xs text-gray-300 ml-1">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Queue</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Reference</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Detail</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {available.map(({ task, queue, priority }) => {
                const date    = taskDate(task);
                const urgency = getUrgency(task);
                const ucfg    = URGENCY[urgency];
                return (
                  <tr key={task._id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span>{queue.icon}</span>
                        <span className="text-xs text-gray-500">{queue.name}</span>
                        <span className="text-xs font-bold opacity-40" style={{ color: HX.purple }}>#{priority + 1}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">
                      {primaryRef(task, queue)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-40">
                      {taskDetail(task) || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {date ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">{fmtDate(date)}</span>
                          {ucfg.label && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: ucfg.bg, color: ucfg.color }}>
                              {ucfg.label}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => claim(queue, task)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: HX.purple }}>
                        ⚡ Claim
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-gray-50 text-xs text-gray-400 bg-gray-50">
            Claiming a task assigns it to you and marks it as In Progress. Hover to reveal.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyTasks({ queues, taskData, user, onUpdateTask, onNavigateToQueue }) {
  const [selected,       setSelected]       = useState(null);
  const [notesTask,      setNotesTask]      = useState(null);
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [panelExpanded,  setPanelExpanded]  = useState(false);
  const [queueFilter, setQueueFilter] = useState(null);
  const manager = isManager(user);

  // Centralised update: always stamps who/when
  const updateTask = useCallback((queueId, taskId, updates) => {
    onUpdateTask(queueId, taskId, {
      ...updates,
      status_updated_by: user?.name,
      status_updated_at: new Date().toISOString(),
    }, user);
  }, [onUpdateTask, user]);

  // All MY tasks, globally sorted: urgency → queue priority → date
  const allTasks = useMemo(() => {
    const flat = [];
    queues.forEach((q, priority) => {
      (taskData[q.id] ?? [])
        .filter(t => !t.archived && t.assigned_to === user?.name)
        .forEach(t => flat.push({ task: t, queue: q, priority }));
    });
    return flat.sort((a, b) => {
      const [ua, da, pa] = sortKey(a.task, a.priority);
      const [ub, db, pb] = sortKey(b.task, b.priority);
      if (ua !== ub) return ua - ub;  // urgency first (blocked > in_progress > pending)
      if (pa !== pb) return pa - pb;  // then queue priority
      if (da !== db) return da.localeCompare(db); // then date
      return 0;
    });
  }, [queues, taskData, user]);

  // Filtered view
  const filteredTasks = useMemo(() =>
    queueFilter ? allTasks.filter(t => t.queue.id === queueFilter) : allTasks,
    [allTasks, queueFilter]
  );

  // Stats: done today across all queues
  const stats = useMemo(() => {
    let doneToday = 0, attention = 0, inProgress = 0, pending = 0;
    let overdue = 0, today = 0, future = 0;

    queues.forEach(q => {
      (taskData[q.id] ?? []).forEach(t => {
        if (t.archived) return;
        // Count done today
        if ((t.status === "done" || t.status === "completed") &&
            t.status_updated_by === user?.name &&
            t.status_updated_at?.slice(0, 10) === TODAY_ISO) {
          doneToday++;
        }
        // My active task stats
        if (t.assigned_to === user?.name) {
          if (t.status === "blocked" || t.status === "escalated") attention++;
          else if (t.status === "in_progress") inProgress++;
          else if (t.status === "pending") pending++;

          const urg = getUrgency(t);
          if (urg === "overdue") overdue++;
          else if (urg === "today") today++;
          else future++;
        }
      });
    });

    const total = allTasks.length + doneToday;
    const pct   = total > 0 ? Math.round((doneToday / total) * 100) : 0;
    return { doneToday, attention, inProgress, pending, overdue, today, future, total, pct };
  }, [queues, taskData, user, allTasks]);

  const selectTask = (task, queue) => {
    if (selected?.task._id === task._id) {
      setSelected(null); setPanelOpen(false);
    } else {
      setSelected({ task, queue }); setPanelOpen(true);
    }
  };

  const goNext = () => {
    if (!filteredTasks.length) return;
    if (!selected) { setSelected(filteredTasks[0]); setPanelOpen(true); return; }
    const idx  = filteredTasks.findIndex(t => t.task._id === selected.task._id);
    const next = filteredTasks[(idx + 1) % filteredTasks.length];
    setSelected(next); setPanelOpen(true);
  };

  // Live-sync selected with task data
  const liveSelected = useMemo(() => {
    if (!selected) return null;
    const live = (taskData[selected.queue.id] ?? []).find(t => t._id === selected.task._id);
    return live ? { task: live, queue: selected.queue } : null;
  }, [selected, taskData]);

  const selectedIdx = liveSelected
    ? filteredTasks.findIndex(t => t.task._id === liveSelected.task._id)
    : -1;

  const openNotes = (task, queue) => {
    const q = queue ?? liveSelected?.queue;
    setNotesTask({ task, queue: q });
  };

  // Empty state
  if (!allTasks.length && stats.doneToday === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-xl font-bold text-gray-700">All clear!</div>
        <div className="text-sm text-gray-400 mt-1 mb-6">No tasks assigned to you right now.</div>
        <div className="text-xs text-gray-400">Check the Available to pull section below for new work.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Take Tasks ─────────────────────────────────────────────────────── */}
      <TakeTasks queues={queues} taskData={taskData} user={user} onUpdateTask={onUpdateTask} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Work top to bottom — sorted by urgency, then date
            </p>
          </div>
          <button
            onClick={goNext}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0"
            style={{ background: HX.purple }}>
            {selected ? "Next task →" : "▶ Start working"}
          </button>
        </div>

        {/* Queue filter chips */}
        <QueueFilter
          queues={queues}
          taskData={taskData}
          user={user}
          activeQueue={queueFilter}
          onChange={setQueueFilter}
        />
      </div>

      {/* ── Main content area (flex row) ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Left: task list — hidden when panel is expanded */}
        {!(panelExpanded && panelOpen && liveSelected) && (
        <div className="flex-1 min-w-0 overflow-y-auto pr-0">

          {/* Spotlight card */}
          {liveSelected && (
            <SpotlightCard
              item={liveSelected}
              user={user}
              updateTask={updateTask}
              onNext={goNext}
              onClose={() => { setSelected(null); setPanelOpen(false); }}
              onOpenPanel={() => setPanelOpen(p => !p)}
              onOpenNotes={openNotes}
              taskIdx={selectedIdx}
              totalTasks={filteredTasks.length}
            />
          )}

          {/* My tasks table */}
          {filteredTasks.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  My Tasks
                </span>
                <span className="text-xs text-gray-400">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                  {queueFilter && " in this queue"}
                  {" · hover a row for quick actions"}
                </span>
              </div>
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: "4px" }} />
                  <col style={{ width: "36px" }} />
                  <col style={{ width: "128px" }} />
                  <col />
                  <col style={{ width: "144px" }} />
                  <col style={{ width: "176px" }} />
                </colgroup>
                <thead className="border-b border-gray-100">
                  <tr>
                    <th />
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Queue</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Reference / Detail</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.map((item, idx) => (
                    <TaskRow
                      key={item.task._id}
                      item={item}
                      idx={idx}
                      isSelected={liveSelected?.task._id === item.task._id}
                      onSelect={selectTask}
                      updateTask={updateTask}
                      user={user}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-gray-600">All clear in this queue</div>
              <button onClick={() => setQueueFilter(null)}
                className="mt-2 text-xs underline text-gray-400">Show all queues</button>
            </div>
          )}

          {/* Available to pull */}
          <AvailableSection
            queues={queues}
            taskData={taskData}
            user={user}
            updateTask={updateTask}
            manager={manager}
            onClaim={(queue, task) => {
              setSelected({ task, queue });
              setPanelOpen(true);
            }}
          />
        </div>
        )}

        {/* Right: detail panel (sidebar or expanded) */}
        {liveSelected && panelOpen && (
          <div className={`${panelExpanded ? "flex-1" : "w-[480px]"} flex-shrink-0 overflow-y-auto ${panelExpanded ? "" : "ml-4"}`}>
            <TaskDetailPanel
              task={liveSelected.task}
              queue={liveSelected.queue}
              user={user}
              allTasks={taskData[liveSelected.queue.id] ?? []}
              onUpdateTask={(taskId, updates) => updateTask(liveSelected.queue.id, taskId, updates)}
              onClose={() => { setPanelOpen(false); setPanelExpanded(false); }}
              onOpenNotes={(t) => openNotes(t, liveSelected.queue)}
              expanded={panelExpanded}
              onToggleExpand={() => setPanelExpanded(e => !e)}
            />
          </div>
        )}
      </div>

      {/* Notes panel */}
      {notesTask && (
        <NotesPanel
          task={notesTask.task}
          user={user}
          onSave={updates => updateTask(notesTask.queue.id, notesTask.task._id, updates)}
          onClose={() => setNotesTask(null)}
        />
      )}
    </div>
  );
}
