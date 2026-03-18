"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { HX } from "@/lib/brand";

const TASK_DEFAULTS = {
  status: "pending", notes: "", archived: false,
  archived_at: null, archived_by: null,
  completed_by: null, completed_at: null,
  status_updated_at: null, status_updated_by: null,
};

const SYSTEM_FIELDS = [
  "_id", "status", "notes", "archived", "archived_at", "archived_by",
  "completed_by", "completed_at", "status_updated_at", "status_updated_by",
  "assigned_to", "created_at",
];

// ── CSV parsing helpers ───────────────────────────────────────────────────────

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

function parseCsvWithHeaders(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("Need at least a header row and one data row.");
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

function parseCsvNoHeaders(text, headers) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  const rows = lines.map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

// Detect if first line looks like headers (many values match known column names)
function looksLikeHeaders(firstLine, knownCols) {
  if (!knownCols.length) return true;
  const vals = splitCsvLine(firstLine).map(v => v.trim().toLowerCase());
  const cols  = knownCols.map(c => c.toLowerCase());
  const matches = vals.filter(v => cols.includes(v)).length;
  return matches >= Math.min(2, cols.length * 0.4);
}

// Row fingerprint for duplicate detection
function rowFingerprint(obj, cols) {
  return cols.map(c => (obj[c] ?? "").toString().trim().toLowerCase()).join("|||");
}

// ── "Add to existing queue" smart flow ───────────────────────────────────────

function ExistingFlow({ queues, taskData, onImportToQueue, onBack }) {
  const [stage,      setStage]      = useState("queue_select"); // queue_select | input | review | done
  const [targetId,   setTargetId]   = useState(queues[0]?.id ?? "");
  const [rawText,    setRawText]    = useState("");
  const [parsed,     setParsed]     = useState(null);  // { headers, rows }
  const [hasHeaders, setHasHeaders] = useState(true);
  const [parseError, setParseError] = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [imported,   setImported]   = useState(0);
  const fileRef = useRef();

  const targetQueue    = queues.find(q => q.id === targetId);
  const existingTasks  = taskData[targetId] ?? [];
  const existingCols   = useMemo(() => {
    if (targetQueue?.displayCols?.length) return targetQueue.displayCols;
    const first = existingTasks.find(t => !t.archived);
    if (!first) return [];
    return Object.keys(first).filter(k => !SYSTEM_FIELDS.includes(k));
  }, [targetQueue, existingTasks]);

  // Existing task fingerprints for duplicate detection
  const existingFingerprints = useMemo(() => {
    const cols = existingCols;
    if (!cols.length) return new Set();
    return new Set(existingTasks.map(t => rowFingerprint(t, cols)));
  }, [existingTasks, existingCols]);

  // Parse raw text into rows
  const handleParse = useCallback(() => {
    setParseError(null);
    const text = rawText.trim();
    if (!text) { setParseError("Please paste or upload some CSV data first."); return; }
    try {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const firstLine = lines[0] ?? "";
      const autoHasHeaders = looksLikeHeaders(firstLine, existingCols);
      setHasHeaders(autoHasHeaders);
      const result = autoHasHeaders
        ? parseCsvWithHeaders(text)
        : parseCsvNoHeaders(text, existingCols);
      setParsed(result);
      setStage("review");
    } catch (err) {
      setParseError(err.message);
    }
  }, [rawText, existingCols]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => { setRawText(e.target.result); };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f);
    else setParseError("Please drop a .csv file.");
  }, [handleFile]);

  // Compute duplicate/new rows split
  const { newRows, dupRows, csvCols, colStatus } = useMemo(() => {
    if (!parsed) return { newRows: [], dupRows: [], csvCols: [], colStatus: {} };
    const csvCols = parsed.headers;
    const colStatus = {};
    csvCols.forEach(c => {
      if (existingCols.includes(c)) colStatus[c] = "match";
      else colStatus[c] = "new";
    });
    existingCols.forEach(c => {
      if (!colStatus[c]) colStatus[c] = "missing";
    });

    // For dup detection use the intersection of existing + csv cols
    const sharedCols = existingCols.filter(c => csvCols.includes(c));
    const fingerprintFn = sharedCols.length
      ? (obj) => rowFingerprint(obj, sharedCols)
      : null;

    const newRows = [];
    const dupRows = [];
    parsed.rows.forEach(row => {
      if (fingerprintFn && existingFingerprints.has(fingerprintFn(row))) {
        dupRows.push(row);
      } else {
        newRows.push(row);
      }
    });
    return { newRows, dupRows, csvCols, colStatus };
  }, [parsed, existingCols, existingFingerprints]);

  const handleImport = () => {
    if (!newRows.length) return;
    const ts = Date.now();
    onImportToQueue(
      targetId,
      newRows.map((r, i) => ({ _id: `csv_${targetId}_${ts}_${i}`, ...r, ...TASK_DEFAULTS }))
    );
    setImported(newRows.length);
    setStage("done");
  };

  // ── STAGE: done ──────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-10">
        <div className="text-5xl">✅</div>
        <div className="text-xl font-semibold text-gray-800">
          {imported} new row{imported !== 1 ? "s" : ""} added to{" "}
          <span style={{ color: HX.purple }}>{targetQueue?.name}</span>
        </div>
        {dupRows.length > 0 && (
          <div className="text-sm text-gray-500">{dupRows.length} exact duplicate{dupRows.length !== 1 ? "s" : ""} were skipped.</div>
        )}
        <button onClick={onBack} className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: HX.purple }}>
          Back to queues
        </button>
      </div>
    );
  }

  // ── STAGE: queue_select ──────────────────────────────────────────────────
  if (stage === "queue_select") {
    const sampleTask = existingTasks.find(t => !t.archived) ?? existingTasks[0];
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="px-8 py-5 border-b flex items-center gap-4 flex-shrink-0">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add rows to existing queue</h1>
            <p className="text-sm text-gray-500 mt-0.5">First, choose a queue and review its structure</p>
          </div>
        </div>

        <div className="flex-1 p-8 max-w-3xl w-full mx-auto space-y-6">
          {/* Queue selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Target queue</label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none"
            >
              {queues.map(q => <option key={q.id} value={q.id}>{q.icon} {q.name}</option>)}
            </select>
          </div>

          {/* Existing structure */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ background: HX.purplePale }}>
              <span className="font-semibold text-sm" style={{ color: HX.purple }}>
                Existing structure — {existingCols.length} column{existingCols.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-400">{existingTasks.length} existing rows</span>
            </div>
            {existingCols.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase w-1/3">Column</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Example value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {existingCols.map(col => (
                    <tr key={col}>
                      <td className="px-3 py-2 font-mono font-semibold text-gray-700">{col}</td>
                      <td className="px-3 py-2 text-gray-500 truncate max-w-xs">
                        {sampleTask?.[col] || <span className="text-gray-300 italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
                No existing tasks — any CSV structure will be accepted.
              </div>
            )}
          </div>

          <button
            onClick={() => setStage("input")}
            className="w-full py-3 rounded-lg font-semibold text-white text-sm"
            style={{ background: HX.purple }}
          >
            Continue — paste or upload CSV →
          </button>
        </div>
      </div>
    );
  }

  // ── STAGE: input ─────────────────────────────────────────────────────────
  if (stage === "input") {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="px-8 py-5 border-b flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setStage("queue_select")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paste or upload your CSV</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Adding to <strong>{targetQueue?.icon} {targetQueue?.name}</strong> — headers optional
            </p>
          </div>
        </div>

        <div className="flex-1 p-8 max-w-3xl w-full mx-auto space-y-5">
          {/* Expected columns reminder */}
          {existingCols.length > 0 && (
            <div className="rounded-lg px-4 py-3 text-xs" style={{ background: HX.purplePale, color: HX.purple }}>
              <span className="font-semibold">Expected columns (in order): </span>
              {existingCols.join(", ")}
            </div>
          )}

          {/* Paste area */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              Paste CSV data here
              <span className="ml-2 text-xs font-normal text-gray-400">(with or without header row)</span>
            </label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={existingCols.length
                ? `${existingCols.join(",")}\nvalue1,value2,...`
                : "Paste CSV data here…"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{ minHeight: "200px" }}
              onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            />
          </div>

          {/* Or upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
            style={{ borderColor: dragging ? HX.purple : "#D1D5DB", background: dragging ? HX.purplePale : "#FAFAFA" }}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <p className="text-sm text-gray-500">
              📂 Or drop / click to upload a <strong>.csv</strong> file
            </p>
            {rawText && <p className="text-xs text-gray-400 mt-1">File loaded — edit above or upload another to replace</p>}
          </div>

          {parseError && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{ background: "#FEF2F2", color: "#B91C1C" }}>⚠️ {parseError}</div>
          )}

          <button
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="w-full py-3 rounded-lg font-semibold text-white text-sm disabled:opacity-40"
            style={{ background: HX.purple }}
          >
            Review import →
          </button>
        </div>
      </div>
    );
  }

  // ── STAGE: review ────────────────────────────────────────────────────────
  if (stage === "review" && parsed) {
    const matchCount   = csvCols.filter(c => colStatus[c] === "match").length;
    const newColCount  = csvCols.filter(c => colStatus[c] === "new").length;
    const missingCols  = existingCols.filter(c => colStatus[c] === "missing");
    const columnsOk    = matchCount >= Math.min(1, existingCols.length);

    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="px-8 py-5 border-b flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setStage("input")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Review import</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Importing into <strong>{targetQueue?.icon} {targetQueue?.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex-1 p-8 max-w-3xl w-full mx-auto space-y-6">

          {/* Headers auto-detected banner */}
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
            style={{ background: hasHeaders ? "#F0FDF4" : "#FFF7ED", color: hasHeaders ? "#15803D" : "#92400E" }}>
            <span>{hasHeaders ? "✅" : "ℹ️"}</span>
            <span>
              {hasHeaders
                ? "Header row detected and used for column names."
                : "No header row detected — mapped columns by position using existing structure."}
            </span>
            <button
              onClick={() => {
                const toggled = !hasHeaders;
                setHasHeaders(toggled);
                try {
                  const result = toggled
                    ? parseCsvWithHeaders(rawText)
                    : parseCsvNoHeaders(rawText, existingCols);
                  setParsed(result);
                } catch (err) { setParseError(err.message); }
              }}
              className="ml-auto text-xs underline opacity-70 hover:opacity-100 whitespace-nowrap flex-shrink-0"
            >
              {hasHeaders ? "Treat as no headers" : "Treat first row as headers"}
            </button>
          </div>

          {/* Column match status */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700 bg-gray-50">
              Column mapping — {matchCount} matched · {newColCount} new · {missingCols.length} missing
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {csvCols.map(c => {
                const s = colStatus[c];
                const cfg = s === "match"
                  ? { bg: "#F0FDF4", color: "#15803D", icon: "✅" }
                  : { bg: "#FFF7ED", color: "#92400E", icon: "➕" };
                return (
                  <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {c}
                  </span>
                );
              })}
              {missingCols.map(c => (
                <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "#F3F4F6", color: "#9CA3AF" }}>
                  — {c}
                </span>
              ))}
            </div>
            {missingCols.length > 0 && (
              <div className="px-4 pb-3 text-xs text-gray-400">
                Missing columns will be left blank for imported rows.
              </div>
            )}
          </div>

          {/* Duplicate alert */}
          {dupRows.length > 0 && (
            <div className="rounded-lg px-4 py-3 text-sm flex items-start gap-3"
              style={{ background: "#FEF9C3", color: "#713F12", border: "1px solid #FDE68A" }}>
              <span className="text-lg leading-none">⚠️</span>
              <div>
                <strong>{dupRows.length} exact duplicate{dupRows.length !== 1 ? "s" : ""} found</strong> — these rows already exist in the queue and will be excluded from the import.
                <div className="mt-1 text-xs opacity-70">
                  Matched by: {existingCols.filter(c => csvCols.includes(c)).join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* Preview of new rows */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ background: HX.purplePale }}>
              <span className="font-semibold text-sm" style={{ color: HX.purple }}>
                New rows to import — {newRows.length}
              </span>
              {dupRows.length > 0 && (
                <span className="text-xs text-gray-400">{dupRows.length} duplicate{dupRows.length !== 1 ? "s" : ""} excluded</span>
              )}
            </div>
            {newRows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>{csvCols.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {newRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{csvCols.map(h => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">{row[h]}</td>
                        ))}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {newRows.length > 5 && (
                  <div className="px-4 py-2 text-xs text-gray-400 border-t">…and {newRows.length - 5} more rows</div>
                )}
              </>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-400 italic">
                All rows are duplicates — nothing new to import.
              </div>
            )}
          </div>

          {newRows.length > 0 ? (
            <button
              onClick={handleImport}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm"
              style={{ background: HX.purple }}
            >
              Import {newRows.length} new row{newRows.length !== 1 ? "s" : ""} into {targetQueue?.name}
              {dupRows.length > 0 && ` (${dupRows.length} duplicate${dupRows.length !== 1 ? "s" : ""} skipped)`}
            </button>
          ) : (
            <button
              onClick={() => setStage("input")}
              className="w-full py-3 rounded-lg font-semibold text-sm border"
              style={{ borderColor: HX.purple, color: HX.purple }}
            >
              ← Go back and paste different data
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── "Create new queue" flow (unchanged) ──────────────────────────────────────

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  return { headers, rows: lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });
    return obj;
  }) };
}

