import { getAccessToken } from "@/lib/googleAuth";

const PROJECT_ID = "hx-data-production";
const BQ_BASE    = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}`;

// ── Query ─────────────────────────────────────────────────────────────────────
// Rolling 7-day window. Deduplicates by booking reference (latest event wins).
// Both filters required: explicit error event AND booking still in Error fulfilment state.
// When a booking is resolved, fulfilment_status changes and it drops out automatically.
const QUERY = `
WITH latest_events AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY booking.reference
      ORDER BY meta.event.collected DESC
    ) AS row_num
  FROM \`hx-data-production.collector__streaming.server_booking_v9\`
  WHERE _PARTITIONDATE >= current_date - 7
)

SELECT
  booking.reference AS reference,
  booking.reference AS chips_reference,
  product.code,
  product.product_type,
  log.action,
  log.error,
  log.status,
  log.queue_id,
  CASE
    WHEN meta.event.organisation = 'Holiday Extras GmbH' THEN 'DE'
    ELSE 'UK'
  END AS country
FROM latest_events
LEFT JOIN UNNEST(booking.booking_products) AS product
LEFT JOIN UNNEST(product.fulfilment_log)   AS log
WHERE row_num = 1
  AND log.status = 'Error'
  AND booking.fulfilment_status = 'Error'
  AND product.product_type IN ('carpark', 'hotel_with_parking', 'resort_transfer')
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function bqFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BigQuery ${res.status}: ${body}`);
  }
  return res.json();
}

function toTask(obj, queuePrefix, idx) {
  return {
    ...obj,
    _id:               `${queuePrefix}_${idx}`,
    status:            "pending",
    notes:             "",
    archived:          false,
    archived_at:       null,
    archived_by:       null,
    completed_by:      null,
    completed_at:      null,
    status_updated_at: null,
    status_updated_by: null,
    assigned_to:       null,
    assigned_by:       null,
    assigned_at:       null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.error("Auth error:", err.message);
    return Response.json({ error: `Auth error: ${err.message}` }, { status: 500 });
  }

  try {
    // 1. Submit async BigQuery job
    const job = await bqFetch(`${BQ_BASE}/jobs`, token, {
      method: "POST",
      body: JSON.stringify({
        configuration: {
          query: { query: QUERY, useLegacySql: false },
        },
      }),
    });

    const jobId = job.jobReference.jobId;

    // 2. Poll until complete (max ~90 seconds)
    let done = false;
    for (let i = 0; i < 45 && !done; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await bqFetch(`${BQ_BASE}/jobs/${jobId}`, token);
      if (statusRes.status.state === "DONE") {
        if (statusRes.status.errorResult) throw new Error(statusRes.status.errorResult.message);
        done = true;
      }
    }

    if (!done) return Response.json({ error: "Query timed out — try again" }, { status: 408 });

    // 3. Fetch all result pages
    let allRows = [];
    let pageToken = undefined;
    do {
      const url = `${BQ_BASE}/jobs/${jobId}/queryResults?maxResults=5000${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const page = await bqFetch(url, token);
      const schema = (page.schema?.fields ?? []).map(f => f.name);
      for (const row of page.rows ?? []) {
        const obj = {};
        row.f.forEach((cell, i) => { obj[schema[i]] = cell.v ?? null; });
        allRows.push(obj);
      }
      pageToken = page.pageToken;
    } while (pageToken);

    // 4. Split into 4 workstreams by country + product type
    const uk          = allRows.filter(r => r.country === "UK" && r.product_type !== "resort_transfer");
    const ukTransfers = allRows.filter(r => r.country === "UK" && r.product_type === "resort_transfer");
    const de          = allRows.filter(r => r.country === "DE" && r.product_type !== "resort_transfer");
    const deTransfers = allRows.filter(r => r.country === "DE" && r.product_type === "resort_transfer");

    return Response.json({
      uk:           uk.map((r, i)          => toTask(r, "uk",  i)),
      uk_transfers: ukTransfers.map((r, i) => toTask(r, "ukt", i)),
      de:           de.map((r, i)          => toTask(r, "de",  i)),
      de_transfers: deTransfers.map((r, i) => toTask(r, "det", i)),
      total: allRows.length,
    });

  } catch (err) {
    console.error("BigQuery error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
