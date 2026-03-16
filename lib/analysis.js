/**
 * Generates per-column statistics for a set of task rows.
 * Used by the Analysis tab in each queue view.
 */
export function analyzeData(rows, cols) {
  const colKeys =
    cols.length > 0
      ? cols
      : Object.keys(rows[0] || {}).filter(
          k => !k.startsWith("_") && k !== "status" && k !== "notes" && k !== "archived"
        );

  return colKeys.map(key => {
    const values = rows.map(r => r[key] ?? "").filter(v => v !== "");
    const freq = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const isFlag = sorted.length > 0 && sorted.every(([v]) => v === "Yes" || v === "No");
    return {
      key,
      uniqueCount: sorted.length,
      topValues:   sorted.slice(0, 5),
      total:       values.length,
      isFlag,
    };
  });
}
