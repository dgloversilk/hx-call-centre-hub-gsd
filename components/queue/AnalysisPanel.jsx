"use client";

import { useMemo } from "react";
import { HX } from "@/lib/brand";
import { analyzeData } from "@/lib/analysis";

export default function AnalysisPanel({ queue, tasks, initialCount }) {
  const activeTasks = tasks.filter(t => !t.archived);
  const cols = queue.displayCols ?? [];
  const analysis = useMemo(() => analyzeData(activeTasks, cols), [activeTasks, cols]);

  const done    = activeTasks.filter(t => t.status === "completed").length;
  const inProg  = activeTasks.filter(t => t.status === "in_progress").length;
  const blocked = activeTasks.filter(t => t.status === "blocked" || t.status === "escalated").length;

  return (
    <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
      <h3 className="font-bold text-gray-900 text-lg mb-1">Queue Analysis</h3>
      <p className="text-gray-500 text-sm mb-6">
        Automatic insights on the input data and current output state.
      </p>

      {/* Input → Output */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h4 className="font-semibold text-gray-800 mb-4">Input → Output</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="rounded-lg p-4 border-2" style={{ background: HX.purplePale, borderColor: HX.purpleLight }}>
            <div className="text-2xl font-bold" style={{ color: HX.purple }}>{initialCount}</div>
            <div className="text-xs mt-1 font-medium" style={{ color: HX.purpleDark }}>Loaded In</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{inProg}</div>
            <div className="text-xs text-blue-600 mt-1 font-medium">In Progress</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{blocked}</div>
            <div className="text-xs text-red-600 mt-1 font-medium">Needs Attention</div>
          </div>
          <div className="rounded-lg p-4 border-2" style={{ background: HX.yellowLight, borderColor: HX.yellowDark }}>
            <div className="text-2xl font-bold" style={{ color: "#7A6200" }}>{done}</div>
            <div className="text-xs mt-1 font-medium" style={{ color: "#7A6200" }}>Completed</div>
          </div>
        </div>

        {activeTasks.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((done / activeTasks.length) * 100)}% complete</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${(inProg  / activeTasks.length) * 100}%`, background: HX.purpleLight }} className="h-full" />
              <div style={{ width: `${(blocked / activeTasks.length) * 100}%` }} className="h-full bg-red-400" />
              <div style={{ width: `${(done    / activeTasks.length) * 100}%`, background: HX.yellow      }} className="h-full" />
            </div>
          </div>
        )}
      </div>

      {/* Column breakdowns */}
      <h4 className="font-semibold text-gray-800 mb-3">Column Breakdown</h4>
      <div className="grid grid-cols-2 gap-4">
        {analysis.map(col => (
          <div key={col.key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-800 text-sm capitalize">
                {col.key.replace(/_/g, " ")}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {col.uniqueCount} unique
              </span>
            </div>
            <div className="space-y-2">
              {col.topValues.slice(0, 4).map(([val, count]) => {
                const pct = col.total > 0 ? Math.round((count / col.total) * 100) : 0;
                return (
                  <div key={val}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 truncate max-w-32">{val || "(blank)"}</span>
                      <span className="text-gray-500 font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: col.isFlag && val === "Yes" ? "#F97316" : HX.purple,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {col.uniqueCount > 4 && (
                <div className="text-xs text-gray-400">+{col.uniqueCount - 4} more values</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
