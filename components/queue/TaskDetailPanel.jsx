"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, OUTCOME_OPTIONS, MOCK_USERS, isManager } from "@/lib/constants";

const SKIP = new Set([
  "_id", "_queueId", "_queueName", "_queueIcon", "_firstCol",
  "archived", "archived_at", "archived_by",
  "status_updated_at", "status_updated_by",
]);

const LABELS = {
  chips_reference:  "Chips Reference",
  error_type:       "Error Type",
  error_supplier:   "Error Supplier",
  agent:            "Agent Code",
  agent_name:       "Agent Name",
  agent_channel:    "Agent Channel",
  booking_platform: "Booking Platform",
  country:          "Country",
  category:         "Category",
  chipscode:        "Chipscode",
  supplier:         "Supplier",
  booking_action:   "Booking Action",
  error_code:       "Error Code",
  error_info:       "Error Info",
  error_message:    "Error Message",
  start_date:       "Start Date",
  error_time:       "Error Time",
  completed_by:     "Completed By",
  completed_at:     "Completed At",
};

const SECTIONS = [
  { label: "Error",    fields: ["error_type", "error_supplier", "error_code", "error_info", "error_message", "error_time"] },
  { label: "Agent",    fields: ["agent", "agent_name", "agent_channel"] },
  { label: "Booking",  fields: ["booking_platform", "country", "category", "chips_reference", "start_date"] },
  { label: "Supplier", fields: ["chipscode", "supplier", "booking_action"] },
  { label: "Resolved", fields: ["completed_by", "completed_at"] },
];

const SECTION_ACCENT = {
  Error:    { accent: HX.red,       bg: HX.redPale,     label: HX.redDark   },
  Agent:    { accent: "#D97706",    bg: "#FFFBEB",       label: "#92400E"    },
  Booking:  { accent: HX.purple,    bg: HX.purplePale,   label: HX.purpleDark },
  Supplier: { accent: HX.blue,      bg: HX.bluePale,     label: HX.blueDark  },
  Resolved: { accent: HX.green,     bg: HX.greenPale,    label: HX.greenDark },
  Other:    { accent: "#9CA3AF",    bg: "#F9FAFB",       label: "#374151"    },
};

const MONO_KEYS  = new Set(["error_code", "booking_action", "chips_reference"]);
const ERROR_KEYS = new Set(["error_code", "error_message", "error_info"]);
const DATE_KEYS  = new Set(["completed_at", "error_time"]);

