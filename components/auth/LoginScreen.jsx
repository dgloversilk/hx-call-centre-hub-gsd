"use client";

import { HX } from "@/lib/brand";
import { MOCK_USERS } from "@/lib/constants";

export default function LoginScreen({ onLogin }) {
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
                Get Sh*t Done
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Holiday Extras Call Centre · Task Management</p>
        </div>

        {/* Mock user picker */}
        <div
          className="rounded-lg px-4 py-3 mb-5 text-xs font-medium"
          style={{ background: HX.purplePale, color: HX.purpleDark }}
        >
          Select your name to sign in — Google Auth coming soon
        </div>

        <div className="space-y-3">
          {MOCK_USERS.map(u => (
            <button
              key={u.id}
              onClick={() => onLogin(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 transition-all text-left hover:shadow-md"
              onMouseEnter={e => { e.currentTarget.style.borderColor = HX.purple; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: HX.purple }}
              >
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{u.name}</div>
                <div className="text-sm text-gray-500 truncate">{u.email}</div>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={
                  u.role === "manager"
                    ? { background: HX.purplePale, color: HX.purple }
                    : { background: HX.gray4, color: "#4B5563" }
                }
              >
                {u.role}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Data from BigQuery · Holiday Extras Internal Tool
        </p>
      </div>
    </div>
  );
}
