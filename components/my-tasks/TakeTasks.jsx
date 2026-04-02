"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";

const AMOUNTS = [5, 10, 15, 20];

export default function TakeTasks({ queues, taskData, user, onUpdateTask }) {
  const [mode,         setMode]         = useState(null);   // "top" | "custom" | null
  const [customAmount, setCustomAmount] = useState(5);
  const [customQueue,  setCustomQueue]  = useState("");
  const [taken,        setTaken]        = useState(null);   // result message

  // Queues with available pending tasks
  const availableQueues = queues.filter(q => {
    const pending = (taskData[q.id] ?? []).filter(t => t.status === "pending" && !t.archived);
    return pending.length > 0;
  });

  const highestPriorityQueue = availableQueues[0] ?? null;

  function takeTasks(queueId, amount) {
    const tasks = (taskData[queueId] ?? [])
      .filter(t => t.status === "pending" && !t.archived)
      .slice(0, amount);

    if (tasks.length === 0) return setTaken({ count: 0, queueId });

    const now = new Date().toISOString();
    tasks.forEach(t => {
      onUpdateTask(queueId, t._id, {
        status:      "in_progress",
        assigned_to: user?.email ?? user?.name,
        assigned_by: user?.email ?? user?.name,
        assigned_at: now,
        status_updated_at: now,
        status_updated_by: user?.email ?? user?.name,
      }, user);
    });

    setTaken({ count: tasks.length, queueId });
    setMode(null);
  }

  const queueName = (id) => queues.find(q => q.id === id)?.name ?? id;

  return (
    <div
      className="rounded-xl border-2 p-4 mb-4 flex-shrink-0"
      style={{ borderColor: HX.purpleLight, background: HX.purplePale }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-sm" style={{ color: HX.purpleDark }}>Take tasks</div>
          <div className="text-xs text-gray-500 mt-0.5">Assign pending tasks to yourself to start working</div>
        </div>

        {/* Buttons */}
        {!mode && !taken && (
          <div className="flex gap-2 flex-wrap">
            {highestPriorityQueue ? (
              <button
                onClick={() => setMode("top")}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ background: HX.purple }}
              >
                Take 5 from {highestPriorityQueue.icon} {highestPriorityQueue.name}
              </button>
            ) : (
              <span className="text-xs text-gray-400 italic">No pending tasks available</span>
            )}
            <button
              onClick={() => { setMode("custom"); setCustomQueue(availableQueues[0]?.id ?? ""); }}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: "white", color: HX.purple, border: `2px solid ${HX.purple}` }}
            >
              Choose queue & amount
            </button>
          </div>
        )}

        {/* Confirm: take 5 from top */}
        {mode === "top" && highestPriorityQueue && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">
              Take <strong>5</strong> pending tasks from <strong>{highestPriorityQueue.name}</strong>?
            </span>
            <button
              onClick={() => takeTasks(highestPriorityQueue.id, 5)}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
              style={{ background: HX.purple }}
            >
              Confirm
            </button>
            <button
              onClick={() => setMode(null)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Custom: pick queue + amount */}
        {mode === "custom" && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Queue picker */}
            <select
              value={customQueue}
              onChange={e => setCustomQueue(e.target.value)}
              className="text-sm border-2 border-gray-200 rounded-lg px-3 py-1.5 outline-none"
              style={{ borderColor: HX.purple }}
            >
              {availableQueues.map(q => (
                <option key={q.id} value={q.id}>
                  {q.icon} {q.name} ({(taskData[q.id] ?? []).filter(t => t.status === "pending" && !t.archived).length} pending)
                </option>
              ))}
            </select>

            {/* Amount picker */}
            <div className="flex gap-1">
              {AMOUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setCustomAmount(n)}
                  className="text-sm font-semibold w-10 h-8 rounded-lg transition-all"
                  style={
                    customAmount === n
                      ? { background: HX.purple, color: "white" }
                      : { background: "white", color: HX.purple, border: `2px solid ${HX.purple}` }
                  }
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={() => takeTasks(customQueue, customAmount)}
              disabled={!customQueue}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: HX.purple }}
            >
              Take {customAmount}
            </button>
            <button
              onClick={() => setMode(null)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Result */}
        {taken && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: HX.green }}>
              {taken.count > 0
                ? `✅ Took ${taken.count} task${taken.count !== 1 ? "s" : ""} from ${queueName(taken.queueId)}`
                : `⚠️ No pending tasks in ${queueName(taken.queueId)}`
              }
            </span>
            <button
              onClick={() => setTaken(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Take more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