function NewQueueFlow({ queues, onAddQueue, onBack }) {
  const [file,        setFile]        = useState(null);
  const [parsed,      setParsed]      = useState(null);
  const [parseError,  setParseError]  = useState(null);
  const [newName,     setNewName]     = useState("");
  const [primaryKey,  setPrimaryKey]  = useState("");
  const [dragging,    setDragging]    = useState(false);
  const [done,        setDone]        = useState(false);
  const [imported,    setImported]    = useState(0);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setParseError(null); setParsed(null); setDone(false); setFile(f);
    setNewName(f.name.replace(/\.csv$/i, "").replace(/_/g, " "));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseCsv(e.target.result);
        setParsed(result);
        setPrimaryKey(result.headers[0] ?? "");
      }
      catch (err) { setParseError(err.message); }
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f); else setParseError("Please drop a .csv file.");
  }, [handleFile]);

  const handleImport = () => {
    if (!parsed) return;
    const ts = Date.now();
    const id  = `csv_${ts}`;
    const cols = parsed.headers;
    onAddQueue({
      id, name: newName.trim() || file.name.replace(/\.csv$/i, ""), icon: "📋",
      description: `Uploaded from ${file.name}`, source: "csv", schedule: "Manual upload",
      displayCols: cols,
      primaryKey: primaryKey || cols[0],
      initialData: parsed.rows.map((r, i) => ({ _id: `${id}_${i}`, ...r, ...TASK_DEFAULTS })),
    });
    setImported(parsed.rows.length); setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-10">
        <div className="text-5xl">✅</div>
        <div className="text-xl font-semibold text-gray-800">
          {imported} rows added as new queue <span style={{ color: HX.purple }}>{newName.trim() || file?.name}</span>
        </div>
        <button onClick={onBack} className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: HX.purple }}>Back to queues</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-8 py-5 border-b flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create new task type</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload a CSV — each row becomes a task in a brand new queue</p>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-3xl w-full mx-auto space-y-7">
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
            style={{ background: "#FEF2F2", color: "#B91C1C" }}>⚠️ {parseError}</div>
        )}

        {parsed && (
          <>
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Task type name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Refunds — March 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  onFocus={e => { e.currentTarget.style.borderColor = HX.purple; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Primary display field</label>
                <p className="text-xs text-gray-400 mb-1.5">
                  Shown as the task title — choose the best identifier (e.g. booking reference, email).
                </p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(parsed.headers.length, 3)}, 1fr)` }}>
                  {parsed.headers.map(h => {
                    const sample = parsed.rows[0]?.[h] ?? "";
                    const active = primaryKey === h;
                    return (
                      <button key={h} type="button" onClick={() => setPrimaryKey(h)}
                        className="text-left px-3 py-2.5 rounded-lg border text-sm transition-colors"
                        style={active
                          ? { background: HX.purplePale, borderColor: HX.purple, color: HX.purple }
                          : { background: "white", borderColor: "#E5E7EB", color: "#374151" }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = HX.purpleLight; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = "#E5E7EB"; }}
                      >
                        <div className="font-semibold text-xs uppercase tracking-wide truncate"
                          style={{ color: active ? HX.purple : "#6B7280" }}>{h}</div>
                        <div className="text-xs mt-0.5 truncate opacity-70">{sample || "—"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={handleImport}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm"
              style={{ background: HX.purple }}>
              Create "{newName.trim() || file?.name}" with {parsed.rows.length} tasks
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Landing: two option cards ─────────────────────────────────────────────────

function ModeSelect({ onSelect }) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Tasks</h1>
      <p className="text-gray-500 text-sm mb-10">What would you like to do?</p>
      <div className="flex gap-6 w-full max-w-xl">
        {[
          { mode: "new",      icon: "📋", title: "Create new task type", sub: "Upload a CSV — becomes a brand new queue" },
          { mode: "existing", icon: "➕", title: "Add rows to existing queue", sub: "Paste or upload a CSV — duplicate rows are automatically excluded" },
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

// ── Root export ───────────────────────────────────────────────────────────────

export default function UploadPage({ queues, taskData, onAddQueue, onImportToQueue, onAddTask, onBack }) {
  const [mode, setMode] = useState(null);

  if (mode === "new") return (
    <NewQueueFlow queues={queues} onAddQueue={onAddQueue} onBack={() => setMode(null)} />
  );

  if (mode === "existing") return (
    <ExistingFlow queues={queues} taskData={taskData} onImportToQueue={onImportToQueue} onBack={() => setMode(null)} />
  );

  return <ModeSelect onSelect={setMode} />;
}
