"use client";

import { useState, useEffect } from "react";
import { HX } from "@/lib/brand";

export default function TeamSettings({ currentUser }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null); // id of user being saved

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false); });
  }, []);

  const toggleRole = async (user) => {
    const newRole = user.role === "manager" ? "agent" : "manager";
    setSaving(user.id);

    const res = await fetch("/api/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: user.id, role: newRole }),
    });

    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    }
    setSaving(null);
  };

  const managers = users.filter(u => u.role === "manager");
  const agents   = users.filter(u => u.role === "agent");

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading team…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Team</h2>
      <p className="text-sm text-gray-500 mb-6">Manage who has manager access. Changes take effect on next sign-in.</p>

      {/* Managers */}
      <Section title="Managers" count={managers.length} color={HX.purple}>
        {managers.map(u => (
          <UserRow
            key={u.id}
            user={u}
            isSelf={u.email === currentUser?.email}
            saving={saving === u.id}
            onToggle={() => toggleRole(u)}
          />
        ))}
      </Section>

      {/* Agents */}
      <Section title="Agents" count={agents.length} color={HX.blue} className="mt-6">
        {agents.map(u => (
          <UserRow
            key={u.id}
            user={u}
            isSelf={u.email === currentUser?.email}
            saving={saving === u.id}
            onToggle={() => toggleRole(u)}
          />
        ))}
        {agents.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-3">No agents yet — they'll appear here after signing in for the first time.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, color, children, className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{title}</span>
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function UserRow({ user, isSelf, saving, onToggle }) {
  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : user.email[0].toUpperCase();

  const lastSeen = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "Never";

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: HX.purple }}
      >
        {user.avatar_url
          ? <img src={user.avatar_url} className="w-9 h-9 rounded-full object-cover" alt={initials} />
          : initials
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm truncate">{user.name ?? user.email}</div>
        <div className="text-xs text-gray-400 truncate">{user.email} · Last seen {lastSeen}</div>
      </div>

      {/* Role badge */}
      <span
        className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
        style={
          user.role === "manager"
            ? { background: HX.purplePale, color: HX.purple }
            : { background: HX.gray4,      color: "#4B5563"  }
        }
      >
        {user.role}
      </span>

      {/* Toggle button */}
      {!isSelf && (
        <button
          onClick={onToggle}
          disabled={!!saving}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 flex-shrink-0"
          style={
            user.role === "manager"
              ? { background: HX.gray4,      color: "#4B5563"  }
              : { background: HX.purplePale, color: HX.purple  }
          }
        >
          {saving ? "Saving…" : user.role === "manager" ? "Make agent" : "Make manager"}
        </button>
      )}
      {isSelf && (
        <span className="text-xs text-gray-300 flex-shrink-0">You</span>
      )}
    </div>
  );
}
