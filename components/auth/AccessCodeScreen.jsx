"use client";

import { useState } from "react";
import { HX } from "@/lib/brand";

export default function AccessCodeScreen({ onSuccess }) {
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res  = await fetch("/api/auth/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: code.trim() }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        setError("Incorrect access code. Please try again.");
        setCode("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: `linear-gradient(135deg, ${HX.purpleDark} 0%, ${HX.purple} 60%, ${HX.purpleLight} 100%)` }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
              style={{ background: HX.purple, color: "white" }}
            >
              HX
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-gray-900 leading-tight">GSD</div>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: HX.purple }}>
                Get Stuff Done
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Holiday Extras Call Centre · Task Management</p>
        </div>

        {/* Access code form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm outline-none transition-all"
              onFocus={e  => { e.currentTarget.style.borderColor = HX.purple; }}
              onBlur={e   => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: HX.red ?? "#DC2626" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity disabled:opacity-50"
            style={{ background: HX.purple }}
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Holiday Extras Internal Tool
        </p>
      </div>
    </div>
  );
}
