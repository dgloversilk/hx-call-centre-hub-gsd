"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { HX } from "@/lib/brand";

export default function Navbar({ user, onLogout, queues = [], taskData = {}, onPage }) {
  const [query,       setQuery]       = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    for (const queue of queues) {
      const tasks = taskData[queue.id] ?? [];
      for (const task of tasks) {
        const ref = (task.chips_reference ?? "").toLowerCase();
        if (ref.includes(q)) {
          out.push({ task, queue });
          if (out.length >= 20) return out;
        }
      }
    }
    return out;
  }, [query, queues, taskData]);

  const handleSelect = (queueId) => {
    onPage?.(queueId);
    setQuery("");
    setShowResults(false);
  };

  const statusColor = (status) => {
    if (status === "done" || status === "completed") return HX.green;
    if (status === "in_progress") return HX.blue;
    if (status === "blocked" || status === "escalated") return HX.red;
    return "#9CA3AF";
  };

  return (
    <div
      className="text-white px-6 py-3 flex items-center justify-between shadow-lg flex-shrink-0 z-20"
      style={{ background: HX.slate800, borderBottom: `1px solid ${HX.slate700}` }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{ background: HX.blue, color: "white" }}
        >
          HX
        </div>
        <div>
          <span className="font-semibold tracking-tight">GSD</span>
          <span className="text-xs ml-3 hidden sm:inline" style={{ color: HX.slate400 }}>
            Get Stuff Done
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 relative" ref={searchRef}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-50">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search chips reference…"
            className="w-full pl-8 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ background: HX.slate700, color: "white", border: `1px solid ${HX.slate600}` }}
          />
        </div>

        {showResults && query.trim().length >= 2 && (
          <div
            className="absolute top-10 left-0 right-0 rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50"
            style={{ background: "white" }}
          >
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No results for "{query}"</div>
            ) : (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b bg-gray-50">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {results.map(({ task, queue }, i) => (
                    <button
                      key={`${queue.id}-${task._id}-${i}`}
                      onClick={() => handleSelect(queue.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-base">{queue.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm text-gray-900">{task.chips_reference}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: `${statusColor(task.status)}22`, color: statusColor(task.status) }}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {queue.name} · {task.supplier ?? task.error_supplier ?? "—"} · {task.error_code ?? "—"}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">Go →</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* User */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium">{user?.name ?? "—"}</div>
          <div className="text-xs capitalize" style={{ color: HX.slate400 }}>{user?.role ?? "—"}</div>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ background: HX.blue, color: "white" }}
        >
          {user?.initials ?? user?.name?.[0] ?? "?"}
        </div>
        <button
          onClick={onLogout}
          className="text-xs hover:opacity-80 transition-opacity"
          style={{ color: HX.slate400 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
