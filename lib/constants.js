import { HX } from "./brand";

export const OUTCOME_OPTIONS = [
  { value: "fixed",     label: "Fixed",              emoji: "✅" },
  { value: "duplicate", label: "Duplicate confirmed", emoji: "🔁" },
  { value: "not_valid", label: "Not valid",           emoji: "❌" },
  { value: "escalated", label: "Escalated to team",   emoji: "⬆️" },
];

export const MOCK_USERS = [
  { id: 1, name: "Daniel Glover-Silk", email: "daniel.glover-silk@holidayextras.com", role: "Owner",   initials: "DG" },
  { id: 2, name: "Natalie Slater",     email: "natalie.slater@holidayextras.com",     role: "Manager", initials: "NS" },
  { id: 3, name: "Nicola Neale",       email: "nicola.neale@holidayextras.com",       role: "Agent",   initials: "NN" },
];

export const isManager = (user) =>
  ["manager", "owner"].includes((user?.role ?? "").toLowerCase());

// Visual config for each task status
export const STATUS_CFG = {
  pending:     { label: "Pending",     bg: HX.gray4,      color: "#4B5563",     border: HX.gray2    },
  in_progress: { label: "In Progress", bg: HX.bluePale,   color: HX.blueDark,   border: HX.blue     },
  completed:   { label: "Done",        bg: HX.greenPale,  color: HX.greenDark,  border: HX.green    },
  done:        { label: "Done",        bg: HX.greenPale,  color: HX.greenDark,  border: HX.green    },
  blocked:     { label: "Needs Attention", bg: HX.redPale, color: HX.redDark, border: HX.red },
  escalated:   { label: "Needs Attention", bg: HX.redPale, color: HX.redDark, border: HX.red },
};

// Hex colours for recharts
export const STATUS_COLORS = {
  pending:     HX.gray2,
  in_progress: HX.blue,
  completed:   HX.green,
  done:        HX.green,
  blocked:     HX.red,
  escalated:   HX.red,
};
