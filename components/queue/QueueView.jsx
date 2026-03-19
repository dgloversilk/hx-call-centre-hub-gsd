"use client";

import { useState, useMemo, useEffect } from "react";
import { HX } from "@/lib/brand";
import { OUTCOME_OPTIONS, MOCK_USERS, isManager } from "@/lib/constants";
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
  { key: "all",         label: "All",           color: "#4B5563", bg: "#F3F4F6" },
  { key: "mine",        label: "👤 Mine",       color: "#5B21B6", bg: "#EDE9F8" },
  { key: "pending",     label: "Pending",       color: "#4B5563", bg: "#F3F4F6" },
  { key: "in_progress", label: "In Progress",   color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "attention",   label: "⚠ Attention",   color: "#B91C1C", bg: "#FEE2E2" },
];

// Key fields shown in the work queue table for BigQuery queues
const KEY_COLS = ["chips_reference", "start_date", "error_type", "supplier", "booking_action", "error_code", "error_message", "error_time"];

const toFieldKey = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function QueueView({
  queue, taskData, onUpdateTask, onArchiveTask, onRestoreTask,
  onAddTask, onAddCustomField, archiveAllCompleted, initialCount, user, isLoading = false,
}) {
  const tasks   = taskData[queue.id] ?? [];
  const manager = isManager(user);

  const [statusFilter,  setStatusFilter]  = useState("all");
  const [tab,           setTab]           = useState("work");
  const [notesTask,     setNotesTask]     = useState(null);
  const [detailTaskId,  setDetailTaskId]  = useState(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [selectMode,    setSelectMode]    = useState(false);
  const [selectedRows,  setSelectedRows]  = useState(new Set());
  const [bulkDelegate,  setBulkDelegate]  = useState(false);
  const [bulkOutcome,   setBulkOutcome]   = useState(false);
  const [addingField,   setAddingField]   = useState(false);
  const [fieldLabel,    setFieldLabel]    = useState("");
  const [fieldType,     setFieldType]     = useState("yesno");

  // Clear detail panel, selection and select mode when switching queues
  useEffect(() => {
    setDetailTaskId(null);
    setSelectedRows(new Set());
    setSelectMode(false);
  }, [queue.id]);

  // Active (non-archived) tasks
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);
  // Always look up the live task so the panel reflects updates immediately
  const detailTask  = useMemo(() =>
    detailTaskId ? (activeTasks.find(t => t._id === detailTaskId) ?? null) : null,
    [detailTaskId, activeTasks]
  );

  const filtered = useMemo(() => {
    let t;
    if (statusFilter === "all")            t = activeTasks;
    else if (statusFilter === "mine")      t = activeTasks.filter(t => t.assigned_to === user?.name);
    else if (statusFilter === "unassigned") t = activeTasks.filter(t => !t.assigned_to);
    else if (statusFilter === "attention") t = activeTasks.filter(t => t.status === "blocked" || t.status === "escalated");
    else                                   t = activeTasks.filter(t => t.status === statusFilter);
    return [...t].sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  }, [activeTasks, statusFilter, user]);

  const counts = useMemo(() => ({
    all:         activeTasks.length,
    mine:        activeTasks.filter(t => t.assigned_to === user?.name).length,
    unassigned:  activeTasks.filter(t => !t.assigned_to).length,
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

  const taskRef        = t => t.chips_reference ?? t.ref ?? t._id;
  const customColKeys  = (queue.customFields ?? []).map(f => f.key);
  const queueWithKeyCols = queue.source === "bigquery"
    ? { ...queue, displayCols: [...KEY_COLS, ...customColKeys] }
    : { ...queue, displayCols: [...(queue.displayCols ?? []), ...customColKeys.filter(k => !(queue.displayCols ?? []).includes(k))] };

  const handleAddField = (e) => {
    e.preventDefault();
    const label = fieldLabel.trim();
    if (!label) return;
    const key = toFieldKey(label);
    if ((queue.customFields ?? []).some(f => f.key === key)) return; // no duplicates
    onAddCustomField?.({ key, label, type: fieldType });
    setFieldLabel("");
    setAddingField(false);
  };

  const handleRowClick = (task) => {
    setDetailTaskId(prev => prev === task._id ? null : task._id);
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
  const applyBulk = (updates) => {
    [...selectedRows].forEach(id => updateOne(id, updates));
    setSelectedRows(new Set());
    setSelectMode(false);
  };

  const handleBulkClaim     = () => applyBulk({ status: "in_progress", assigned_to: user?.name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const handleBulkAttention = () => applyBulk({ status: "blocked" });
  const handleBulkDelegate  = (agentName) => { applyBulk({ assigned_to: agentName, assigned_by: user?.name, assigned_at: new Date().toISOString() }); setBulkDelegate(false); };
  const handleBulkComplete  = (outcome)   => { applyBulk({ status: "done", completion_outcome: outcome, completed_by: user?.name, completed_at: new Date().toISOString() }); setBulkOutcome(false); };

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

          <div className="flex items-center gap-2">
            {manager && tab === "work" && (
              <button
                onClick={() => setAddingField(v => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={addingField
                  ? { background: HX.purple, color: "white", borderColor: HX.purple }
                  : { background: "white", color: HX.purple, borderColor: HX.purpleLight }}
              >
                ⊕ Add field
              </button>
            )}
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
        </div>

        {tab === "work" && (
          <div className="flex gap-2 flex-wrap text-sm items-center">
            {FILTERS.map(({ key, label, color, bg }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-lg font-medium transition-all border"
                style={statusFilter === key
                  ? { background: bg, color, borderColor: color }
                  : { background: bg, color, borderColor: "transparent", opacity: 0.45 }}
                onMouseEnter={e => { if (statusFilter !== key) e.currentTarget.style.opacity = "0.75"; }}
                onMouseLeave={e => { if (statusFilter !== key) e.currentTarget.style.opacity = "0.45"; }}
              >
                {label} <span className="ml-1 opacity-75 text-xs">{counts[key]}</span>
              </button>
            ))}
            {isManager(user) && (
              <button
                onClick={() => setStatusFilter("unassigned")}
                className="px-3 py-1.5 rounded-lg font-medium transition-colors border"
                style={statusFilter === "unassigned"
                  ? { background: "#DC2626", color: "white", borderColor: "#DC2626" }
                  : { background: "white", color: "#DC2626", borderColor: "#FECACA" }}
                onMouseEnter={e => { if (statusFilter !== "unassigned") e.currentTarget.style.borderColor = "#FCA5A5"; }}
                onMouseLeave={e => { if (statusFilter !== "unassigned") e.currentTarget.style.borderColor = "#FECACA"; }}
              >
                ⚡ Unassigned <span className="ml-1 opacity-75 text-xs">{counts.unassigned}</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {selectMode && selectedRows.size > 0 && (
                <span className="text-xs font-medium" style={{ color: HX.purple }}>
                  {selectedRows.size} selected
                </span>
              )}
              <button
                onClick={() => { setSelectMode(v => !v); setSelectedRows(new Set()); }}
                className="px-3 py-1.5 rounded-lg font-medium transition-colors border text-xs"
                style={selectMode
                  ? { background: HX.purple, color: "white", borderColor: HX.purple }
                  : { background: "white", color: "#6B7280", borderColor: "#E5E7EB" }}
                title="Toggle bulk selection mode"
              >
                {selectMode ? "✓ Selecting" : "☐ Select"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add field form — inline, manager only */}
      {addingField && tab === "work" && (
        <form
          onSubmit={handleAddField}
          className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b bg-white"
        >
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">New field</span>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Was this booking cancelled?"
            value={fieldLabel}
            onChange={e => setFieldLabel(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none min-w-0"
            onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
          />
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs flex-shrink-0">
            {[{ v: "yesno", label: "Yes / No" }, { v: "text", label: "Text" }].map(({ v, label }) => (
              <button
                key={v} type="button" onClick={() => setFieldType(v)}
                className="px-2.5 py-1 rounded-md font-medium transition-colors"
                style={fieldType === v
                  ? { background: "white", color: HX.purple, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                  : { color: "#6B7280" }}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="submit" disabled={!fieldLabel.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ background: HX.purple }}>
            Add
          </button>
          <button type="button" onClick={() => { setAddingField(false); setFieldLabel(""); }}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
            ✕
          </button>
        </form>
      )}

      {/* Bulk action bar — visible whenever select mode is active */}
      {selectMode && tab === "work" && (
        <div
          className="flex-shrink-0 px-5 py-2.5 flex items-center gap-3 flex-wrap border-b"
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

          {manager && (
            <div className="relative">
              <button
                onClick={() => { setBulkDelegate(v => !v); setBulkOutcome(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                👤 Delegate ▾
              </button>
              {bulkDelegate && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-44 z-50">
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

          {/* Needs Attention */}
          <button
            onClick={handleBulkAttention}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white border-opacity-40 text-white hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            ⚠ Needs Attention
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
              <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-52 z-50">
                {OUTCOME_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => handleBulkComplete(o.value)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span>{o.emoji}</span>{o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => { setSelectedRows(new Set()); setSelectMode(false); }}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕ Done
          </button>
        </div>
      )}

      {/* Main content + optional detail panel */}
      <div className="flex flex-1 min-h-0">

        {/* Left content — hidden when panel is expanded */}
        {!(panelExpanded && detailTask && tab === "work") && (<>
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
              selectMode={selectMode}
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
        </>)}

        {detailTask && tab === "work" && (
          <TaskDetailPanel
            task={detailTask}
            queue={queue}
            user={user}
            onClose={() => { setDetailTaskId(null); setPanelExpanded(false); }}
            onOpenNotes={(t) => setNotesTask(t)}
            onUpdateTask={(taskId, updates) => updateOne(taskId, updates)}
            expanded={panelExpanded}
            onToggleExpand={() => setPanelExpanded(e => !e)}
          />
        )}
      </div>

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
