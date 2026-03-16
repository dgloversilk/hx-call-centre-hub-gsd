"use client";

import { HX } from "@/lib/brand";

export default function Navbar({ user, onLogout }) {
  return (
    <div
      className="text-white px-6 py-3 flex items-center justify-between shadow-lg flex-shrink-0 z-20"
      style={{ background: HX.purple }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          HX
        </div>
        <div>
          <span className="font-semibold">GSD</span>
          <span className="text-xs ml-3 hidden sm:inline" style={{ color: HX.purpleLight }}>
            Get Sh*t Done
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs capitalize" style={{ color: HX.purpleLight }}>{user.role}</div>
        </div>
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm"
          style={{ background: HX.purpleDark, borderColor: HX.purpleLight }}
        >
          {user.initials}
        </div>
        <button
          onClick={onLogout}
          className="text-xs underline hover:opacity-80"
          style={{ color: HX.purpleLight }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