function formatValue(key, val) {
  if (!val && val !== 0) return null;
  if (DATE_KEYS.has(key)) {
    try { return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { /* fall through */ }
  }
  return String(val);
}

function FieldRow({ fieldKey, value, label, isFirst }) {
  const val = formatValue(fieldKey, value);
  return (
    <div className={`px-4 py-3 ${isFirst ? "" : "border-t border-gray-100"}`}>
      <div className="text-xs font-medium text-gray-400 mb-0.5">
        {label ?? fieldKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </div>
      {val
        ? <div className={`text-sm text-gray-900 break-words leading-snug ${MONO_KEYS.has(fieldKey) ? "font-mono font-semibold" : ""} ${ERROR_KEYS.has(fieldKey) ? "font-medium" : ""}`}>{val}</div>
        : <div className="text-xs text-gray-300 italic">—</div>
      }
    </div>
  );
}

const YES_NO_BADGE = {
  Yes: { background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7" },
  No:  { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" },
};

function CustomFieldRow({ field, value, isFirst, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");

  return (
    <div className={`px-4 py-3 ${isFirst ? "" : "border-t border-gray-100"}`}>
      <div className="text-xs font-medium text-gray-400 mb-1.5">{field.label}</div>
      {field.type === "yesno" ? (
        <div className="flex gap-2">
          {["Yes", "No"].map(opt => (
            <button key={opt} onClick={() => onChange(value === opt ? null : opt)}
              className="text-xs px-3 py-1 rounded-full font-semibold border transition-all"
              style={value === opt ? YES_NO_BADGE[opt] : { color: "#9CA3AF", borderColor: "#E5E7EB" }}>
              {opt}
            </button>
          ))}
          {value && (
            <button onClick={() => onChange(null)} className="text-xs ml-auto text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
          )}
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          <input autoFocus value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-sm border-b border-gray-300 outline-none pb-0.5 text-gray-900 bg-transparent" />
          <button onClick={() => { onChange(draft); setEditing(false); }}
            className="text-xs font-semibold" style={{ color: HX.green }}>Save</button>
          <button onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="text-sm text-left w-full group text-gray-700">
          <span className={value ? "" : "italic text-gray-300"}>{value || "Click to add…"}</span>
          <span className="ml-2 opacity-0 group-hover:opacity-60 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  );
}

function Section({ label, fields, task }) {
  const accent = SECTION_ACCENT[label] ?? SECTION_ACCENT.Other;
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ borderLeftWidth: 3, borderLeftColor: accent.accent }}>
      <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: accent.bg, color: accent.label }}>
        {label}
      </div>
      <div className="bg-white">
        {fields.map((key, i) => (
          <FieldRow key={key} fieldKey={key} value={task[key]} label={LABELS[key]} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}

const BTN = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm";

export default function TaskDetailPanel({ task, queue, onClose, onOpenNotes, onUpdateTask, user, expanded = false, onToggleExpand }) {
  if (!task) return null;

  const [dropdown, setDropdown] = useState(null);
  const toggle = (name) => setDropdown(d => d === name ? null : name);

  const cfg        = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const isBigQuery = queue.source === "bigquery";
  const manager    = isManager(user);
  const myTask     = task.assigned_to === user?.name;
  const unassigned = !task.assigned_to;
  const isDone     = task.status === "done" || task.status === "completed";
  const canAct     = !isDone && (unassigned || myTask || manager);

  const update = (updates) => { onUpdateTask?.(task._id, updates); setDropdown(null); };

  const STATUS_OPTIONS = [
    { value: "pending",     label: "Pending",         emoji: "⏳" },
    { value: "in_progress", label: "In Progress",     emoji: "▶️" },
    { value: "done",        label: "Done",            emoji: "✅" },
    { value: "blocked",     label: "Needs Attention", emoji: "⚠️" },
  ];

  const claim  = () => update({ status: "in_progress", assigned_to: user?.name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const setStatus = (value) => {
    const extra = value === "done"
      ? { completed_by: user?.name, completed_at: new Date().toISOString() }
      : {};
    update({ status: value, ...extra });
  };
  const delegate = (name) => update({ assigned_to: name, assigned_by: user?.name, assigned_at: new Date().toISOString() });

  const agentList = MOCK_USERS.filter(u => u.name !== user?.name);

  const csvSkip          = new Set([...SKIP, "status", "notes"]);
  const csvDisplayFields = isBigQuery ? [] : [
    ...(queue.displayCols ?? []).filter(k => !csvSkip.has(k)),
    ...Object.keys(task).filter(k => !csvSkip.has(k) && !(queue.displayCols ?? []).includes(k)),
  ];

  const headerTitle = isBigQuery
    ? (task.chips_reference ?? task._id)
    : (task[queue.primaryKey] ?? task[(queue.displayCols ?? [])[0]] ?? task._id);

  return (
    <div className={`${expanded ? "flex-1" : "w-[480px]"} flex-shrink-0 flex flex-col min-h-0 bg-white border-l-[3px] shadow-lg`}
      style={{ borderLeftColor: HX.purple }}>

      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0 border-b border-gray-200" style={{ background: HX.purplePale }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{queue.icon}</span>
              <span className="text-xs font-medium" style={{ color: HX.purple }}>{queue.name}</span>
            </div>
            <div className="font-bold font-mono text-lg mb-3 truncate" style={{ color: HX.purpleDark }}>
              {headerTitle}
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-3 mt-0.5">
            {onToggleExpand && (
              <button onClick={onToggleExpand} className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors mr-1" title="Open fullscreen"
                style={{ background: HX.bluePale, color: HX.blue }}>
                ⛶ Full screen
              </button>
            )}
            <button onClick={onClose} className="text-lg leading-none text-gray-400 hover:text-gray-600 transition-colors p-1">✕</button>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {canAct && (
        <div className="flex-shrink-0 px-5 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
          {task.assigned_to && (
            <div className="text-xs text-gray-500 mb-1">
              Claimed by <span className="font-semibold text-gray-800">{task.assigned_to}</span>
              {task.assigned_by && task.assigned_by !== task.assigned_to &&
                <span> · delegated by {task.assigned_by}</span>}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {unassigned && (
              <button onClick={claim} className={BTN} style={{ background: HX.purple, color: "white" }}>
                Claim task
              </button>
            )}
            {(myTask || manager) && !isDone && (
              <div className="relative">
                <button onClick={() => toggle("status")} className={BTN} style={{ background: HX.blue, color: "white" }}>
                  Set status ▾
                </button>
                {dropdown === "status" && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-48">
                    {STATUS_OPTIONS.filter(o => o.value !== task.status && !(o.value === "blocked" && task.status === "escalated")).map(o => (
                      <button key={o.value} onClick={() => setStatus(o.value)}
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
                <button onClick={() => toggle("delegate")} className={`${BTN} border border-gray-300 text-gray-600`}>
                  Delegate ▾
                </button>
                {dropdown === "delegate" && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-44">
                    {agentList.map(u => (
                      <button key={u.id} onClick={() => delegate(u.name)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
                          style={{ background: HX.purple }}>{u.initials}</span>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Done outcome badge */}
      {isDone && task.completion_outcome && (() => {
        const outcome = OUTCOME_OPTIONS.find(o => o.value === task.completion_outcome);
        return (
          <div className="flex-shrink-0 px-5 py-2 text-xs flex items-center gap-2 bg-gray-50 border-b border-gray-200">
            <span className="text-gray-400">Outcome:</span>
            <span className="font-semibold text-gray-800">{outcome?.emoji} {outcome?.label ?? task.completion_outcome}</span>
          </div>
        );
      })()}

      {/* Field sections */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

        {/* Custom fields */}
        {(queue.customFields ?? []).length > 0 && (
          <div className="rounded-lg overflow-hidden border border-gray-200" style={{ borderLeftWidth: 3, borderLeftColor: HX.purple }}>
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: HX.purplePale, color: HX.purple }}>
              Custom Fields
            </div>
            <div className="bg-white">
              {queue.customFields.map((field, i) => (
                <CustomFieldRow
                  key={field.key}
                  field={field}
                  value={task[field.key] ?? null}
                  isFirst={i === 0}
                  onChange={val => update({ [field.key]: val })}
                />
              ))}
            </div>
          </div>
        )}

        {isBigQuery
          ? SECTIONS.map(s => <Section key={s.label} label={s.label} fields={s.fields} task={task} />)
          : (
            <div className="rounded-lg overflow-hidden border border-gray-200" style={{ borderLeftWidth: 3, borderLeftColor: SECTION_ACCENT.Other.accent }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: SECTION_ACCENT.Other.bg, color: SECTION_ACCENT.Other.label }}>
                Details
              </div>
              <div className="bg-white">
                {csvDisplayFields.map((key, i) => (
                  <FieldRow key={key} fieldKey={key} value={task[key]} isFirst={i === 0} />
                ))}
              </div>
            </div>
          )
        }

        {/* Notes */}
        <div className="rounded-lg overflow-hidden border border-gray-200" style={{ borderLeftWidth: 3, borderLeftColor: HX.purple }}>
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: HX.purplePale }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HX.purple }}>Notes</span>
            <button onClick={() => onOpenNotes(task)} className="text-xs px-2.5 py-1 rounded font-semibold text-white"
              style={{ background: HX.purple }}>
              {task.notes ? "Edit" : "+ Add"}
            </button>
          </div>
          <div className="px-4 py-3 bg-white">
            {task.notes
              ? <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{task.notes}</p>
              : <p className="text-xs italic text-gray-300">No notes added yet</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
