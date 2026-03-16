"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";
import { STATUS_CFG } from "@/lib/constants";

export default function NotesPanel({ task, taskRef, onSave, onArchive, onClose, user }) {
  const [notes,  setNotes]  = useState(task.notes  ?? "");
  const [status, setStatus] = useState(task.status ?? "pending");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-96 h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">Task Details</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">{taskRef}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
          {/* Status selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              style={{ boxShadow: `0 0 0 2px ${HX.purpleLight}` }}
            >
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Notes textarea */}
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Agent Notes</label>
            <textarea
              className="flex-1 min-h-40 w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none bg-gray-50"
              placeholder="Log what you've done, found, or any relevant information…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Audit info */}
          {task.status_updated_by && (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Last updated by <strong>{task.status_updated_by}</strong>
              {task.status_updated_at && (
                <> on {new Date(task.status_updated_at).toLocaleString()}</>
              )}
            </div>
          )}

          {/* Save */}
          <button
            onClick={() => { onSave({ status, notes }); onClose(); }}
            className="w-full text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: HX.purple }}
          >
            Save Changes
          </button>

          {/* Archive */}
          {!task.archived && (
            <button
              onClick={() => { onArchive(); onClose(); }}
              className="w-full border border-gray-200 text-gray-500 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              📦 Archive this task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
