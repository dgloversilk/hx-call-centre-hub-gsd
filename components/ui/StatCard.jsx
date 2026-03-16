"use client";

import { HX } from "@/lib/brand";

const ACCENTS = {
  purple: { bg: HX.purplePale,  border: HX.purpleLight, text: HX.purpleDark  },
  yellow: { bg: HX.yellowLight, border: HX.yellowDark,  text: "#7A6200"      },
  green:  { bg: HX.greenPale,   border: HX.green,       text: HX.greenDark   },
  red:    { bg: HX.redPale,     border: HX.red,         text: HX.redDark     },
  blue:   { bg: HX.bluePale,    border: HX.blue,        text: HX.blueDark    },
  orange: { bg: HX.orangePale,  border: HX.orange,      text: HX.orangeDark  },
  gray:   { bg: HX.gray4,       border: HX.gray2,       text: "#374151"      },
};

export default function StatCard({ label, value, sub, accent = "gray" }) {
  const a = ACCENTS[accent] ?? ACCENTS.gray;
  return (
    <div
      style={{ background: a.bg, borderColor: a.border, color: a.text }}
      className="rounded-xl border-2 p-5"
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="font-semibold mt-1 text-sm">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}
