"use client";

import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";

// Fields to skip — internal or shown elsewhere
const SKIP = new Set(["_id", "_queueId", "_queueName", "_queueIcon", "_firstCol", "archived", "archived_at", "archived_by", "status_updated_at", "status_updated_by"]);

// Human-readable labels for known fields
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
  notes:            "Notes",
  completed_by:     "Completed By",
  completed_at:     "Completed At",
  status:           "Status",
};

function formatValue(key, val) {
  if (!val && val !== 0) return <span className="text-gray-300 italic">—</span>;
  if (key === "completed_at") {
    try {
      return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {}
  }
  return String(val);
}

export default function TaskDetailPanel({ task, queue, onClose, onOpenNotes }) {
  if (!task) return null;

  const cfg = STATUS_CFG[task.status] ?? STATUS_CFG.pending;

  // All fields except skipped ones
  const fields = Object.keys(task).filter(k => !SKIP.has(k) && k !== "status" && k !== "notes");

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col min-h-0 shadow-xl">

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start justify-between flex-shrink-0" style={{ background: HX.purplePale }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span>{queue.icon}</span>
            <span className="text-xs font-medium text-gray-500">{queue.name}</span>
          </div>
          <div className="font-bold text-gray-900 font-mono text-base">{task.chips_reference ?? task._id}</div>
          <div className="mt-2">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
              {cfg.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5"
        >
          ✕
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {fields.map(key => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {LABELS[key] ?? key.replace(/_/g, " ")}
            </span>
            <span
              className={`text-sm text-gray-800 break-words ${
                key === "error_message" || key === "error_info" ? "leading-relaxed" : ""
              } ${
                key === "error_code" || key === "booking_action" || key === "chips_reference"
                  ? "font-mono bg-gray-50 px-2 py-0.5 rounded text-xs"
                  : ""
              }`}
            >
              {formatValue(key, task[key])}
            </span>
          </div>
        ))}

        {/* Notes section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</span>
            <button
              onClick={() => onOpenNotes(task)}
              className="text-xs px-2 py-1 rounded border font-medium"
              style={{ borderColor: HX.purpleLight, color: HX.purple, background: HX.purplePale }}
            >
              {task.notes ? "Edit" : "+ Add"}
            </button>
          </div>
          {task.notes
            ? <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.notes}</p>
            : <p className="text-sm text-gray-300 italic">No notes added yet</p>
          }
        </div>
      </div>
    </div>
  );
}
