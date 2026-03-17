"use client";

import { useState, useMemo } from "react";
import { HX } from "@/lib/brand";
import { OUTCOME_OPTIONS, MOCK_USERS } from "@/lib/constants";
import TaskTable      from "./TaskTable";
import NotesPanel     from "./NotesPanel";
import AnalysisPanel  from "./AnalysisPanel";
import TaskDetailPanel from "./TaskDetailPanel";

const TABS = [
  { id: "work",     label: "🗂 Work Queue" },
  { id: "analysis", label: "📊 Analysis"   },
  { id: "flat",     label: "📋 Flat File"  },
];

const FILTERS = [
  { key: "all",         label: "All"         },
  { key: "mine",        label: "👤 Mine"     },
  { key: "pending",     label: "Pending"     },
  { key: "in_progress", label: "In Progress" },
  { key: "attention",   label: "⚠ Attention" },
];

// Key fields shown in the work queue table for BigQuery queues
const KEY_COLS = ["chips_reference", "start_date", "error_type", "supplier", "booking_action", "error_code", "error_message", "error_time"];

export default function QueueView({
  queue, taskData, onUpdateTask, onArchiveTask, onRestoreTask,
  onAddTask, archiveAllCompleted, initialCount, user, isLoading = false,
}) {
  const tasks = taskData[queue.id] ?? [];
  const isManager = user?.role === "Manager" || user?.role === "Owner";

  const [statusFilter,     setStatusFilter]     = useState("all");
  const [tab,              setTab]              = useState("work");
  const [notesTask,        setNotesTask]        = useState(null);
  const [detailTask,       setDetailTask]       = useState(null);
  const [selectedRows,     setSelectedRows]     = useState(new Set());
  const [bulkDelegate,     setBulkDelegate]     = useState(false);
  const [bulkOutcome,      setBulkOutcome]      = useState(false);

  // Active (non-archived) tasks
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);

  const filtered = useMemo(() => {
    let t;
    if (statusFilter === "all")            t = activeTasks;
    else if (statusFilter === "mine")      t = activeTasks.filter(t => t.assigned_to === user?.name);
    else if (statusFilter === "attention") t = activeTasks.filter(t => t.status === "blocked" || t.status === "escalated");
    else                                   t = activeTasks.filter(t => t.status === statusFilter);
    return [...t].sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  }, [activeTasks, statusFilter, user]);

  const counts = useMemo(() => ({
    all:         activeTasks.length,
    mine:        activeTasks.filter(t => t.assigned_to === user?.name).length,
    pending:     activeTasks.filter(t => t.status === "pending").length,
    in_progress: activeTasks.filter(t => t.status === "in_progress").length,
    attention:   activeTasks.filter(t => t.status === "blocked" || t.status === "escalated").length,
    archived:    tasks.filter(t => t.archived).length,
  }), [activeTasks, tasks, user]);

  const allCols = useMemo(() => {
    const seen = new Set();
    tasks.forEach(t => Object.keys(t).forEach(k => seen.add(k)));
    return [...seen].filter(k => !k.startsWith("_") && k !== "archived");
  }, [tasks]);

  const taskRef = t => t.chips_reference ?? t.ref ?? t._id;
  const queueWithKeyCols = queue.source === "bigquery"
    ? { ...queue, displayCols: KEY_COLS }
    : queue;

  const handleRowClick = (task) => {
    setDetailTask(prev => prev?._id === task._id ? null : task);
  };

  const handleSelectRow = (taskId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filtered.map(t => t._id));
    setSelectedRows(prev => prev.size === filtered.length ? new Set() : allIds);
  };

  const updateOne = (taskId, updates) => onUpdateTask(queue.id, taskId, updates, user);

  // ── Bulk action handlers ──────────────────────────────────────────────────
  const handleBulkClaim = () => {
    [...selectedRows].forEach(id => updateOne(id, {
      status: "in_progress",
      assigned_to: user?.name,
      assigned_by: user?.name,
      assigned_at: new Date().toISOString(),
    }));
    setSelectedRows(new Set());
  };

  const handleBulkDelegate = (agentName) => {
    [...selectedRows].forEach(id => updateOne(id, {
      assigned_to: agentName,
      assigned_by: user?.name,
      assigned_at: new Date().toISOString(),
    }));
    setSelectedRows(new Set());
    setBulkDelegate(false);
  };

  const handleBulkEscalate = () => {
    [...selectedRows].forEach(id => updateOne(id, { status: "escalated" }));
    setSelectedRows(new Set());
  };

  const handleBulkComplete = (outcome) => {
    [...selectedRows].forEach(id => updateOne(id, {
      status: "done",
      completion_outcome: outcome,
      completed_by: user?.name,
      completed_at: new Date().toISOString(),
    }));
    setSelectedRows(new Set());
    setBulkOutcome(false);
  };

  const agentList = MOCK_USERS.filter(u => u.name !== user?.name);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>{queue.icon}</span>{queue.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Source: <strong>{queue.source === "bigquery" ? "BigQuery" : "CSV upload"}</strong> · Syncs: {queue.schedule}
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 text-sm">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-3 py-1.5 rounded-md font-medium transition-colors"
                style={tab === t.id
                  ? { background: "white", color: HX.purple, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : { color: "#6B7280" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "work" && (
          <div className="flex gap-2 flex-wrap text-sm items-center">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-lg font-medium transition-colors border"
                style={statusFilter === key
                  ? { background: HX.purple, color: "white", borderColor: HX.purple }
                  : { background: "white", color: "#4B5563", borderColor: "#E5E7EB" }}
                onMouseEnter={e => { if (statusFilter !== key) e.currentTarget.style.borderColor = HX.purpleLight; }}
                onMouseLeave={e => { if (statusFilter !== key) e.currentTarget.style.borderColor = "#E5E7EB"; }}
              >
                {label} <span className="ml-1 opacity-75 text-xs">{counts[key]}</span>
              </button>
            ))}
            {selectedRows.size > 0 && (
              <span className="ml-auto text-xs font-medium" style={{ color: HX.purple }}>
                {selectedRows.size} selected — use bar below to act
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main content + optional detail panel */}
      <div className="flex flex-1 min-h-0">

        {tab === "work" && isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${HX.purpleLight} transparent ${HX.purpleLight} ${HX.purpleLight}` }} />
            <div className="text-sm font-medium" style={{ color: HX.purple }}>Loading from BigQuery…</div>
            <div className="text-xs text-gray-400">This may take up to 30 seconds</div>
          </div>
        )}

        {tab === "work" && !isLoading && (
          <TaskTable
            queue={queueWithKeyCols}
            tasks={filtered}
            selectedTaskId={detailTask?._id}
            onRowClick={handleRowClick}
            onUpdateTask={(taskId, updates) => updateOne(taskId, updates)}
            onOpenNotes={setNotesTask}
            onArchive={taskId => onArchiveTask(queue.id, taskId, user)}
            selectedRows={selectedRows}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            user={user}
          />
        )}

        {tab === "flat" && (
          <div className="flex-1 overflow-auto">
            <div className="px-4 py-2 border-b text-xs font-medium"
              style={{ background: HX.yellowLight, color: "#7A6200", borderColor: HX.yellowDark }}>
              All {allCols.length} columns · {activeTasks.length} active rows · Raw flat file view
            </div>
            <table className="w-full text-xs border-collapse min-w-max">
              <thead className="sticky top-0 z-10" style={{ background: HX.purple }}>
                <tr>
                  {allCols.map(k => (
                    <th key={k} className="px-3 py-2.5 text-left font-mono font-medium whitespace-nowrap border-r text-xs"
                      style={{ color: HX.purpleLight, borderColor: HX.purpleDark }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {activeTasks.map((task, idx) => (
                  <tr key={task._id} className={idx % 2 === 1 ? "bg-gray-50" : ""}
                    onMouseEnter={e => { e.currentTarget.style.background = HX.purplePale; }}
                    onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 1 ? "#F9FAFB" : ""; }}>
                    {allCols.map(k => (
                      <td key={k} className="px-3 py-2 text-gray-700 whitespace-nowrap border-r border-gray-100 max-w-48 truncate">
                        {String(task[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "analysis" && (
          <AnalysisPanel queue={queue} tasks={activeTasks} initialCount={initialCount} />
        )}

        {detailTask && tab === "work" && (
          <TaskDetailPanel
            task={detailTask}
            queue={queue}
            user={user}
            onClose={() => setDetailTask(null)}
            onOpenNotes={(t) => setNotesTask(t)}
            onUpdateTask={(taskId, updates) => updateOne(taskId, updates)}
          />
        )}
      </div>

      {/* ── Bulk action bar — appears when rows are selected ─────────────── */}
      {selectedRows.size > 0 && tab === "work" && (
        <div
          className="flex-shrink-0 px-5 py-3 flex items-center gap-3 flex-wrap border-t"
          style={{ background: HX.purple }}
        >
          <span className="text-white text-sm font-semibold">
            {selectedRows.size} task{selectedRows.size > 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-white opacity-30" />

          {/* Claim for me */}
          <button
            onClick={handleBulkClaim}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            ✋ Claim for me
          </button>

          {/* Delegate (managers only) */}
          {isManager && (
            <div className="relative">
              <button
                onClick={() => { setBulkDelegate(v => !v); setBulkOutcome(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                👤 Delegate ▾
              </button>
              {bulkDelegate && (
                <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-44 z-50">
                  {agentList.map(u => (
                    <button key={u.id} onClick={() => handleBulkDelegate(u.name)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                        style={{ background: HX.purple }}>{u.initials}</span>
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Escalate */}
          <button
            onClick={handleBulkEscalate}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            ⬆️ Escalate
          </button>

          {/* Mark complete with outcome */}
          <div className="relative">
            <button
              onClick={() => { setBulkOutcome(v => !v); setBulkDelegate(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              ✅ Mark complete ▾
            </button>
            {bulkOutcome && (
              <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-52 z-50">
                {OUTCOME_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => handleBulkComplete(o.value)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span>{o.emoji}</span>{o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear */}
          <button
            onClick={() => setSelectedRows(new Set())}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Notes slide-out panel */}
      {notesTask && (
        <NotesPanel
          task={notesTask}
          taskRef={taskRef(notesTask)}
          user={user}
          onSave={updates => onUpdateTask(queue.id, notesTask._id, updates, user)}
          onArchive={() => onArchiveTask(queue.id, notesTask._id, user)}
          onClose={() => setNotesTask(null)}
        />
      )}
    </div>
  );
}
