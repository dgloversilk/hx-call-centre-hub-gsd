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
  Booking:  { bg: HX.purplePale,  label: HX.purple,    border: HX.purpleLight },
  Error:    { bg: HX.redPale,     label: HX.red,        border: HX.redLight   },
  Supplier: { bg: HX.bluePale,    label: HX.blue,       border: HX.blueLight  },
  Agent:    { bg: HX.yellowLight, label: "#7A6200",     border: HX.yellowDark },
  Resolved: { bg: HX.greenPale,   label: HX.greenDark,  border: HX.greenLight },
  Other:    { bg: "rgba(255,255,255,0.08)", label: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.15)" },
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
  const valueColor = ERROR_KEYS.has(fieldKey) ? HX.redLight
    : fieldKey === "chips_reference"           ? HX.yellow
    : "rgba(255,255,255,0.9)";

  return (
    <div className="px-3 py-2.5" style={{ borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-xs font-semibold mb-0.5" style={{ color: HX.purpleLight }}>
        {label ?? fieldKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </div>
      {val
        ? <div className={`text-sm break-words leading-snug ${MONO_KEYS.has(fieldKey) ? "font-mono" : ""}`} style={{ color: valueColor }}>{val}</div>
        : <div className="text-xs italic" style={{ color: "rgba(255,255,255,0.2)" }}>—</div>
      }
    </div>
  );
}

const YES_NO_CYCLE = { null: "Yes", Yes: "No", No: null };
const YES_NO_BADGE = {
  Yes: { background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7" },
  No:  { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" },
};

function CustomFieldRow({ field, value, isFirst, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");

  return (
    <div className="px-3 py-2.5" style={{ borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-xs font-semibold mb-1.5" style={{ color: HX.purpleLight }}>
        {field.label}
      </div>

      {field.type === "yesno" ? (
        <div className="flex gap-2">
          {["Yes", "No"].map(opt => (
            <button
              key={opt}
              onClick={() => onChange(value === opt ? null : opt)}
              className="text-xs px-3 py-1 rounded-full font-semibold border transition-all"
              style={value === opt
                ? YES_NO_BADGE[opt]
                : { color: "rgba(255,255,255,0.35)", borderColor: "rgba(255,255,255,0.15)" }}
            >
              {opt}
            </button>
          ))}
          {value && (
            <button onClick={() => onChange(null)} className="text-xs ml-auto opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "rgba(255,255,255,0.6)" }}>
              Clear
            </button>
          )}
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-sm bg-transparent border-b border-white border-opacity-30 outline-none pb-0.5"
            style={{ color: "rgba(255,255,255,0.9)" }}
          />
          <button onClick={() => { onChange(draft); setEditing(false); }}
            className="text-xs font-semibold" style={{ color: HX.green }}>Save</button>
          <button onClick={() => setEditing(false)}
            className="text-xs opacity-40 hover:opacity-70" style={{ color: "rgba(255,255,255,0.6)" }}>✕</button>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="text-sm text-left w-full group"
          style={{ color: value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }}>
          <span className="italic">{value || "Click to add…"}</span>
          <span className="ml-2 opacity-0 group-hover:opacity-60 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  );
}

function Section({ label, fields, task }) {
  const accent = SECTION_ACCENT[label] ?? SECTION_ACCENT.Other;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${accent.border}` }}>
      <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
        style={{ background: accent.bg, color: accent.label, borderBottom: `1px solid ${accent.border}` }}>
        {label}
      </div>
      <div style={{ background: "rgba(255,255,255,0.07)" }}>
        {fields.map((key, i) => (
          <FieldRow key={key} fieldKey={key} value={task[key]} label={LABELS[key]} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}

const GHOST_BTN = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80";

export default function TaskDetailPanel({ task, queue, onClose, onOpenNotes, onUpdateTask, user }) {
  if (!task) return null;

  const [dropdown, setDropdown] = useState(null); // "outcome" | "delegate" | null
  const toggle = (name) => setDropdown(d => d === name ? null : name);

  const cfg        = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const isBigQuery = queue.source === "bigquery";
  const manager    = isManager(user);
  const myTask     = task.assigned_to === user?.name;
  const unassigned = !task.assigned_to;
  const isDone     = task.status === "done" || task.status === "completed";
  const canAct     = !isDone && (unassigned || myTask || manager);

  const update = (updates) => { onUpdateTask?.(task._id, updates); setDropdown(null); };

  const claim    = () => update({ status: "in_progress", assigned_to: user?.name, assigned_by: user?.name, assigned_at: new Date().toISOString() });
  const complete = (outcome) => update({ status: "done", completion_outcome: outcome, completed_by: user?.name, completed_at: new Date().toISOString() });
  const delegate = (name)    => update({ assigned_to: name, assigned_by: user?.name, assigned_at: new Date().toISOString() });

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
    <div className="w-96 flex-shrink-0 flex flex-col min-h-0" style={{ borderLeft: `3px solid ${HX.purple}`, background: "#2D1B5C" }}>

      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0" style={{ background: HX.purpleDark, borderBottom: `1px solid ${HX.purple}` }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{queue.icon}</span>
              <span className="text-xs font-medium" style={{ color: HX.purpleLight }}>{queue.name}</span>
            </div>
            <div className="font-bold font-mono text-lg mb-3 px-2 py-1 rounded truncate"
              style={{ color: HX.yellow, background: "rgba(253,213,6,0.1)", border: "1px solid rgba(253,213,6,0.3)" }}>
              {headerTitle}
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
              {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-lg leading-none ml-3 mt-0.5 hover:opacity-60 transition-opacity"
            style={{ color: HX.purpleLight }}>✕</button>
        </div>
      </div>

      {/* Action bar */}
      {canAct && (
        <div className="flex-shrink-0 px-4 py-3 space-y-2"
          style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>

          {task.assigned_to && (
            <div className="text-xs mb-1" style={{ color: HX.purpleLight }}>
              Claimed by <span className="font-semibold text-white">{task.assigned_to}</span>
              {task.assigned_by && task.assigned_by !== task.assigned_to &&
                <span> · delegated by {task.assigned_by}</span>}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {unassigned && (
              <button onClick={claim} className={GHOST_BTN} style={{ background: HX.purple, color: "white" }}>
                ✋ Claim task
              </button>
            )}
            {myTask && task.status === "pending" && (
              <button onClick={() => update({ status: "in_progress" })} className={GHOST_BTN} style={{ background: HX.blue, color: "white" }}>
                ▶ Start
              </button>
            )}
            {(myTask || manager) && ["blocked", "escalated"].includes(task.status) && (
              <button onClick={() => update({ status: "in_progress" })} className={GHOST_BTN} style={{ background: HX.blue, color: "white" }}>
                ▶ Resume
              </button>
            )}
            {(myTask || manager) && !["pending", "done", "completed"].includes(task.status) && (
              <div className="relative">
                <button onClick={() => toggle("outcome")} className={GHOST_BTN} style={{ background: HX.green, color: "white" }}>
                  ✅ Complete ▾
                </button>
                {dropdown === "outcome" && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-52">
                    {OUTCOME_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => complete(o.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(myTask || manager) && task.status === "in_progress" && (
              <button onClick={() => update({ status: "blocked" })} className={GHOST_BTN} style={{ background: HX.red, color: "white" }}>⚠ Needs Attention</button>
            )}
            {manager && (
              <div className="relative">
                <button onClick={() => toggle("delegate")} className={`${GHOST_BTN} border`}
                  style={{ borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)" }}>
                  👤 Delegate ▾
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

      {/* Completion outcome badge */}
      {isDone && task.completion_outcome && (() => {
        const outcome = OUTCOME_OPTIONS.find(o => o.value === task.completion_outcome);
        return (
          <div className="flex-shrink-0 px-4 py-2 text-xs flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ color: HX.purpleLight }}>Outcome:</span>
            <span className="font-semibold text-white">{outcome?.emoji} {outcome?.label ?? task.completion_outcome}</span>
          </div>
        );
      })()}

      {/* Field sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Custom fields — shown for any queue that has them */}
        {(queue.customFields ?? []).length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${HX.purpleLight}` }}>
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ background: HX.purplePale, color: HX.purple, borderBottom: `1px solid ${HX.purpleLight}` }}>
              Custom Fields
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)" }}>
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
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${SECTION_ACCENT.Other.border}` }}>
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
                style={{ background: SECTION_ACCENT.Other.bg, color: SECTION_ACCENT.Other.label, borderBottom: `1px solid ${SECTION_ACCENT.Other.border}` }}>
                Details
              </div>
              <div style={{ background: "rgba(255,255,255,0.07)" }}>
                {csvDisplayFields.map((key, i) => (
                  <FieldRow key={key} fieldKey={key} value={task[key]} isFirst={i === 0} />
                ))}
              </div>
            </div>
          )
        }

        {/* Notes */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${HX.purpleLight}` }}>
          <div className="px-3 py-1.5 flex items-center justify-between"
            style={{ background: HX.purplePale, borderBottom: `1px solid ${HX.purpleLight}` }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HX.purple }}>Notes</span>
            <button onClick={() => onOpenNotes(task)} className="text-xs px-2.5 py-1 rounded font-semibold"
              style={{ background: HX.purple, color: "white" }}>
              {task.notes ? "Edit" : "+ Add"}
            </button>
          </div>
          <div className="px-3 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
            {task.notes
              ? <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>{task.notes}</p>
              : <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.25)" }}>No notes added yet</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
