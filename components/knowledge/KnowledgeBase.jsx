"use client";

import { useState, useRef, useEffect } from "react";
import { HX } from "@/lib/brand";

const STORAGE_KEY = "gsd_knowledge_articles";

function loadArticles() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveArticles(articles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

export default function KnowledgeBase({ user }) {
  const isManager = ["manager", "owner"].includes((user?.role ?? "").toLowerCase());
  const [articles,  setArticles]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setArticles(loadArticles());
  }, []);

  // ── CSV upload ─────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error("File must have a header row and at least one article.");

        // Parse header — expect "title" and "content" columns (case-insensitive)
        const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
        const titleIdx   = headers.indexOf("title");
        const contentIdx = headers.indexOf("content");
        const categoryIdx = headers.indexOf("category");
        const tagsIdx    = headers.indexOf("tags");

        if (titleIdx === -1 || contentIdx === -1) {
          throw new Error('CSV must have "title" and "content" columns.');
        }

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVRow(lines[i]);
          const title   = (cols[titleIdx]   ?? "").trim();
          const content = (cols[contentIdx] ?? "").trim();
          if (!title || !content) continue;
          parsed.push({
            id:       `art_${Date.now()}_${i}`,
            title,
            content,
            category: categoryIdx >= 0 ? (cols[categoryIdx] ?? "").trim() : "",
            tags:     tagsIdx    >= 0 ? (cols[tagsIdx]    ?? "").trim() : "",
            addedAt:  new Date().toISOString(),
          });
        }

        if (parsed.length === 0) throw new Error("No valid articles found in the file.");

        const existing = loadArticles();
        // Deduplicate by title — replace existing with same title
        const titleMap = {};
        existing.forEach(a => { titleMap[a.title] = a; });
        parsed.forEach(a  => { titleMap[a.title] = a; });
        const merged = Object.values(titleMap);

        saveArticles(merged);
        setArticles(merged);
        setUploadMsg({ type: "success", text: `✓ ${parsed.length} article${parsed.length !== 1 ? "s" : ""} uploaded. ${merged.length} total in knowledge base.` });
      } catch (err) {
        setUploadMsg({ type: "error", text: err.message });
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const deleteArticle = (id) => {
    const updated = articles.filter(a => a.id !== id);
    saveArticles(updated);
    setArticles(updated);
    if (selected?.id === id) setSelected(null);
  };

  // ── Search/filter ─────────────────────────────────────────────────────────
  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.tags.toLowerCase().includes(q);
  });

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))].sort();
  const [activeCategory, setActiveCategory] = useState("all");
  const displayed = activeCategory === "all" ? filtered : filtered.filter(a => a.category === activeCategory);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden" style={{ background: HX.gray3 }}>

      {/* ── Left panel: article list ─────────────────────────────────────── */}
      <div className="flex flex-col w-80 flex-shrink-0 border-r bg-white overflow-hidden" style={{ borderColor: HX.gray2 }}>

        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: HX.gray2 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">Knowledge Base</h2>
              <p className="text-xs text-gray-500 mt-0.5">{articles.length} article{articles.length !== 1 ? "s" : ""}</p>
            </div>
            {isManager && (
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors text-white"
                style={{ background: HX.blue }}
                onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}
              >
                + Upload CSV
              </button>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {uploadMsg && (
            <div
              className="text-xs px-3 py-2 rounded-lg mb-3"
              style={uploadMsg.type === "success"
                ? { background: HX.greenPale, color: HX.greenDark }
                : { background: HX.redPale, color: HX.redDark }
              }
            >
              {uploadMsg.text}
            </div>
          )}

          {isManager && articles.length === 0 && (
            <div className="text-xs p-3 rounded-lg mb-3" style={{ background: HX.bluePale, color: HX.blueDark }}>
              Upload a CSV with <strong>title</strong> and <strong>content</strong> columns to populate the knowledge base. Optional columns: <strong>category</strong>, <strong>tags</strong>.
            </div>
          )}

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="w-full px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-300"
            style={{ borderColor: HX.gray2 }}
          />
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="flex gap-1 px-3 py-2 overflow-x-auto flex-shrink-0 border-b" style={{ borderColor: HX.gray2 }}>
            {["all", ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={activeCategory === cat
                  ? { background: HX.blue, color: "white" }
                  : { background: HX.gray3, color: HX.slate600 }
                }
              >
                {cat === "all" ? `All (${articles.length})` : cat}
              </button>
            ))}
          </div>
        )}

        {/* Article list */}
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {articles.length === 0
                ? isManager ? "Upload a CSV to add articles." : "No articles yet — ask your manager to upload the knowledge base."
                : "No articles match your search."
              }
            </div>
          ) : (
            displayed.map(article => (
              <button
                key={article.id}
                onClick={() => setSelected(article)}
                className="w-full text-left p-3 border-b transition-colors"
                style={{
                  borderColor: HX.gray2,
                  background: selected?.id === article.id ? HX.bluePale : "white",
                }}
                onMouseEnter={e => { if (selected?.id !== article.id) e.currentTarget.style.background = HX.gray4; }}
                onMouseLeave={e => { if (selected?.id !== article.id) e.currentTarget.style.background = "white"; }}
              >
                <div className="font-medium text-sm text-gray-900 mb-1 leading-snug">{article.title}</div>
                <div className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {article.content.slice(0, 120)}…
                </div>
                {article.category && (
                  <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full" style={{ background: HX.gray3, color: HX.slate600 }}>
                    {article.category}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: article viewer ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selected ? (
          <>
            <div className="px-8 py-5 border-b flex items-start justify-between flex-shrink-0" style={{ borderColor: HX.gray2 }}>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{selected.title}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {selected.category && <span className="px-2 py-0.5 rounded-full" style={{ background: HX.gray3, color: HX.slate600 }}>{selected.category}</span>}
                  {selected.tags && selected.tags.split(",").map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: HX.bluePale, color: HX.blue }}>{t.trim()}</span>
                  ))}
                  <span>Added {new Date(selected.addedAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isManager && (
                <button
                  onClick={() => deleteArticle(selected.id)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: HX.redPale, color: HX.red }}
                  onMouseEnter={e => { e.currentTarget.style.background = HX.redLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = HX.redPale; }}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-2xl">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-medium text-gray-700 mb-1">Select an article</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Choose an article from the left to read it here. Use the Ask AI assistant to get answers from the knowledge base.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple CSV row parser — handles quoted fields
function parseCSVRow(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
