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
  const [articles,       setArticles]       = useState([]);
  const [selected,       setSelected]       = useState(null);
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [addTab,         setAddTab]         = useState("csv");   // "csv" | "gdoc"
  const [uploadMsg,      setUploadMsg]      = useState(null);

  // Google Doc import state
  const [gdocUrl,        setGdocUrl]        = useState("");
  const [gdocTitle,      setGdocTitle]      = useState("");
  const [gdocCategory,   setGdocCategory]   = useState("");
  const [gdocLoading,    setGdocLoading]    = useState(false);

  const fileRef = useRef(null);

  useEffect(() => { setArticles(loadArticles()); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const persistAndSet = (updated) => {
    saveArticles(updated);
    setArticles(updated);
  };

  const mergeInto = (incoming) => {
    const existing = loadArticles();
    const titleMap = {};
    existing.forEach(a => { titleMap[a.title] = a; });
    incoming.forEach(a  => { titleMap[a.title] = a; });
    return Object.values(titleMap);
  };

  // ── CSV upload ────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text  = ev.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error("File must have a header row and at least one article.");

        const headers      = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
        const titleIdx     = headers.indexOf("title");
        const contentIdx   = headers.indexOf("content");
        const categoryIdx  = headers.indexOf("category");
        const tagsIdx      = headers.indexOf("tags");

        if (titleIdx === -1 || contentIdx === -1) throw new Error('CSV must have "title" and "content" columns.');

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols    = parseCSVRow(lines[i]);
          const title   = (cols[titleIdx]   ?? "").trim();
          const content = (cols[contentIdx] ?? "").trim();
          if (!title || !content) continue;
          parsed.push({
            id:       `art_${Date.now()}_${i}`,
            title,
            content,
            category: categoryIdx >= 0 ? (cols[categoryIdx] ?? "").trim() : "",
            tags:     tagsIdx     >= 0 ? (cols[tagsIdx]     ?? "").trim() : "",
            source:   "csv",
            addedAt:  new Date().toISOString(),
          });
        }

        if (parsed.length === 0) throw new Error("No valid articles found in the file.");
        const merged = mergeInto(parsed);
        persistAndSet(merged);
        setUploadMsg({ type: "success", text: `✓ ${parsed.length} article${parsed.length !== 1 ? "s" : ""} uploaded. ${merged.length} total in knowledge base.` });
      } catch (err) {
        setUploadMsg({ type: "error", text: err.message });
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // ── Google Doc import ─────────────────────────────────────────────────────
  const handleGdocImport = async () => {
    if (!gdocUrl.trim()) return;
    setGdocLoading(true);
    setUploadMsg(null);

    try {
      const res  = await fetch("/api/knowledge/fetch-gdoc", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: gdocUrl.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadMsg({ type: "error", text: data.error ?? "Failed to fetch document." });
        return;
      }

      // Use fetched title if user hasn't entered one
      const finalTitle = gdocTitle.trim() || data.title || "Untitled";

      const article = {
        id:       `art_${Date.now()}`,
        title:    finalTitle,
        content:  data.content,
        category: gdocCategory.trim(),
        tags:     "",
        source:   data.type === "slides" ? "google_slides" : "google_docs",
        sourceUrl: gdocUrl.trim(),
        addedAt:  new Date().toISOString(),
      };

      const merged = mergeInto([article]);
      persistAndSet(merged);
      setUploadMsg({ type: "success", text: `✓ "${finalTitle}" imported from Google ${data.type === "slides" ? "Slides" : "Docs"}.` });
      setGdocUrl("");
      setGdocTitle("");
      setGdocCategory("");
    } catch {
      setUploadMsg({ type: "error", text: "Something went wrong — please try again." });
    } finally {
      setGdocLoading(false);
    }
  };

  const deleteArticle = (id) => {
    const updated = articles.filter(a => a.id !== id);
    persistAndSet(updated);
    if (selected?.id === id) setSelected(null);
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))].sort();

  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    const matchCat    = activeCategory === "all" || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  const sourceIcon = (source) => {
    if (source === "google_docs")   return "📄";
    if (source === "google_slides") return "📊";
    return "📋";
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden" style={{ background: HX.gray3 }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="flex flex-col w-80 flex-shrink-0 border-r bg-white overflow-hidden" style={{ borderColor: HX.gray2 }}>

        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: HX.gray2 }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900">Knowledge Base</h2>
            <span className="text-xs text-gray-400">{articles.length} article{articles.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Articles from Sprinklr, Google Docs & Slides</p>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="w-full px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
            style={{ borderColor: HX.gray2 }}
          />

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
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
        </div>

        {/* Add content section — managers only */}
        {isManager && (
          <div className="border-b flex-shrink-0" style={{ borderColor: HX.gray2 }}>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: HX.gray2 }}>
              {[
                { key: "csv",   label: "📋 CSV" },
                { key: "gdoc",  label: "🔗 Google Doc/Slides" },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => { setAddTab(t.key); setUploadMsg(null); }}
                  className="flex-1 text-xs py-2 font-medium transition-colors"
                  style={addTab === t.key
                    ? { borderBottom: `2px solid ${HX.blue}`, color: HX.blue }
                    : { color: HX.slate400 }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {uploadMsg && (
                <div
                  className="text-xs px-3 py-2 rounded-lg mb-2"
                  style={uploadMsg.type === "success"
                    ? { background: HX.greenPale, color: HX.greenDark }
                    : { background: HX.redPale,  color: HX.redDark }
                  }
                >
                  {uploadMsg.text}
                </div>
              )}

              {addTab === "csv" && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    Upload a CSV with <strong>title</strong> and <strong>content</strong> columns. Optional: <strong>category</strong>, <strong>tags</strong>.
                  </p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full text-xs px-3 py-2 rounded-lg font-medium text-white transition-colors"
                    style={{ background: HX.blue }}
                    onMouseEnter={e => { e.currentTarget.style.background = HX.blueDark; }}
                    onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}
                  >
                    Choose CSV file
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                </div>
              )}

              {addTab === "gdoc" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">
                    Paste a link to a Google Doc or Slides. The document must be shared with <strong>"Anyone with the link can view"</strong>.
                  </p>
                  <input
                    type="url"
                    value={gdocUrl}
                    onChange={e => setGdocUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/…"
                    className="w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-300"
                    style={{ borderColor: HX.gray2 }}
                  />
                  <input
                    type="text"
                    value={gdocTitle}
                    onChange={e => setGdocTitle(e.target.value)}
                    placeholder="Title (auto-detected if blank)"
                    className="w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-300"
                    style={{ borderColor: HX.gray2 }}
                  />
                  <input
                    type="text"
                    value={gdocCategory}
                    onChange={e => setGdocCategory(e.target.value)}
                    placeholder="Category (optional)"
                    className="w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-300"
                    style={{ borderColor: HX.gray2 }}
                  />
                  <button
                    onClick={handleGdocImport}
                    disabled={!gdocUrl.trim() || gdocLoading}
                    className="w-full text-xs px-3 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: HX.blue }}
                    onMouseEnter={e => { if (!gdocLoading) e.currentTarget.style.background = HX.blueDark; }}
                    onMouseLeave={e => { e.currentTarget.style.background = HX.blue; }}
                  >
                    {gdocLoading ? "Importing…" : "Import document"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Article list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {articles.length === 0
                ? isManager
                  ? "Upload a CSV or import a Google Doc to get started."
                  : "No articles yet — ask your manager to add content."
                : "No articles match your search."
              }
            </div>
          ) : (
            filtered.map(article => (
              <button
                key={article.id}
                onClick={() => setSelected(article)}
                className="w-full text-left p-3 border-b transition-colors"
                style={{ borderColor: HX.gray2, background: selected?.id === article.id ? HX.bluePale : "white" }}
                onMouseEnter={e => { if (selected?.id !== article.id) e.currentTarget.style.background = HX.gray4; }}
                onMouseLeave={e => { if (selected?.id !== article.id) e.currentTarget.style.background = "white"; }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 flex-shrink-0">{sourceIcon(article.source)}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 mb-0.5 leading-snug">{article.title}</div>
                    <div className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {article.content.slice(0, 100)}…
                    </div>
                    {article.category && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: HX.gray3, color: HX.slate600 }}>
                        {article.category}
                      </span>
                    )}
                  </div>
                </div>
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{sourceIcon(selected.source)}</span>
                  <h1 className="text-xl font-semibold text-gray-900">{selected.title}</h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                  {selected.category && (
                    <span className="px-2 py-0.5 rounded-full" style={{ background: HX.gray3, color: HX.slate600 }}>{selected.category}</span>
                  )}
                  {selected.tags && selected.tags.split(",").map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: HX.bluePale, color: HX.blue }}>{t.trim()}</span>
                  ))}
                  <span>
                    {selected.source === "google_docs"   ? "Google Docs" :
                     selected.source === "google_slides" ? "Google Slides" : "CSV upload"}
                    {" · "}Added {new Date(selected.addedAt).toLocaleDateString()}
                  </span>
                  {selected.sourceUrl && (
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:opacity-70"
                      style={{ color: HX.blue }}
                    >
                      Open original ↗
                    </a>
                  )}
                </div>
              </div>
              {isManager && (
                <button
                  onClick={() => deleteArticle(selected.id)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4"
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
              Choose an article from the left to read it here. Use the ✨ Ask AI button to get instant answers from the knowledge base.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function parseCSVRow(line) {
  const result = [];
  let current  = "";
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
