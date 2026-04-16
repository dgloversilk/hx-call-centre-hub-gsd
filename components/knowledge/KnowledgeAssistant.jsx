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

export default function KnowledgeAssistant() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything and I'll search the knowledge base for you. 👋" }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);

    try {
      const articles = loadArticles();
      const res = await fetch("/api/knowledge/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, articles }),
      });
      const data = await res.json();
      const answer = data.answer ?? data.error ?? "Something went wrong.";
      setMessages(m => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Couldn't reach the assistant — please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* ── Floating button ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: HX.blue, color: "white" }}
        title="Ask AI"
      >
        {open ? "✕" : "✨"}
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: "white", border: `1px solid ${HX.gray2}`, height: 480 }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ background: HX.slate800, color: "white" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <div className="font-semibold text-sm">Ask AI</div>
                <div className="text-xs" style={{ color: HX.slate400 }}>Searches your knowledge base</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-xs text-sm px-3 py-2 rounded-2xl leading-relaxed"
                  style={msg.role === "user"
                    ? { background: HX.blue, color: "white", borderBottomRightRadius: 4 }
                    : { background: HX.gray3, color: "#1F2937", borderBottomLeftRadius: 4 }
                  }
                >
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: HX.gray3, color: HX.slate600, borderBottomLeftRadius: 4 }}>
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 flex-shrink-0 border-t" style={{ borderColor: HX.gray2 }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question…"
                rows={1}
                className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{ borderColor: HX.gray2, maxHeight: 80 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-opacity disabled:opacity-40"
                style={{ background: HX.blue }}
              >
                ↑
              </button>
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: HX.slate400 }}>
              Answers based on uploaded knowledge articles
            </p>
          </div>
        </div>
      )}
    </>
  );
}
