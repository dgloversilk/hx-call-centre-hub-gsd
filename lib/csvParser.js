/**
 * Parses a CSV string into headers and row objects.
 * Each row gets a unique _id, default status of "pending", and empty notes.
 * Compatible with exports from BigQuery, Excel, Looker, and Google Sheets.
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));

  const rows = lines.slice(1).map((line, i) => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {
      _id:        `csv-${Date.now()}-${i}`,
      status:     "pending",
      notes:      "",
      archived:   false,
      archived_at:   null,
      archived_by:   null,
      status_updated_at: null,
      status_updated_by: null,
    };
    headers.forEach((h, j) => { obj[h] = vals[j] ?? ""; });
    return obj;
  });

  return { headers, rows };
}
