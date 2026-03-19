"use client";

import { useState, useRef } from "react";
import { HX } from "@/lib/brand";

export default function QueuePriority({ queues, taskData, onReorder, onMove }) {
  const [dragIdx, setDragIdx]   = useState(null);
  const [overIdx, setOverIdx]   = useState(null);
  const dragRef = useRef(null);

  const handleDragStart = (idx) => (e) => {
    setDragIdx(idx);
    dragRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== overIdx) setOverIdx(idx);
  };

  const handleDrop = (dropIdx) => (e) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx !== null && fromIdx !== dropIdx) {
      onMove(fromIdx, dropIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Queue Priority</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag queues into the order agents should work through them. #1 appears at the top of every agent's task list.
        </p>
      </div>

      <div className="space-y-1.5">
        {queues.map((q, idx) => {
          const tasks   = taskData[q.id] ?? [];
          const active  = tasks.filter(t => !t.archived);
          const pending = active.filter(t => t.status === "pending").length;
          const attn    = active.filter(t => t.status === "blocked" || t.status === "escalated").length;
          const isDragging = dragIdx === idx;
          const isOver     = overIdx === idx && dragIdx !== idx;

          return (
            <div
              key={q.id}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-4 bg-white rounded-xl border-2 px-5 py-4 cursor-grab active:cursor-grabbing transition-all select-none"
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderColor: isOver ? HX.purple : "#E5E7EB",
                borderTopColor: isOver ? HX.purple : "#E5E7EB",
                background: isOver ? HX.purplePale : "white",
                transform: isDragging ? "scale(0.98)" : "scale(1)",
              }}
            >
              {/* Drag handle */}
              <span className="text-gray-300 text-lg flex-shrink-0 select-none" title="Drag to reorder">⠿</span>

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
