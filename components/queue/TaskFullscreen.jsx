"use client";

import { useState, useEffect } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, OUTCOME_OPTIONS, MOCK_USERS, isManager } from "@/lib/constants";

const STATUS_OPTIONS = [
  { value: "pending",     label: "Pending",         emoji: "⏳" },
  { value: "in_progress", label: "In Progress",      emoji: "▶️" },
  { value: "done",        label: "Done",             emoji: "✅" },
  { value: "blocked",     label: "Needs Attention",  emoji: "⚠️" },
];

function Field({ label, value, mono = false, date = false }) {
  if (!value && value !== 0) return null;
  let display = String(value);
  if (date) {
    try { display = new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { /* keep raw */ }
  }
  return (
    <div className="min-w-0">
      <div className="text-xs mb-0.5" style={{ color: HX.slate400 }}>{label}</div>
      <div className={`text-sm text-gray-900 truncate ${mono ? "font-mono font-semibold" : "font-medium"}`} title={display}>
        {display}
      </div>
    </div>
  );
}

export default function TaskFullscreen({ task, queue, user, onClose, onUpdateTask, tasks = [], onNavigate }) {
  const [notes,        setNotes]        = useState(task?.notes ?? "");
  const [statusDrop,   setStatusDrop]   = useState(false);
  const [outcomeDrop,  setOutcomeDrop]  = useState(false);
  const [delegateDrop, setDelegateDrop] = useState(false);

  const manager    = isManager(user);
  const isDone     = task?.status === "done" || task?.status === "completed";
  const myTask     = task?.assigned_to === user?.name;
  const unassigned = !task?.assigned_to;
  const canAct     = !isDone && (unassigned || myTask || manager);

  useEffect(() => { setNotes(task?.notes ?? ""); }, [task?._id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") nav(1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   nav(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [task, tasks]);

  if (!task) return null;

  const update = (updates) => {
    onUpdateTask?.(task._id, updates);
    setStatusDrop(false); setOutcomeDrop(false); setDelegateDrop(false);
  };

  const claim     = () => update({ status: "in_progress", assigned_to: user?.name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const setStatus = (value) => update({ status: value, ...(value === "done" ? { completed_by: user?.name, completed_at: new Date().toISOString() } : {}) });
  const delegate  = (name)  => update({ assigned_to: name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const saveNotes = () => update({ notes });

  const nav = (dir) => {
    const active = tasks.filter(t => !t.archived);
    const idx  = active.findIndex(t => t._id === task._id);
    const next = active[idx + dir];
    if (next) onNavigate?.(next._id);
  };

  const active   = tasks.filter(t => !t.archived);
  const taskIdx  = active.findIndex(t => t._id === task._id);
  const cfg      = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const agentList = MOCK_USERS.filter(u => u.name !== user?.name);
  const isBQ     = queue?.source === "bigquery";
  const headerRef = isBQ ? (task.chips_reference ?? task._id) : (task[queue?.primaryKey] ?? task._id);

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: "white", maxHeight: "92vh" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: HX.slate800, borderBottom: `1px solid ${HX.slate700}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base flex-shrink-0">{queue?.icon}</span>
          <span className="font-mono font-bold text-white text-base truncate">{headerRef}</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
            {cfg.label}
          </span>
          {task.country && (
            <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ background: HX.slate700, color: HX.slate300 }}>
              {task.country === "DE" ? "🇩🇪 DE" : "🇬🇧 UK"}
            </span>
          )}
          {task.assigned_to && (
            <span className="text-xs flex-shrink-0" style={{ color: HX.slate400 }}>
              → <span style={{ color: HX.blueLight }}>{task.assigned_to}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button onClick={() => nav(-1)} disabled={taskIdx <= 0}
            className="w-7 h-7 rounded flex items-center justify-center text-sm disabled:opacity-25 transition-colors"
            style={{ color: HX.slate300 }}
            onMouseEnter={e => { if (taskIdx > 0) e.currentTarget.style.background = HX.slate700; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}>←</button>
          <span className="text-xs tabular-nums" style={{ color: HX.slate500 }}>{taskIdx + 1}/{active.length}</span>
          <button onClick={() => nav(1)} disabled={taskIdx >= active.length - 1}
            className="w-7 h-7 rounded flex items-center justify-center text-sm disabled:opacity-25 transition-colors"
            style={{ color: HX.slate300 }}
            onMouseEnter={e => { if (taskIdx < active.length - 1) e.currentTarget.style.background = HX.slate700; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}>→</button>
          <button onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-sm ml-1 transition-colors"
            style={{ color: HX.slate400 }}
            onMouseEnter={e => { e.currentTarget.style.background = HX.slate700; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}
            title="Esc">✕</button>
        </div>
      </div>

      {/* ── Body: 3 columns ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden divide-x" style={{ divideColor: HX.gray2 }}>

        {/* Col 1 — Error */}
        <div className="flex flex-col w-64 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b text-xs font-bold uppercase tracking-widest" style={{ color: HX.red, background: HX.redPale, borderColor: HX.gray2 }}>
            ⚠️ Error
          </div>
          <div className="p-3 space-y-3 flex-1">
            <Field label="Type"    value={task.error_type} />
            <Field label="Code"    value={task.error_code}    mono />
            <Field label="Message" value={task.error_message} />
            <Field label="Info"    value={task.error_info} />
            <Field label="Action"  value={task.log_action ?? task.action} mono />
            <Field label="Time"    value={task.error_time} date />
          </div>
        </div>

        {/* Col 2 — Booking + Supplier */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          <div className="px-3 py-2 border-b text-xs font-bold uppercase tracking-widest" style={{ color: HX.blue, background: HX.bluePale, borderColor: HX.gray2 }}>
            📋 Booking & Supplier
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Chips Reference" value={task.chips_reference} mono />
            <Field label="Platform"        value={task.booking_platform} />
            <Field label="Country"         value={task.country} />
            <Field label="Start Date"      value={task.start_date} />
            <Field label="Supplier"        value={task.supplier ?? task.error_supplier} />
            <Field label="Product Code"    value={task.code}           mono />
            <Field label="Product Type"    value={task.product_type} />
            <Field label="Queue ID"        value={task.queue_id}       mono />
          </div>

          {/* Custom fields */}
          {(queue?.customFields ?? []).length > 0 && (
            <>
              <div className="px-3 py-2 border-t border-b text-xs font-bold uppercase tracking-widest" style={{ color: HX.purple, background: HX.purplePale, borderColor: HX.gray2 }}>
                Custom Fields
              </div>
              <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-3">
                {queue.customFields.map(field => (
                  <CustomField key={field.key} field={field} value={task[field.key] ?? null} onChange={val => update({ [field.key]: val })} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Col 3 — Actions + Notes */}
        <div className="flex flex-col w-64 flex-shrink-0">
          {/* Actions */}
          <div className="px-3 py-2 border-b text-xs font-bold uppercase tracking-widest" style={{ color: "#6B7280", background: HX.gray4, borderColor: HX.gray2 }}>
            Actions
          </div>
          <div className="p-3 space-y-2 border-b flex-shrink-0" style={{ borderColor: HX.gray2 }}>
            {unassigned && canAct && (
              <button onClick={claim}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: HX.blue }}
                onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}>
                ✋ Claim task
              </button>
            )}
            {(myTask || manager) && !isDone && (<>
              <div className="relative">
                <button onClick={() => { setStatusDrop(v => !v); setOutcomeDrop(false); setDelegateDrop(false); }}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: HX.gray3, color: "#374151" }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.gray2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.gray3; }}>
                  Set status ▾
                </button>
                {statusDrop && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {STATUS_OPTIONS.filter(o => o.value !== task.status).map(o => (
                      <button key={o.value} onClick={() => setStatus(o.value)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => { setOutcomeDrop(v => !v); setStatusDrop(false); setDelegateDrop(false); }}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: HX.greenPale, color: HX.greenDark }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#D1FAE5"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.greenPale; }}>
                  ✅ Mark done ▾
                </button>
                {outcomeDrop && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {OUTCOME_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setStatus("done")}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>)}
            {manager && (
              <div className="relative">
                <button onClick={() => { setDelegateDrop(v => !v); setStatusDrop(false); setOutcomeDrop(false); }}
                  className="w-full py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: HX.gray2, color: "#6B7280", background: "white" }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.gray3; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                  Delegate ▾
                </button>
                {delegateDrop && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {agentList.map(u => (
                      <button key={u.id} onClick={() => delegate(u.name)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
                          style={{ background: HX.blue }}>{u.initials}</span>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isDone && (
              <div className="py-2 px-3 rounded-lg text-sm text-center font-medium" style={{ background: HX.greenPale, color: HX.greenDark }}>
                ✓ Completed
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="px-3 py-2 border-b text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: "#6B7280", background: HX.gray4, borderColor: HX.gray2 }}>
            📝 Notes
          </div>
          <div className="p-3 flex flex-col flex-1 min-h-0">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes…"
              className="flex-1 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              style={{ borderColor: HX.gray2, minHeight: 80 }}
            />
            <p className="text-xs mt-1.5 text-center" style={{ color: HX.slate400 }}>Auto-saves on blur · Esc to close · ← → navigate</p>
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

function CustomField({ field, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: HX.slate400 }}>{field.label}</div>
      {field.type === "yesno" ? (
        <div className="flex gap-1.5">
          {["Yes", "No"].map(opt => (
            <button key={opt} onClick={() => onChange(value === opt ? null : opt)}
              className="text-xs px-2.5 py-1 rounded-full font-semibold border transition-all"
              style={value === opt ? YES_NO_BADGE[opt] : { color: "#9CA3AF", borderColor: "#E5E7EB" }}>
              {opt}
            </button>
          ))}
        </div>
      ) : editing ? (
        <div className="flex gap-1.5">
          <input autoFocus value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-sm border-b border-gray-300 outline-none pb-0.5 text-gray-900 bg-transparent" />
          <button onClick={() => { onChange(draft); setEditing(false); }} className="text-xs font-semibold" style={{ color: HX.green }}>✓</button>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="text-sm text-left w-full group text-gray-700">
          <span className={value ? "font-medium" : "italic text-gray-300"}>{value || "—"}</span>
          <span className="ml-1 opacity-0 group-hover:opacity-50 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  );
}
