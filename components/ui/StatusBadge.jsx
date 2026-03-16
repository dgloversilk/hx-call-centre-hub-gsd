"use client";

import { STATUS_CFG } from "@/lib/constants";

export default function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}
