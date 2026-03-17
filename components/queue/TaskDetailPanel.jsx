"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG, OUTCOME_OPTIONS, MOCK_USERS } from "@/lib/constants";

const SKIP = new Set(["_id", "_queueId", "_queueName", "_queueIcon", "_firstCol", "archived", "archived_at", "archived_by", "status_updated_at", "status_updated_by"]);

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

// Sections ordered to match flat file column order:
// error_type, error_supplier, agent*, booking_platform, country, category,
// chips_reference, chipscode, supplier, booking_action, error_code, error_info, error_message, start_date, error_time
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

// All fields that belong to a known section — anything else goes in "Other"
const KNOWN_FIELDS = new Set(SECTIONS.flatMap(s => s.fields));

function formatValue(key, val) {
  if (!val && val !== 0) return null;
  if (key === "completed_at" || key === "error_time") {
    try {
      return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {}
  }
  return String(val);
}

// Render a single field row (shared between BQ sections and CSV flat view)
function FieldRow({ fieldKey, value, label, isFirst }) {
  const val = formatValue(fieldKey, value);
  return (
    <div
      className="px-3 py-2.5"
      style={{ borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="text-xs font-semibold mb-0.5" style={{ color: HX.purpleLight }}>
        {label ?? fieldKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </div>
      {val ? (
        <div
          className={`text-sm break-words leading-snug ${
            fieldKey === "error_code" || fieldKey === "booking_action" || fieldKey === "chips_reference"
              ? "font-mono" : ""
          }`}
          style={{
            color: fieldKey === "error_code" || fieldKey === "error_message" || fieldKey === "error_info"
              ? HX.redLight
              : fieldKey === "chips_reference"
              ? HX.yellow
              : "rgba(255,255,255,0.9)",
          }}
        >
          {val}
        </div>
      ) : (
        <div className="text-xs italic" style={{ color: "rgba(255,255,255,0.2)" }}>—</div>
      )}
    </div>
  );
}

export default function TaskDetailPanel({ task, queue, onClose, onOpenNotes, onUpdateTask, user }) {
  if (!task) return null;

  const [showOutcome,  setShowOutcome]  = useState(false);
  const [showDelegate, setShowDelegate] = useState(false);

  const cfg        = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const isBigQuery = queue.source === "bigquery";
  const isManager  = user?.role === "Manager" || user?.role === "Owner";
  const myTask     = task.assigned_to === user?.name;
  const unassigned = !task.assigned_to;
  const isDone     = task.status === "done" || task.status === "completed";

  // Anyone who can act: unassigned tasks (anyone can claim), my tasks, or managers
  const canAct = !isDone && (unassigned || myTask || isManager);

  const handleClaim = () => {
    onUpdateTask?.(task._id, {
      status:      "in_progress",
      assigned_to: user?.name,
      assigned_by: user?.name,
      assigned_at: new Date().toISOString(),
    });
  };

  const handleDelegate = (agentName) => {
    onUpdateTask?.(task._id, {
      assigned_to: agentName,
      assigned_by: user?.name,
      assigned_at: new Date().toISOString(),
    });
    setShowDelegate(false);
  };

  const handleComplete = (outcome) => {
    onUpdateTask?.(task._id, {
      status:             "done",
      completion_outcome: outcome,
      completed_by:       user?.name,
      completed_at:       new Date().toISOString(),
    });
    setShowOutcome(false);
  };

  const handleEscalate = () => onUpdateTask?.(task._id, { status: "escalated" });
  const handleBlock    = () => onUpdateTask?.(task._id, { status: "blocked"   });
  const handleResume   = () => onUpdateTask?.(task._id, { status: "in_progress" });

  const agentList = MOCK_USERS.filter(u => u.name !== user?.name);

  // For CSV queues: use displayCols order, then append any keys not already listed
  const csvDisplayFields = (() => {
    if (isBigQuery) return [];
    const skipSet = new Set([...SKIP, "status", "notes"]);
    const declared = (queue.displayCols ?? []).filter(k => !skipSet.has(k));
    const extra = Object.keys(task).filter(k => !skipSet.has(k) && !declared.includes(k) && k !== "status" && k !== "notes");
    return [...declared, ...extra];
  })();

  const headerTitle = isBigQuery
    ? (task.chips_reference ?? task._id)
    : (task[queue.primaryKey] ?? task[(queue.displayCols ?? [])[0]] ?? task._id);

  return (
    <div
      className="w-96 flex-shrink-0 flex flex-col min-h-0"
      style={{ borderLeft: `3px solid ${HX.purple}`, background: "#2D1B5C" }}
    >
      {/* Header — dark purple */}
      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ background: HX.purpleDark, borderBottom: `1px solid ${HX.purple}` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{queue.icon}</span>
              <span className="text-xs font-medium" style={{ color: HX.purpleLight }}>{queue.name}</span>
            </div>
            <div
              className="font-bold font-mono text-lg mb-3 px-2 py-1 rounded truncate"
              style={{ color: HX.yellow, background: "rgba(253,213,6,0.1)", border: `1px solid rgba(253,213,6,0.3)` }}
            >
              {headerTitle}
            </div>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
              {cfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none ml-3 mt-0.5 hover:opacity-60 transition-opacity"
            style={{ color: HX.purpleLight }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      {canAct && (
        <div className="flex-shrink-0 px-4 py-3 space-y-2"
          style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>

          {/* Assigned-to indicator */}
          {task.assigned_to && (
            <div className="text-xs mb-1" style={{ color: HX.purpleLight }}>
              Claimed by <span className="font-semibold text-white">{task.assigned_to}</span>
              {task.assigned_by && task.assigned_by !== task.assigned_to &&
                <span> · delegated by {task.assigned_by}</span>}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {/* Claim — unassigned tasks */}
            {unassigned && (
              <button onClick={handleClaim}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: HX.purple, color: "white" }}>
                ✋ Claim task
              </button>
            )}

            {/* Start — assigned to me, still pending */}
            {myTask && task.status === "pending" && (
              <button onClick={() => onUpdateTask?.(task._id, { status: "in_progress" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: HX.blue, color: "white" }}>
                ▶ Start
              </button>
            )}

            {/* Resume — blocked/escalated, mine or manager */}
            {(myTask || isManager) && (task.status === "blocked" || task.status === "escalated") && (
              <button onClick={handleResume}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: HX.blue, color: "white" }}>
                ▶ Resume
              </button>
            )}

            {/* Mark complete ▾ — in_progress/blocked/escalated, mine or manager */}
            {(myTask || isManager) && !["pending","done","completed"].includes(task.status) && (
              <div className="relative">
                <button onClick={() => { setShowOutcome(v => !v); setShowDelegate(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: HX.green, color: "white" }}>
                  ✅ Complete ▾
                </button>
                {showOutcome && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-52">
                    {OUTCOME_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => handleComplete(o.value)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span>{o.emoji}</span>{o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Escalate & Block — in_progress, mine or manager */}
            {(myTask || isManager) && task.status === "in_progress" && (
              <>
                <button onClick={handleEscalate}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: HX.orange, color: "white" }}>
                  ⬆️ Escalate
                </button>
                <button onClick={handleBlock}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: HX.red, color: "white" }}>
                  🚫 Block
                </button>
              </>
            )}

            {/* Delegate ▾ — managers always see this on non-done tasks */}
            {isManager && (
              <div className="relative">
                <button onClick={() => { setShowDelegate(v => !v); setShowOutcome(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80"
                  style={{ borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)" }}>
                  👤 Delegate ▾
                </button>
                {showDelegate && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-44">
                    {agentList.map(u => (
                      <button key={u.id} onClick={() => handleDelegate(u.name)}
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

      {/* completion outcome badge — shown when task is done */}
      {isDone && task.completion_outcome && (
        <div className="flex-shrink-0 px-4 py-2 text-xs flex items-center gap-2"
          style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ color: HX.purpleLight }}>Outcome:</span>
          <span className="font-semibold text-white">
            {OUTCOME_OPTIONS.find(o => o.value === task.completion_outcome)?.emoji}{" "}
            {OUTCOME_OPTIONS.find(o => o.value === task.completion_outcome)?.label ?? task.completion_outcome}
          </span>
        </div>
      )}

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {isBigQuery ? (
          // ── BigQuery failed-gateway layout: hardcoded sections ──────────
          <>
            {SECTIONS.map(section => {
              const accent = SECTION_ACCENT[section.label];
              return (
                <div key={section.label} className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${accent.border}` }}>
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
                    style={{ background: accent.bg, color: accent.label, borderBottom: `1px solid ${accent.border}` }}>
                    {section.label}
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.07)" }}>
                    {section.fields.map((key, i) => (
                      <FieldRow key={key} fieldKey={key} value={task[key]} label={LABELS[key]} isFirst={i === 0} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          // ── CSV queue layout: flat list using the file's own columns ────
          <div className="rounded-lg overflow-hidden"
            style={{ border: `1px solid ${SECTION_ACCENT.Other.border}` }}>
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
        )}

        {/* Notes section */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: `1px solid ${HX.purpleLight}` }}
        >
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{ background: HX.purplePale, borderBottom: `1px solid ${HX.purpleLight}` }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HX.purple }}>Notes</span>
            <button
              onClick={() => onOpenNotes(task)}
              className="text-xs px-2.5 py-1 rounded font-semibold"
              style={{ background: HX.purple, color: "white" }}
            >
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
