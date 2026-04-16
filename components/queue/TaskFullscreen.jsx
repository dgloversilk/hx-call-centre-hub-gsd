"use client";

import { useState, useEffect } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, OUTCOME_OPTIONS, MOCK_USERS, isManager } from "@/lib/constants";

// Fields to show in each section for BigQuery tasks
const SECTIONS = [
  {
    label: "Error details",
    icon: "⚠️",
    fields: [
      { key: "error_type",    label: "Type" },
      { key: "error_code",    label: "Code",    mono: true },
      { key: "error_message", label: "Message" },
      { key: "error_info",    label: "Info" },
      { key: "log_action",    label: "Log action" },
      { key: "error_time",    label: "Time",    date: true },
    ],
  },
  {
    label: "Booking",
    icon: "📋",
    fields: [
      { key: "chips_reference",  label: "Reference",  mono: true },
      { key: "booking_platform", label: "Platform" },
      { key: "country",          label: "Country" },
      { key: "start_date",       label: "Start date" },
    ],
  },
  {
    label: "Supplier",
    icon: "🏨",
    fields: [
      { key: "supplier",        label: "Supplier" },
      { key: "code",            label: "Product code", mono: true },
      { key: "product_type",    label: "Product type" },
      { key: "queue_id",        label: "Queue ID",    mono: true },
      { key: "booking_action",  label: "Action",      mono: true },
    ],
  },
];

const STATUS_OPTIONS = [
  { value: "pending",     label: "Pending",          emoji: "⏳" },
  { value: "in_progress", label: "In Progress",      emoji: "▶️" },
  { value: "done",        label: "Done",             emoji: "✅" },
  { value: "blocked",     label: "Needs Attention",  emoji: "⚠️" },
];

