"use client";

import { HX } from "@/lib/brand";

export default function QueuePriority({ queues, taskData, onReorder }) {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Queue Priority</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag queues into the order agents should work through them. #1 appears at the top of every agent's My Tasks list.
        </p>
      </div>

      <div className="space-y-2">
        {queues.map((q, idx) => {
          const tasks   = taskData[q.id] ?? [];
          const active  = tasks.filter(t => !t.archived);
          const pending = active.filter(t => t.status === "pending").length;
          const attn    = active.filter(t => t.status === "blocked" || t.status === "escalated").length;

          return (
            <div
              key={q.id}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              {/* Priority number */}
              <span
                className="text-lg font-black w-8 text-center flex-shrink-0"
                style={{ color: idx === 0 ? HX.purple : idx === 1 ? HX.blue : "#9CA3AF" }}
              >
                {idx + 1}
              </span>

              {/* Queue info */}
              <span className="text-xl">{q.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">{q.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                  <span>{active.length} outstanding</span>
                  {pending > 0 && <span>· {pending} pending</span>}
                  {attn > 0 && <span style={{ color: "#B91C1C" }}>· {attn} needs attention</span>}
                </div>
              </div>

              {/* Move controls */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => onReorder(q.id, -1)}
                  disabled={idx === 0}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-25"
                  style={{ borderColor: HX.purpleLight, color: HX.purple }}
                  onMouseEnter={e => { if (idx !== 0) e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                >
                  ▲ Up
                </button>
                <button
                  onClick={() => onReorder(q.id, 1)}
                  disabled={idx === queues.length - 1}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-25"
                  style={{ borderColor: HX.purpleLight, color: HX.purple }}
                  onMouseEnter={e => { if (idx !== queues.length - 1) e.currentTarget.style.background = HX.purplePale; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                >
                  ▼ Down
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Changes apply immediately — agents will see the new order next time they load My Tasks.
      </p>
    </div>
  );
}
