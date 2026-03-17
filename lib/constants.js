// Shared constants used across the application
import { HX } from "./brand";

export const MOCK_USERS = [
  { id: 1, name: "Daniel Glover-Silk", email: "daniel.glover-silk@holidayextras.com", role: "Owner", initials: "DG" },
  { id: 2, name: "Natalie Slater",        email: "natalie.slater@holidayextras.com",        role: "Manager",   initials: "SJ" },
  { id: 3, name: "Nicola Neale",        email: "nicola.neale@holidayextras.com",        role: "Agent",   initials: "MR" },
];

// Visual config for each task status — uses inline styles aligned to HX brand palette
export const STATUS_CFG = {
  pending:     { label: "Pending",     bg: HX.gray4,      color: "#4B5563",     border: HX.gray2    },
  in_progress: { label: "In Progress", bg: HX.bluePale,   color: HX.blueDark,   border: HX.blue     },
  completed:   { label: "Done",        bg: HX.greenPale,  color: HX.greenDark,  border: HX.green    },
  done:        { label: "Done",        bg: HX.greenPale,  color: HX.greenDark,  border: HX.green    },
  blocked:     { label: "Blocked",     bg: HX.redPale,    color: HX.redDark,    border: HX.red      },
  escalated:   { label: "Escalated",   bg: HX.orangePale, color: HX.orangeDark, border: HX.orange   },
};

// Hex colours used in recharts — aligned to HX brand palette
export const STATUS_COLORS = {
  pending:     HX.gray2,
  in_progress: HX.blue,
  completed:   HX.green,
  done:        HX.green,
  blocked:     HX.red,
  escalated:   HX.orange,
};
