"use client";

import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";

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
};

function formatValue(key, val) {
  if (!val && val !== 0) return null;
  if (key === "completed_at" || key === "error_time") {
    try {
      return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {}
  }
  return String(val);
}

export default function TaskDetailPanel({ task, queue, onClose, onOpenNotes }) {
  if (!task) return null;

  const cfg = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const taskFields = new Set(Object.keys(task).filter(k => !SKIP.has(k) && k !== "status" && k !== "notes"));

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
              className="font-bold font-mono text-lg mb-3 px-2 py-1 rounded"
              style={{ color: HX.yellow, background: "rgba(253,213,6,0.1)", border: `1px solid rgba(253,213,6,0.3)` }}
            >
              {task.chips_reference ?? task._id}
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

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {SECTIONS.map(section => {
          // Always show all fields in every section — newly created tasks
          // may be missing keys that seed tasks have, so we render "—" rather
          // than hiding entire sections.
          const sectionFields = section.fields;
          const accent = SECTION_ACCENT[section.label];

          return (
            <div
              key={section.label}
              className="rounded-lg overflow-hidden"
              style={{ border: `1px solid ${accent.border}` }}
            >
              {/* Section header */}
              <div
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
                style={{ background: accent.bg, color: accent.label, borderBottom: `1px solid ${accent.border}` }}
              >
                {section.label}
              </div>

              {/* Fields */}
              <div style={{ background: "rgba(255,255,255,0.07)" }}>
                {sectionFields.map((key, i) => {
                  const val = formatValue(key, task[key]);
                  return (
                    <div
                      key={key}
                      className="px-3 py-2.5"
                      style={{
                        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      <div className="text-xs font-semibold mb-0.5" style={{ color: HX.purpleLight }}>
                        {LABELS[key] ?? key.replace(/_/g, " ")}
                      </div>
                      {val ? (
                        <div
                          className={`text-sm break-words leading-snug ${
                            key === "error_code" || key === "booking_action" || key === "chips_reference"
                              ? "font-mono"
                              : ""
                          }`}
                          style={{
                            color: key === "error_code" || key === "error_message" || key === "error_info"
                              ? HX.redLight
                              : key === "chips_reference"
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
                })}
              </div>
            </div>
          );
        })}

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