export default function TaskFullscreen({ task, queue, user, onClose, onUpdateTask, tasks = [], onNavigate }) {
  const [notes,       setNotes]       = useState(task?.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [statusDrop,  setStatusDrop]  = useState(false);
  const [outcomeDrop, setOutcomeDrop] = useState(false);
  const [delegateDrop, setDelegateDrop] = useState(false);

  const manager    = isManager(user);
  const isDone     = task?.status === "done" || task?.status === "completed";
  const myTask     = task?.assigned_to === user?.name;
  const unassigned = !task?.assigned_to;
  const canAct     = !isDone && (unassigned || myTask || manager);

  // Sync notes when task changes
  useEffect(() => { setNotes(task?.notes ?? ""); setEditingNotes(false); }, [task?._id]);

  // Keyboard: Escape to close, arrow keys to navigate
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") navigateTask(1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   navigateTask(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [task, tasks]);

  if (!task) return null;

  const update = (updates) => {
    onUpdateTask?.(task._id, updates);
    setStatusDrop(false);
    setOutcomeDrop(false);
    setDelegateDrop(false);
  };

  const claim = () => update({
    status: "in_progress",
    assigned_to: user?.name,
    assigned_by: user?.name,
    assigned_at: new Date().toISOString(),
  });

  const setStatus = (value) => update({
    status: value,
    ...(value === "done" ? { completed_by: user?.name, completed_at: new Date().toISOString() } : {}),
  });

  const delegate = (name) => update({
    assigned_to: name,
    assigned_by: user?.name,
    assigned_at: new Date().toISOString(),
  });

  const saveNotes = () => {
    update({ notes });
    setEditingNotes(false);
  };

  const navigateTask = (dir) => {
    const active = tasks.filter(t => !t.archived);
    const idx    = active.findIndex(t => t._id === task._id);
    const next   = active[idx + dir];
    if (next) onNavigate?.(next._id);
  };

  const cfg         = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const isBigQuery  = queue?.source === "bigquery";
  const agentList   = MOCK_USERS.filter(u => u.name !== user?.name);
  const active      = tasks.filter(t => !t.archived);
  const taskIdx     = active.findIndex(t => t._id === task._id);
  const hasPrev     = taskIdx > 0;
  const hasNext     = taskIdx < active.length - 1;
  const headerRef   = isBigQuery ? (task.chips_reference ?? task._id) : (task[queue?.primaryKey] ?? task._id);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "white" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b" style={{ borderColor: HX.gray2, background: HX.slate800 }}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{queue?.icon}</span>
          <div>
            <div className="font-mono font-bold text-white text-lg leading-tight">{headerRef}</div>
            <div className="text-xs mt-0.5" style={{ color: HX.slate400 }}>{queue?.name}</div>
          </div>
          <span className="ml-2 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
            {cfg.label}
          </span>
          {task.country && (
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: HX.slate700, color: HX.slate300 }}>
              {task.country === "DE" ? "🇩🇪 DE" : "🇬🇧 UK"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Task navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateTask(-1)}
              disabled={!hasPrev}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-30"
              style={{ color: HX.slate300 }}
              onMouseEnter={e => { if (hasPrev) e.currentTarget.style.background = HX.slate700; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; }}
              title="Previous task (←)"
            >←</button>
            <span className="text-xs px-2" style={{ color: HX.slate500 }}>
              {taskIdx + 1} / {active.length}
            </span>
            <button
              onClick={() => navigateTask(1)}
              disabled={!hasNext}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-30"
              style={{ color: HX.slate300 }}
              onMouseEnter={e => { if (hasNext) e.currentTarget.style.background = HX.slate700; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; }}
              title="Next task (→)"
            >→</button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
            style={{ color: HX.slate400 }}
            onMouseEnter={e => { e.currentTarget.style.background = HX.slate700; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}
            title="Close (Esc)"
          >✕</button>
        </div>
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      {canAct && (
        <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0 border-b" style={{ borderColor: HX.gray2, background: HX.gray4 }}>
          {task.assigned_to && (
            <span className="text-xs text-gray-500">
              Claimed by <strong className="text-gray-800">{task.assigned_to}</strong>
            </span>
          )}
          <div className="flex gap-2 items-center flex-wrap">
            {unassigned && (
              <button
                onClick={claim}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: HX.blue }}
                onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}
              >
                ✋ Claim task
              </button>
            )}
            {(myTask || manager) && !isDone && (
              <div className="relative">
                <button
                  onClick={() => { setStatusDrop(v => !v); setOutcomeDrop(false); setDelegateDrop(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: HX.slate700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.slate600; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.slate700; }}
                >
                  Set status ▾
                </button>
                {statusDrop && (
                  <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-48">
                    {STATUS_OPTIONS.filter(o => o.value !== task.status).map(o => (
                      <button key={o.value} onClick={() => setStatus(o.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(myTask || manager) && !isDone && (
              <div className="relative">
                <button
                  onClick={() => { setOutcomeDrop(v => !v); setStatusDrop(false); setDelegateDrop(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: HX.greenPale, color: HX.greenDark }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.greenLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.greenPale; }}
                >
                  ✅ Mark done ▾
                </button>
                {outcomeDrop && (
                  <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-52">
                    {OUTCOME_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setStatus("done")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {manager && (
              <div className="relative">
                <button
                  onClick={() => { setDelegateDrop(v => !v); setStatusDrop(false); setOutcomeDrop(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
                  style={{ borderColor: HX.gray2, color: "#4B5563", background: "white" }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.gray3; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "white"; }}
                >
                  Delegate ▾
                </button>
                {delegateDrop && (
                  <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-44">
                    {agentList.map(u => (
                      <button key={u.id} onClick={() => delegate(u.name)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
                          style={{ background: HX.blue }}>{u.initials}</span>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="ml-auto text-xs" style={{ color: HX.slate400 }}>
            ← → to navigate · Esc to close
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-6 grid grid-cols-2 gap-6">

          {/* Sections */}
          {isBigQuery ? (
            SECTIONS.map(section => {
              const populated = section.fields.filter(f => task[f.key]);
              if (populated.length === 0) return null;
              return (
                <div key={section.label} className="rounded-xl border overflow-hidden" style={{ borderColor: HX.gray2 }}>
                  <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: HX.gray2, background: HX.gray4 }}>
                    <span>{section.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{section.label}</span>
                  </div>
                  <div className="bg-white divide-y" style={{ divideColor: HX.gray2 }}>
                    {populated.map(f => (
                      <div key={f.key} className="px-4 py-3">
                        <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                        <div className={`text-sm text-gray-900 break-words ${f.mono ? "font-mono font-semibold" : ""}`}>
                          {f.date
                            ? (() => { try { return new Date(task[f.key]).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return task[f.key]; } })()
                            : task[f.key]
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 rounded-xl border overflow-hidden" style={{ borderColor: HX.gray2 }}>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: HX.gray2, background: HX.gray4 }}>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Details</span>
              </div>
              <div className="bg-white divide-y grid grid-cols-2">
                {(queue?.displayCols ?? []).filter(k => task[k]).map(k => (
                  <div key={k} className="px-4 py-3">
                    <div className="text-xs text-gray-400 mb-0.5">{k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                    <div className="text-sm text-gray-900">{String(task[k])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom fields */}
          {(queue?.customFields ?? []).length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: HX.gray2 }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: HX.gray2, background: HX.bluePale }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HX.blue }}>Custom fields</span>
              </div>
              <div className="bg-white divide-y">
                {queue.customFields.map(field => (
                  <CustomFieldRow
                    key={field.key}
                    field={field}
                    value={task[field.key] ?? null}
                    onChange={val => update({ [field.key]: val })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes — full width */}
          <div className="col-span-2 rounded-xl border overflow-hidden" style={{ borderColor: HX.gray2 }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: HX.gray2, background: HX.gray4 }}>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">📝 Notes</span>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: HX.blue, color: "white" }}
                >
                  {notes ? "Edit" : "+ Add note"}
                </button>
              )}
            </div>
            <div className="bg-white p-4">
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this task…"
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    style={{ borderColor: HX.gray2 }}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveNotes} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: HX.blue }}>Save</button>
                    <button onClick={() => { setNotes(task.notes ?? ""); setEditingNotes(false); }} className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-500 border" style={{ borderColor: HX.gray2 }}>Cancel</button>
                  </div>
                </div>
              ) : notes ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes — click Edit to add one.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const YES_NO_BADGE = {
  Yes: { background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7" },
  No:  { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" },
};

function CustomFieldRow({ field, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");

  return (
    <div className="px-4 py-3">
      <div className="text-xs text-gray-400 mb-1.5">{field.label}</div>
      {field.type === "yesno" ? (
        <div className="flex gap-2">
          {["Yes", "No"].map(opt => (
            <button key={opt} onClick={() => onChange(value === opt ? null : opt)}
              className="text-xs px-3 py-1 rounded-full font-semibold border transition-all"
              style={value === opt ? YES_NO_BADGE[opt] : { color: "#9CA3AF", borderColor: "#E5E7EB" }}>
              {opt}
            </button>
          ))}
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          <input autoFocus value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-sm border-b border-gray-300 outline-none pb-0.5 text-gray-900 bg-transparent" />
          <button onClick={() => { onChange(draft); setEditing(false); }} className="text-xs font-semibold" style={{ color: HX.green }}>Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }} className="text-sm text-left w-full group text-gray-700">
          <span className={value ? "" : "italic text-gray-300"}>{value || "Click to add…"}</span>
          <span className="ml-2 opacity-0 group-hover:opacity-60 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  );
}
