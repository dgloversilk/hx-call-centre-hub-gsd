"use client";

import { useMemo, useState, useCallback } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";
import TaskFullscreen from "@/components/queue/TaskFullscreen";

const STATUS_URGENCY = { blocked: 0, escalated: 0, in_progress: 1, pending: 2 };

const URGENCY = {
  overdue: { bar: HX.red,    label: "Overdue", bg: "#FEF2F2", color: HX.redDark  },
  today:   { bar: "#F59E0B", label: "Today",   bg: "#FFFBEB", color: "#92400E"   },
  future:  { bar: HX.gray2,  label: null,      bg: HX.gray4,  color: "#9CA3AF"   },
  neutral: { bar: HX.gray2,  label: null,      bg: HX.gray4,  color: "#9CA3AF"   },
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
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

export default function MyTasks({ queues, taskData, user, onUpdateTask }) {
  const [fullscreenId, setFullscreenId] = useState(null);
  const [queueFilter,  setQueueFilter]  = useState(null);

  const updateTask = useCallback((queueId, taskId, updates) => {
    onUpdateTask(queueId, taskId, {
      ...updates,
      status_updated_by: user?.name,
      status_updated_at: new Date().toISOString(),
    }, user);
  }, [onUpdateTask, user]);

  // All my tasks sorted: urgency → queue priority → date
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
      if (ua !== ub) return ua - ub;
      if (pa !== pb) return pa - pb;
      return da.localeCompare(db);
    });
  }, [queues, taskData, user]);

  const filteredTasks = useMemo(() =>
    queueFilter ? allTasks.filter(t => t.queue.id === queueFilter) : allTasks,
    [allTasks, queueFilter]
  );

  // Stats
  const doneToday = useMemo(() => {
    let n = 0;
    queues.forEach(q => {
      (taskData[q.id] ?? []).forEach(t => {
        if ((t.status === "done" || t.status === "completed") &&
            t.status_updated_by === user?.name &&
            t.status_updated_at?.slice(0, 10) === TODAY_ISO) n++;
      });
    });
    return n;
  }, [queues, taskData, user]);

  // Queue filter tabs — only queues that have tasks assigned to me
  const queueCounts = useMemo(() => {
    const out = {};
    queues.forEach(q => {
      out[q.id] = (taskData[q.id] ?? []).filter(t => !t.archived && t.assigned_to === user?.name).length;
    });
    return out;
  }, [queues, taskData, user]);

  // Fullscreen task lookup
  const fullscreenItem = useMemo(() => {
    if (!fullscreenId) return null;
    for (const q of queues) {
      const task = (taskData[q.id] ?? []).find(t => t._id === fullscreenId);
      if (task) return { task, queue: q };
    }
    return null;
  }, [fullscreenId, queues, taskData]);

  // When a task is selected, render it fullscreen in the content area (no overlay, sidebar stays accessible)
  if (fullscreenItem) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <TaskFullscreen
          task={fullscreenItem.task}
          queue={fullscreenItem.queue}
          user={user}
          tasks={filteredTasks.map(i => i.task)}
          onClose={() => setFullscreenId(null)}
          onUpdateTask={(taskId, updates) => updateTask(fullscreenItem.queue.id, taskId, updates)}
          onNavigate={(id) => setFullscreenId(id)}
        />
      </div>
    );
  }

  if (!allTasks.length && doneToday === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-xl font-bold text-gray-700">All clear!</div>
        <div className="text-sm text-gray-400 mt-2">No tasks assigned to you right now.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b bg-white" style={{ borderColor: HX.gray2 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Tasks</h1>
            <p className="text-xs mt-0.5" style={{ color: HX.slate400 }}>
              {allTasks.length} task{allTasks.length !== 1 ? "s" : ""} assigned
              {doneToday > 0 && <span style={{ color: HX.green }}> · {doneToday} completed today</span>}
              {" · "}click any row to open
            </p>
          </div>
        </div>

        {/* Queue filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setQueueFilter(null)}
            className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
            style={!queueFilter
              ? { background: HX.blue, color: "white", borderColor: HX.blue }
              : { background: "white", color: "#6B7280", borderColor: HX.gray2 }
            }
          >
            All ({allTasks.length})
          </button>
          {queues.filter(q => queueCounts[q.id] > 0).map(q => (
            <button
              key={q.id}
              onClick={() => setQueueFilter(queueFilter === q.id ? null : q.id)}
              className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
              style={queueFilter === q.id
                ? { background: HX.blue, color: "white", borderColor: HX.blue }
                : { background: "white", color: "#6B7280", borderColor: HX.gray2 }
              }
            >
              {q.icon} {q.name} ({queueCounts[q.id]})
            </button>
          ))}
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-semibold text-gray-500">Nothing in this queue</div>
            <button onClick={() => setQueueFilter(null)} className="mt-2 text-xs underline" style={{ color: HX.blue }}>
              Show all queues
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: 4 }} />
              <col style={{ width: 32 }} />
              <col style={{ width: 140 }} />
              <col />
              <col style={{ width: 120 }} />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: HX.gray2 }}>
              <tr>
                <th />
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: HX.slate400 }}>#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"   style={{ color: HX.slate400 }}>Queue</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"   style={{ color: HX.slate400 }}>Reference</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"   style={{ color: HX.slate400 }}>Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"   style={{ color: HX.slate400 }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: HX.gray2 }}>
              {filteredTasks.map((item, idx) => (
                <TaskRow
                  key={item.task._id}
                  item={item}
                  idx={idx}
                  isSelected={fullscreenId === item.task._id}
                  onClick={() => setFullscreenId(item.task._id)}
                  updateTask={updateTask}
                  user={user}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TaskRow({ item, idx, isSelected, onClick, updateTask, user }) {
  const { task, queue } = item;
  const scfg   = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const urgency = getUrgency(task);
  const ucfg   = URGENCY[urgency];
  const date   = taskDate(task);
  const detail = taskDetail(task);

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors"
      style={{ background: isSelected ? HX.bluePale : "white" }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = HX.gray4; }}
      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? HX.bluePale : "white"; }}
    >
      {/* Urgency bar */}
      <td className="p-0 w-1">
        <div style={{ width: 3, minHeight: 44, background: ucfg.bar }} />
      </td>

      {/* Rank */}
      <td className="px-3 py-3 text-center">
        <span className="text-xs font-bold" style={{ color: HX.slate400 }}>{idx + 1}</span>
      </td>

      {/* Queue */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{queue.icon}</span>
          <span className="text-xs font-medium truncate max-w-24" style={{ color: HX.slate600 }}>{queue.name}</span>
        </div>
      </td>

      {/* Reference + detail */}
      <td className="px-3 py-3 min-w-0">
        <div className="font-mono text-xs font-bold text-gray-900">{primaryRef(task, queue)}</div>
        {detail && <div className="text-xs mt-0.5 truncate max-w-64" style={{ color: HX.slate400 }}>{detail}</div>}
        {task.notes && <div className="text-xs mt-0.5 italic truncate max-w-64" style={{ color: HX.slate400 }}>📝 {task.notes}</div>}
      </td>

      {/* Date */}
      <td className="px-3 py-3 whitespace-nowrap">
        {date ? (
          <div>
            <div className="text-xs" style={{ color: HX.slate600 }}>{fmtDate(date)}</div>
            {ucfg.label && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                style={{ background: ucfg.bg, color: ucfg.color }}>{ucfg.label}</span>
            )}
          </div>
        ) : <span className="text-xs" style={{ color: HX.slate400 }}>—</span>}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
          style={{ background: scfg.bg, color: scfg.color, borderColor: scfg.border }}>
          {scfg.label}
        </span>
      </td>
    </tr>
  );
}
