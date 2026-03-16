"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";

/**
 * AddTaskModal — simple form to manually create a task in a queue.
 * Renders a field for each of the queue's displayCols.
 */
export default function AddTaskModal({ queue, onSave, onClose }) {
  const cols = queue.displayCols ?? [];

  // Initialise form state with empty strings for each column
  const [fields, setFields] = useState(() =>
    Object.fromEntries(cols.map(c => [c, ""]))
  );

  const set = (col, val) => setFields(prev => ({ ...prev, [col]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Strip completely empty fields so they don't clutter the row
    const cleaned = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v.trim() !== "")
    );
    onSave(cleaned);
  };

  // Friendly label from snake_case
  const label = (col) =>
    col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: HX.purple }}
        >
          <div>
            <h2 className="text-white font-bold text-base">Add task to {queue.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: HX.purpleLight }}>
              Fill in the fields below — task will be added as Pending
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white opacity-70 hover:opacity-100 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {cols.map(col => (
              <div key={col}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label(col)}
                </label>
                <input
                  type="text"
                  value={fields[col]}
                  onChange={e => set(col, e.target.value)}
                  placeholder={`Enter ${label(col).toLowerCase()}…`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                  onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: HX.purple }}
            >
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
