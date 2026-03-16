"use client";

import { useState, useRef, useCallback } from "react";
import { HX } from "@/lib/brand";

const TASK_DEFAULTS = {
  status: "pending", notes: "", archived: false,
  archived_at: null, archived_by: null,
  completed_by: null, completed_at: null,
  status_updated_at: null, status_updated_by: null,
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (values[idx] ?? "").trim(); });
    return obj;
  });
}

function splitCsvLine(line) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ── Shared CSV drop zone + upload flow ──────────────────────────────────────
function CsvFlow({ mode, queues, onAddQueue, onImportToQueue, onBack }) {
  const isNew = mode === "new";

  const [file,       setFile]       = useState(null);
  const [parsed,     setParsed]     = useState(null);
  const [parseError, setParseError] = useState(null);
  const [targetId,   setTargetId]   = useState(queues[0]?.id ?? "");
  const [newName,    setNewName]     = useState("");
  const [dragging,   setDragging]   = useState(false);
  const [done,       setDone]       = useState(false);
  const [imported,   setImported]   = useState(0);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setParseError(null); setParsed(null); setDone(false); setFile(f);
    if (isNew) setNewName(f.name.replace(/\.csv$/i, "").replace(/_/g, " "));
    const reader = new FileReader();
    reader.onload = (e) => {
      try { const rows = parseCsv(e.target.result); setParsed({ headers: Object.keys(rows[0] ?? {}), rows }); }
      catch (err) { setParseError(err.message); }
    };
    reader.readAsText(f);
  }, [isNew]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f); else setParseError("Please drop a .csv file.");
  }, [handleFile]);

  const handleImport = () => {
    if (!parsed) return;
    const ts = Date.now();
    if (isNew) {
      const id = `csv_${ts}`;
      onAddQueue({
        id, name: newName.trim() || file.name.replace(/\.csv$/i, ""), icon: "📋",
        description: `Uploaded from ${file.name}`, source: "csv", schedule: "Manual upload",
        displayCols: Object.keys(parsed.rows[0] ?? {}),
        initialData: parsed.rows.map((r, i) => ({ _id: `${id}_${i}`, ...r, ...TASK_DEFAULTS })),
      });
    } else {
      onImportToQueue(targetId, parsed.rows.map((r, i) => ({ _id: `csv_${targetId}_${ts}_${i}`, ...r, ...TASK_DEFAULTS })));
    }
    setImported(parsed.rows.length); setDone(true);
  };

  if (done) {
    const queueName = isNew ? (newName.trim() || file?.name) : queues.find(q => q.id === targetId)?.name;
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-10">
        <div className="text-5xl">✅</div>
        <div className="text-xl font-semibold text-gray-800">
          {imported} rows {isNew ? "added as new task type" : "imported into"}{" "}
          <span style={{ color: HX.purple }}>{queueName}</span>
        </div>
        <button onClick={onBack} className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: HX.purple }}>
          Back to queues
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-8 py-5 border-b flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isNew ? "Create new task type" : "Add rows to existing task"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isNew
              ? "Upload a CSV — each row becomes a task in a brand new queue"
              : "Upload a CSV to add rows to an existing queue"}
          </p>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-3xl w-full mx-auto space-y-7">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragging ? HX.purple : "#D1D5DB", background: dragging ? HX.purplePale : "#FAFAFA" }}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <div className="text-4xl mb-3">📂</div>
          {file ? (
            <div>
              <p className="font-semibold text-gray-800">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">Click or drop to replace</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-gray-700">Drop a CSV file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse · supports exports from BigQuery, Excel, Google Sheets</p>
            </div>
          )}
        </div>

        {parseError && (
          <div className="rounded-lg px-4 py-3 text-sm font-medium"
            style={{ background: HX.redPale, color: HX.redDark }}>⚠️ {parseError}</div>
        )}

        {parsed && (
          <>
            {/* Preview */}
            <div className="rounded-lg border overflow-auto">
              <div className="px-4 py-3 border-b" style={{ background: HX.purplePale }}>
                <span className="font-semibold text-sm" style={{ color: HX.purple }}>
                  Preview — {parsed.rows.length} rows · {parsed.headers.length} columns
                </span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>{parsed.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>{parsed.headers.map(h => (
                      <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">{row[h]}</td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-400 border-t">…and {parsed.rows.length - 5} more rows</div>
              )}
            </div>

            {/* Config: name (new) or target queue (existing) */}
            {isNew ? (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Task type name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Refunds — March 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Add to queue</label>
                <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none">
                  {queues.map(q => <option key={q.id} value={q.id}>{q.icon} {q.name}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleImport}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm"
              style={{ background: HX.purple }}>
              {isNew
                ? `Create "${newName.trim() || file?.name}" with ${parsed.rows.length} tasks`
                : `Import ${parsed.rows.length} rows → ${queues.find(q => q.id === targetId)?.name}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Landing: two option cards ────────────────────────────────────────────────
function ModeSelect({ onSelect }) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Tasks</h1>
      <p className="text-gray-500 text-sm mb-10">What would you like to do?</p>
      <div className="flex gap-6 w-full max-w-xl">
        {[
          { mode: "new",      icon: "📋", title: "Create new task type", sub: "Upload a CSV — becomes a brand new queue" },
          { mode: "existing", icon: "➕", title: "Add rows to existing task", sub: "Upload a CSV — rows added to an existing queue" },
        ].map(({ mode, icon, title, sub }) => (
          <button key={mode} onClick={() => onSelect(mode)}
            className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 text-center transition-all hover:shadow-lg"
            style={{ borderColor: HX.purpleLight }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = HX.purple; e.currentTarget.style.background = HX.purplePale; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = HX.purpleLight; e.currentTarget.style.background = ""; }}
          >
            <span className="text-4xl">{icon}</span>
            <div>
              <div className="font-bold text-gray-900 text-base">{title}</div>
              <div className="text-sm text-gray-500 mt-1">{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Root export ──────────────────────────────────────────────────────────────
export default function UploadPage({ queues, onAddQueue, onImportToQueue, onAddTask, onBack }) {
  const [mode, setMode] = useState(null);

  if (mode) return (
    <CsvFlow
      mode={mode}
      queues={queues}
      onAddQueue={onAddQueue}
      onImportToQueue={onImportToQueue}
      onBack={() => setMode(null)}
    />
  );

  return <ModeSelect onSelect={setMode} />;
}
