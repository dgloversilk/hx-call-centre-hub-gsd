"use client";

import { useState, useRef, useCallback } from "react";
import { HX } from "@/lib/brand";

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 224; // 14rem / w-56

function NavButton({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
      style={active ? { background: HX.purple, color: "white" } : { color: "#D1D5DB" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1F2937"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = ""; }}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Small inline totals badge: e.g. "21 total · 14 pending" */
function TotalsBadge({ total, pending, inProgress, isActive }) {
  if (total === 0) return null;
  return (
    <span
      className="text-xs leading-none"
      style={{ color: isActive ? HX.purpleLight : "#6B7280" }}
    >
      {total} total
      {pending > 0 && <> · <span style={{ color: isActive ? "white" : "#374151", fontWeight: 600 }}>{pending}</span> pending</>}
      {inProgress > 0 && <> · <span style={{ color: isActive ? HX.yellowLight : HX.blue, fontWeight: 600 }}>{inProgress}</span> in progress</>}
    </span>
  );
}

export default function Sidebar({ queues, taskData, page, onPage, user, loadingQueues = new Set() }) {
  const [collapsed,   setCollapsed]   = useState({});
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(DEFAULT_WIDTH);

  const toggleGroup = (groupName) =>
    setCollapsed(c => ({ ...c, [groupName]: !c[groupName] }));

  // ── Resize drag handlers ─────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = sidebarWidth;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [sidebarWidth]);

  // ── Stats helpers ────────────────────────────────────────────────────────
  const qStats = (id) => {
    const all      = taskData[id] ?? [];
    const active   = all.filter(t => !t.archived);
    const archived = all.filter(t => t.archived).length;
    return {
      pending:     active.filter(t => t.status === "pending").length,
      in_progress: active.filter(t => t.status === "in_progress").length,
      total:       all.length,
      archived,
    };
  };

  // Grand totals across all queues
  const grand = queues.reduce(
    (acc, q) => {
      const s = qStats(q.id);
      acc.total      += s.total;
      acc.pending    += s.pending;
      acc.in_progress += s.in_progress;
      acc.archived   += s.archived;
      return acc;
    },
    { total: 0, pending: 0, in_progress: 0, archived: 0 }
  );

  // Build ordered sections: { group, queues[] }
  const sections = [];
  queues.forEach(q => {
    const g    = q.group ?? null;
    const last = sections[sections.length - 1];
    if (last && last.group === g) last.queues.push(q);
    else sections.push({ group: g, queues: [q] });
  });

  return (
    <div
      className="bg-gray-900 text-gray-300 flex flex-col flex-shrink-0 overflow-y-auto relative"
      style={{ width: sidebarWidth }}
    >

      {/* ── Manager navigation ───────────────────────────────────────────── */}
      {["manager", "owner"].includes((user.role ?? "").toLowerCase()) && (
        <div className="p-4 border-b border-gray-700 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</p>
          <NavButton label="Dashboard"     icon="📊" active={page === "dashboard"}     onClick={() => onPage("dashboard")} />
          <NavButton label="Daily Summary" icon="📅" active={page === "daily_summary"} onClick={() => onPage("daily_summary")} />
          <NavButton label="Upload Tasks"  icon="⬆️" active={page === "upload"}        onClick={() => onPage("upload")} />
        </div>
      )}

      {/* ── Grand total strip ────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-700 text-xs space-y-0.5">
        <div className="flex items-center justify-between text-gray-400">
          <span className="font-semibold uppercase tracking-wide">All queues</span>
          <span className="font-bold text-gray-200">{grand.total} tasks</span>
        </div>
        <div className="flex gap-3 text-gray-500">
          <span>{grand.pending} pending</span>
          <span>·</span>
          <span style={{ color: HX.blue }}>{grand.in_progress} in progress</span>
          <span>·</span>
          <span style={{ color: HX.green }}>{grand.archived} done</span>
        </div>
      </div>

      {/* ── Task queue list ──────────────────────────────────────────────── */}
      <div className="p-4 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Queues</p>
        <div className="space-y-1">
          {sections.map((section) => {
            if (!section.group) {
              return section.queues.map(q => (
                <QueueButton key={q.id} q={q} s={qStats(q.id)} page={page} onPage={onPage} loadingQueues={loadingQueues} />
              ));
            }

            const isOpen = !collapsed[section.group];

            // Group-level subtotals
            const groupStats = section.queues.reduce(
              (acc, q) => {
                const s = qStats(q.id);
                acc.total      += s.total;
                acc.pending    += s.pending;
                acc.in_progress += s.in_progress;
                acc.archived   += s.archived;
                return acc;
              },
              { total: 0, pending: 0, in_progress: 0, archived: 0 }
            );
            const anyLoading  = section.queues.some(q => loadingQueues.has(q.id));
            const groupActive = section.queues.some(q => page === q.id);

            return (
              <div key={section.group} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(section.group)}
                  className="w-full px-2 py-2 rounded-lg text-left transition-colors"
                  style={groupActive ? { color: HX.yellow } : { color: "#9CA3AF" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#1F2937"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                    <span style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
                    <span className="flex-1 truncate">{section.group}</span>
                    {anyLoading && <span className="opacity-60 animate-pulse">↻</span>}
                  </div>
                  {/* Group subtotals */}
                  <div className="pl-4 text-xs" style={{ color: groupActive ? HX.yellowLight : "#6B7280" }}>
                    {groupStats.total} total · {groupStats.pending} pending
                    {groupStats.in_progress > 0 && <> · <span style={{ color: HX.blue }}>{groupStats.in_progress} in progress</span></>}
                  </div>
                </button>

                {isOpen && (
                  <div className="ml-2 pl-2 border-l border-gray-700 space-y-0.5 mt-0.5">
                    {section.queues.map(q => (
                      <QueueButton key={q.id} q={q} s={qStats(q.id)} page={page} onPage={onPage} loadingQueues={loadingQueues} indent />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* ── Archive ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-700">
        <button
          onClick={() => onPage("archive")}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={page === "archive" ? { background: HX.purple, color: "white" } : { color: "#D1D5DB" }}
          onMouseEnter={e => { if (page !== "archive") e.currentTarget.style.background = "#1F2937"; }}
          onMouseLeave={e => { if (page !== "archive") e.currentTarget.style.background = ""; }}
        >
          <span>📦</span>
          <span className="flex-1 text-left truncate">Archive</span>
          {grand.archived > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={page === "archive"
                ? { background: "rgba(255,255,255,0.25)", color: "white" }
                : { background: HX.purplePale, color: HX.purple }}
            >
              {grand.archived}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-600">
        Last sync: Today 09:00
      </div>

      {/* ── Resize handle ────────────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group z-30"
        title="Drag to resize"
      >
        <div
          className="h-full w-px ml-auto group-hover:w-1 transition-all"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      </div>
    </div>
  );
}

/** Individual queue button */
function QueueButton({ q, s, page, onPage, loadingQueues, indent = false }) {
  const isActive = page === q.id;
  const pct = s.total > 0 ? Math.round((s.archived / s.total) * 100) : 0;

  return (
    <button
      onClick={() => onPage(q.id)}
      className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
      style={isActive ? { background: HX.purple, color: "white" } : {}}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#1F2937"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ""; }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span>{q.icon}</span>
        <span className="font-medium truncate flex-1">{q.name}</span>
        {loadingQueues.has(q.id) ? (
          <span className="text-xs opacity-60 animate-pulse">syncing…</span>
        ) : s.archived > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)" }}>
            {s.archived}
          </span>
        )}
      </div>
      {/* Sub-subtotals per queue */}
      <div
        className="text-xs pl-6 mb-1"
        style={{ color: isActive ? HX.purpleLight : "#6B7280" }}
      >
        {s.total} total · {s.pending} pending
        {s.in_progress > 0 && <> · <span style={{ color: isActive ? "white" : HX.blue, fontWeight: 600 }}>{s.in_progress} in progress</span></>}
      </div>
      <div className="pl-6">
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: HX.yellow }} />
        </div>
      </div>
    </button>
  );
}
