"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { HX } from "@/lib/brand";
import TaskTable    from "./TaskTable";
import NotesPanel   from "./NotesPanel";
import AnalysisPanel from "./AnalysisPanel";

const TABS = [
  { id: "work",     label: "🗂 Work Queue" },
  { id: "analysis", label: "📊 Analysis"   },
  { id: "flat",     label: "📋 Flat File"  },
];

const FILTERS = [
  { key: "all",        label: "All"         },
  { key: "pending",    label: "Pending"     },
  { key: "in_progress",label: "In Progress" },
  { key: "attention",  label: "⚠ Attention" },
];

export default function QueueView({
  queue, taskData, onUpdateTask, onArchiveTask, onRestoreTask,
  onAddTask, archiveAllCompleted, initialCount, user, isLoading = false,
}) {
  const tasks = taskData[queue.id] ?? [];

  const [statusFilter, setStatusFilter] = useState("all");
  const [tab,          setTab]          = useState("work");
  const [notesTask,    setNotesTask]    = useState(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef(null);

  // All available display columns from the queue definition
  const allDisplayCols = queue.displayCols ?? [];

  // Column visibility — load from localStorage, default all on
  const storageKey = `col_visibility_${queue.id}`;
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only keep cols that still exist in allDisplayCols
        return allDisplayCols.filter(c => parsed.includes(c));
      }
    } catch {}
    return allDisplayCols;
  });

  // Sync to localStorage whenever visibleCols changes
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(visibleCols)); } catch {}
  }, [visibleCols, storageKey]);

  // Close col picker on outside click
  useEffect(() => {
    function handler(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setShowColPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCol = (col) => {
    setVisibleCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  // Active (non-archived) tasks
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);

  const filtered = useMemo(() => {
    if (statusFilter === "all")       return activeTasks;
    if (statusFilter === "attention") return activeTasks.filter(t => t.status === "blocked" || t.status === "escalated");
    return activeTasks.filter(t => t.status === statusFilter);
  }, [activeTasks, statusFilter]);

  const counts = useMemo(() => ({
    all:         activeTasks.length,
    pending:     activeTasks.filter(t => t.status === "pending").length,
    in_progress: activeTasks.filter(t => t.status === "in_progress").length,
    completed:   activeTasks.filter(t => t.status === "completed").length,
    attention:   activeTasks.filter(t => t.status === "blocked" || t.status === "escalated").length,
    archived:    tasks.filter(t => t.archived).length,
  }), [activeTasks, tasks]);

  // All columns (for flat file view)
  const allCols = useMemo(
    () => tasks.length > 0
      ? Object.keys(tasks[0]).filter(k => !k.startsWith("_") && k !== "archived")
      : [],
    [tasks]
  );

  const taskRef = t => t.chips_reference ?? t.ref ?? t._id;

  // Queue with only visible cols passed to TaskTable
  const queueWithVisibleCols = { ...queue, displayCols: visibleCols };

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
              {queue.description} · Source:{" "}
              <strong>{queue.source === "bigquery" ? "BigQuery" : "CSV upload"}</strong>{" "}
              · Syncs: {queue.schedule}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Column toggle button (work tab only) */}
            {tab === "work" && (
              <div className="relative" ref={colPickerRef}>
                <button
                  onClick={() => setShowColPicker(v => !v)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors"
                  style={
                    showColPicker
                      ? { background: HX.purple, color: "white", borderColor: HX.purple }
                      : { background: "white", color: "#4B5563", borderColor: "#E5E7EB" }
                  }
                >
                  ⚙ Columns
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: showColPicker ? "rgba(255,255,255,0.2)" : HX.purplePale,
                      color: showColPicker ? "white" : HX.purple,
                    }}
                  >
                    {visibleCols.length}/{allDisplayCols.length}
                  </span>
                </button>

                {showColPicker && (
                  <div
                    className="absolute right-0 top-10 z-50 rounded-xl border border-gray-200 shadow-xl p-4 min-w-64"
                    style={{ background: "white" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Toggle Columns</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVisibleCols(allDisplayCols)}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ color: HX.purple, borderColor: HX.purpleLight }}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setVisibleCols([])}
                          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-400"
                        >
                          None
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                      {allDisplayCols.map(col => (
                        <label
                          key={col}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={visibleCols.includes(col)}
                            onChange={() => toggleCol(col)}
                            className="rounded"
                            style={{ accentColor: HX.purple }}
                          />
                          <span className="font-mono text-xs text-gray-700">{col.replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                      Saved automatically
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1 text-sm">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-3 py-1.5 rounded-md font-medium transition-colors relative"
                  style={
                    tab === t.id
                      ? { background: "white", color: HX.purple, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                      : { color: "#6B7280" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status filters (work queue only) */}
        {tab === "work" && (
          <div className="flex gap-2 flex-wrap text-sm">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-lg font-medium transition-colors border"
                style={
                  statusFilter === key
                    ? { background: HX.purple, color: "white", borderColor: HX.purple }
                    : { background: "white", color: "#4B5563", borderColor: "#E5E7EB" }
                }
                onMouseEnter={e => { if (statusFilter !== key) e.currentTarget.style.borderColor = HX.purpleLight; }}
                onMouseLeave={e => { if (statusFilter !== key) e.currentTarget.style.borderColor = "#E5E7EB"; }}
              >
                {label} <span className="ml-1 opacity-75 text-xs">{counts[key]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BigQuery loading skeleton */}
      {tab === "work" && isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${HX.purpleLight} transparent ${HX.purpleLight} ${HX.purpleLight}` }}
          />
          <div className="text-sm font-medium" style={{ color: HX.purple }}>Loading from BigQuery…</div>
          <div className="text-xs text-gray-400">This may take up to 30 seconds</div>
        </div>
      )}

      {/* Work queue tab */}
      {tab === "work" && !isLoading && (
        <TaskTable
          queue={queueWithVisibleCols}
          tasks={filtered}
          onUpdateTask={(taskId, updates) => onUpdateTask(queue.id, taskId, updates, user)}
          onOpenNotes={setNotesTask}
          onArchive={taskId => onArchiveTask(queue.id, taskId, user)}
          user={user}
        />
      )}

      {/* Flat file tab */}
      {tab === "flat" && (
        <div className="flex-1 overflow-auto">
          <div
            className="px-4 py-2 border-b text-xs font-medium"
            style={{ background: HX.yellowLight, color: "#7A6200", borderColor: HX.yellowDark }}
          >
            All {allCols.length} columns · {activeTasks.length} active rows · Raw flat file view
          </div>
          <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10" style={{ background: HX.purple }}>
              <tr>
                {allCols.map(k => (
                  <th
                    key={k}
                    className="px-3 py-2.5 text-left font-mono font-medium whitespace-nowrap border-r text-xs"
                    style={{ color: HX.purpleLight, borderColor: HX.purpleDark }}
                  >
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {activeTasks.map((task, idx) => (
                <tr
                  key={task._id}
                  className={idx % 2 === 1 ? "bg-gray-50" : ""}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 1 ? "#F9FAFB" : ""; }}
                >
                  {allCols.map(k => (
                    <td
                      key={k}
                      className="px-3 py-2 text-gray-700 whitespace-nowrap border-r border-gray-100 max-w-48 truncate"
                    >
                      {String(task[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analysis tab */}
      {tab === "analysis" && (
        <AnalysisPanel queue={queue} tasks={activeTasks} initialCount={initialCount} />
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
