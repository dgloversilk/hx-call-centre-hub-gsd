"use client";

import { useState, useEffect } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, OUTCOME_OPTIONS, MOCK_USERS, isManager } from "@/lib/constants";

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
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }} className="text-sm text-left w-full group text-gray-700">
          <span className={value ? "font-medium" : "italic text-gray-300"}>{value || "—"}</span>
          <span className="ml-1 opacity-0 group-hover:opacity-50 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  );
}

export default function TaskFullscreen({ task, queue, user, onClose, onUpdateTask, tasks = [], onNavigate }) {
  const [notes, setNotes] = useState(task?.notes ?? "");

  const manager    = isManager(user);
  const isDone     = task?.status === "done" || task?.status === "completed";
  const myTask     = task?.assigned_to === user?.name;
  const unassigned = !task?.assigned_to;
  const isBlocked  = task?.status === "blocked" || task?.status === "escalated";
  const isWorking  = task?.status === "in_progress";
  const isPending  = task?.status === "pending";

  useEffect(() => { setNotes(task?.notes ?? ""); }, [task?._id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if ((e.key === "ArrowRight" || e.key === "ArrowDown") && e.target.tagName !== "TEXTAREA") nav(1);
      if ((e.key === "ArrowLeft"  || e.key === "ArrowUp")   && e.target.tagName !== "TEXTAREA") nav(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [task, tasks]);

  if (!task) return null;

  const update = (updates) => onUpdateTask?.(task._id, updates);

  const claim     = () => update({ status: "in_progress", assigned_to: user?.name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const markDone  = () => update({ status: "done", completed_by: user?.name, completed_at: new Date().toISOString() });
  const markStart = () => update({ status: "in_progress" });
  const markBlock = () => update({ status: "blocked" });
  const markPend  = () => update({ status: "pending" });
  const delegate  = (name) => update({ assigned_to: name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const saveNotes = () => update({ notes });

  const nav = (dir) => {
    const active = tasks.filter(t => !t.archived);
    const idx  = active.findIndex(t => t._id === task._id);
    const next = active[idx + dir];
    if (next) onNavigate?.(next._id);
  };

  const active    = tasks.filter(t => !t.archived);
  const taskIdx   = active.findIndex(t => t._id === task._id);
  const cfg       = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const agentList = MOCK_USERS.filter(u => u.name !== user?.name);
  const isBQ      = queue?.source === "bigquery";
  const headerRef = isBQ ? (task.chips_reference ?? task._id) : (task[queue?.primaryKey] ?? task._id);

  const canAct = !isDone && (unassigned || myTask || manager);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: HX.slate800, borderBottom: `1px solid ${HX.slate700}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium mr-1 transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ color: HX.slate400 }}
          >
            ← Back
          </button>
          <span className="text-base flex-shrink-0">{queue?.icon}</span>
          <span className="font-mono font-bold text-white text-lg truncate">{headerRef}</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
            {cfg.label}
          </span>
          {task.country && (
            <span className="text-sm px-2.5 py-1 rounded flex-shrink-0" style={{ background: HX.slate700, color: HX.slate300 }}>
              {task.country === "DE" ? "🇩🇪 DE" : "🇬🇧 UK"}
            </span>
          )}
          {task.assigned_to && (
            <span className="text-sm flex-shrink-0" style={{ color: HX.blueLight }}>
              → {task.assigned_to}
            </span>
          )}
        </div>

        {/* Task counter */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-6">
          <button onClick={() => nav(-1)} disabled={taskIdx <= 0}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold disabled:opacity-25 transition-colors"
            style={{ color: "white", background: HX.slate700 }}
            onMouseEnter={e => { if (taskIdx > 0) e.currentTarget.style.background = HX.slate600; }}
            onMouseLeave={e => { e.currentTarget.style.background = HX.slate700; }}>
            ←
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-none">{taskIdx + 1}<span style={{ color: HX.slate500 }}>/</span>{active.length}</div>
            <div className="text-xs mt-0.5" style={{ color: HX.slate400 }}>tasks</div>
          </div>
          <button onClick={() => nav(1)} disabled={taskIdx >= active.length - 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold disabled:opacity-25 transition-colors"
            style={{ color: "white", background: HX.slate700 }}
            onMouseEnter={e => { if (taskIdx < active.length - 1) e.currentTarget.style.background = HX.slate600; }}
            onMouseLeave={e => { e.currentTarget.style.background = HX.slate700; }}>
            →
          </button>
        </div>
      </div>

      {/* ── 3-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 divide-x overflow-hidden" style={{ borderColor: HX.gray2 }}>

        {/* Col 1 — Error details */}
        <div className="flex flex-col overflow-y-auto" style={{ width: 280, flexShrink: 0 }}>
          <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: HX.red, background: HX.redPale, borderColor: HX.gray2 }}>
            ⚠️ Error
          </div>
          <div className="p-4 space-y-4">
            <Field label="Type"    value={task.error_type} />
            <Field label="Code"    value={task.error_code}    mono />
            <Field label="Message" value={task.error_message} />
            <Field label="Info"    value={task.error_info} />
            <Field label="Action"  value={task.log_action ?? task.action} mono />
            <Field label="Time"    value={task.error_time} date />
          </div>
        </div>

        {/* Col 2 — Booking & Supplier */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: HX.blue, background: HX.bluePale, borderColor: HX.gray2 }}>
            📋 Booking & Supplier
          </div>
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Chips Reference" value={task.chips_reference}   mono />
            <Field label="Platform"        value={task.booking_platform} />
            <Field label="Country"         value={task.country} />
            <Field label="Start Date"      value={task.start_date} />
            <Field label="Supplier"        value={task.supplier ?? task.error_supplier} />
            <Field label="Product Code"    value={task.code}              mono />
            <Field label="Product Type"    value={task.product_type} />
            <Field label="Queue ID"        value={task.queue_id}          mono />
          </div>

          {(queue?.customFields ?? []).length > 0 && (
            <>
              <div className="px-4 py-2.5 border-t border-b text-xs font-bold uppercase tracking-widest flex-shrink-0"
                style={{ color: HX.purple, background: HX.purplePale, borderColor: HX.gray2 }}>
                Custom Fields
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                {queue.customFields.map(field => (
                  <CustomField key={field.key} field={field} value={task[field.key] ?? null}
                    onChange={val => update({ [field.key]: val })} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Col 3 — Actions + Notes */}
        <div className="flex flex-col overflow-hidden" style={{ width: 280, flexShrink: 0 }}>

          {/* Actions */}
          <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: "#6B7280", background: HX.gray4, borderColor: HX.gray2 }}>
            Actions
          </div>
          <div className="p-4 space-y-2 border-b flex-shrink-0" style={{ borderColor: HX.gray2 }}>

            {isDone && (
              <div className="py-2.5 px-3 rounded-lg text-sm text-center font-semibold"
                style={{ background: HX.greenPale, color: HX.greenDark }}>
                ✓ Completed
              </div>
            )}

            {unassigned && !isDone && (
              <button onClick={claim}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: HX.blue }}
                onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}>
                ✋ Claim task
              </button>
            )}

            {(myTask || manager) && !isDone && (<>
              {isPending && (
                <button onClick={markStart}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: HX.blue }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}>
                  ▶ Start working
                </button>
              )}

              {isWorking && (
                <button onClick={markPend}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors border"
                  style={{ background: "white", color: "#6B7280", borderColor: HX.gray2 }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.gray3; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                  ⏸ Pause
                </button>
              )}

              <button onClick={markDone}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: HX.greenPale, color: HX.greenDark }}
                onMouseEnter={e => { e.currentTarget.style.background = "#D1FAE5"; }}
                onMouseLeave={e => { e.currentTarget.style.background = HX.greenPale; }}>
                ✅ Mark as done
              </button>

              {!isBlocked ? (
                <button onClick={markBlock}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: HX.redPale, color: HX.redDark }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FEE2E2"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.redPale; }}>
                  ⚠️ Needs attention
                </button>
              ) : (
                <button onClick={markStart}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: HX.bluePale, color: HX.blueDark }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#DBEAFE"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.bluePale; }}>
                  ↩ Resume
                </button>
              )}
            </>)}

            {/* Delegate — agent list as direct buttons, no dropdown */}
            {manager && agentList.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2 mt-1" style={{ color: HX.slate400 }}>DELEGATE TO</div>
                <div className="space-y-1">
                  {agentList.map(u => (
                    <button key={u.id} onClick={() => delegate(u.name)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border"
                      style={{ borderColor: HX.gray2, background: "white", color: "#374151" }}
                      onMouseEnter={e => { e.currentTarget.style.background = HX.gray3; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                      <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: HX.blue }}>{u.initials}</span>
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: "#6B7280", background: HX.gray4, borderColor: HX.gray2 }}>
            📝 Notes
          </div>
          <div className="flex flex-col flex-1 min-h-0 p-4">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes here…"
              className="flex-1 w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              style={{ borderColor: HX.gray2 }}
            />
            <p className="text-xs mt-2 text-center" style={{ color: HX.slate400 }}>
              Auto-saves · ← → navigate · Esc back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
