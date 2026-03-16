import { getAccessToken } from "@/lib/googleAuth";

const PROJECT_ID = "hx-data-production";
const BQ_BASE    = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}`;

// ── The production BigQuery query ──────────────────────────────────────────
const QUERY = `
WITH booking_platform as (
SELECT DISTINCT
  CASE
    WHEN length(REGEXP_EXTRACT(booking_ref, "^[^-]+")) = 7 THEN REGEXP_EXTRACT(booking_ref, "^[^-]+")
    WHEN length(REGEXP_EXTRACT(booking_ref, "^[^-]+")) = 6 THEN (REGEXP_EXTRACT(booking_ref, "^[^-]+"))
    WHEN length(REGEXP_EXTRACT(booking_ref, "^[^-]+")) = 8 THEN substr((REGEXP_EXTRACT(booking_ref, "^[^-]+")),3, length((REGEXP_EXTRACT(booking_ref, "^[^-]+")))-2)
    WHEN length((REGEXP_EXTRACT(booking_ref, "^[^-]+"))) IN (10,11) THEN (REGEXP_EXTRACT(booking_ref, "^[^-]+"))
    WHEN (length((REGEXP_EXTRACT(booking_ref, "^[^-]+"))) IN (12,13) AND (REGEXP_EXTRACT(booking_ref, "^[^-]+")) LIKE 'MA%') THEN substr((REGEXP_EXTRACT(booking_ref, "^[^-]+")),3, length((REGEXP_EXTRACT(booking_ref, "^[^-]+")))-2)
    ELSE (REGEXP_EXTRACT(booking_ref, "^[^-]+"))
  END AS ref,
  client.platform as booking_platform
FROM \`hx-data-production.collector__streaming.server_ecommerce_v6\`
WHERE TIMESTAMP_TRUNC(_PARTITIONTIME, DAY) >= TIMESTAMP("2026-03-01")
AND action = 'Create'
),

bookings as (
SELECT DISTINCT
  case when meta.event.organisation = 'Holiday Extras GmbH' then 'DE' else 'UK' end as country,
  booking.reference as ref,
  b.code as chipscode,
  booking.agent,
  b.supplier_system,
  booking.start_date as start_date,
  b.product_type as category,
  s.supplier,
  a.agent_name,
  a.agent_channel,
  bp.booking_platform
FROM \`hx-data-production.collector__streaming.server_booking_v*\`
JOIN UNNEST (booking.booking_products) b
LEFT JOIN (
  SELECT chipscode, supplier FROM \`hx-data-production.commercial_finance.sites_combined_de\`
  UNION ALL
  SELECT chipscode, supplier FROM \`hx-data-production.commercial_finance.sites_combined\`
) s on s.chipscode = b.code
LEFT JOIN (SELECT agent, agent_channel, agent_name, country FROM \`hx-data-production.global.agents\`) a on a.agent = booking.agent and a.country = (case when meta.event.organisation = 'Holiday Extras GmbH' then 'DE' else 'UK' end)
LEFT JOIN booking_platform bp on booking.reference = bp.ref
WHERE _PARTITIONDATE between current_date - 364 and current_date - 0
AND action = 'Create'
AND b.type = 'Primary'
),

enqueue AS (SELECT * FROM \`hx-data-production.collector__streaming.server_integration_gateway_enqueue_v1\` WHERE _PARTITIONDATE >= '2026-03-01'),
err     AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_error_v1\`   WHERE _PARTITIONDATE >= '2026-03-01'),
hotel   AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_hotel_v2\`   WHERE _PARTITIONDATE >= '2026-03-01'),
hotelv3 AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_hotel_v3\`   WHERE _PARTITIONDATE >= '2026-03-01'),
hotelv4 AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_hotel_v4\`   WHERE _PARTITIONDATE >= '2026-03-01'),
parking   AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_parking_v2\` WHERE _PARTITIONDATE >= '2026-03-01'),
parkingv3 AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_parking_v3\` WHERE _PARTITIONDATE >= '2026-03-01'),
loungev1   AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_lounge_v1\`   WHERE _PARTITIONDATE >= '2026-03-01'),
transferv1 AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_transfer_v1\` WHERE _PARTITIONDATE >= '2026-03-01'),
transferv2 AS (SELECT * FROM \`hx-data-production.collector__streaming.client_integration_gateway_booking_transfer_v2\` WHERE _PARTITIONDATE >= '2026-03-01'),

summary as (
SELECT
  'Int-Gateway Error' as error_type,
  summary_org.meta_org as organisation,
  err.meta.event.collected as error_date,
  err.error.message as error_message,
  err.error.source as error_source,
  error.supplier as error_supplier,
  err.error.code as error_code,
  null as fixed_error_code,
  err.error.info as error_info,
  enqueue.meta.event.service,
  false hapi_booking_error,
  true as int_gateway_error,
  null as domain,
  null as path,
  null as product_type,
  null as agent_code,
  null as discount_code,
  null as sid,
  null as product_code,
  null as total_price,
  null as request_id,
  enqueue.booking_reference as chips_reference,
  enqueue.booking_action,
  b.chipscode,
  b.supplier,
  b.country,
  b.category,
  b.agent,
  b.agent_name,
  b.agent_channel,
  b.booking_platform,
  b.start_date
FROM enqueue
CROSS JOIN (SELECT enqueue.meta.event.organisation as meta_org) summary_org
LEFT JOIN bookings b on b.ref = enqueue.booking_reference
LEFT OUTER JOIN err USING (queue_id)
LEFT OUTER JOIN hotel USING (queue_id)
LEFT OUTER JOIN hotelv3 USING (queue_id)
LEFT OUTER JOIN hotelv4 USING (queue_id)
LEFT OUTER JOIN parking USING (queue_id)
LEFT OUTER JOIN parkingv3 USING (queue_id)
LEFT OUTER JOIN loungev1 USING (queue_id)
LEFT OUTER JOIN transferv1 USING (queue_id)
LEFT OUTER JOIN transferv2 USING (queue_id)
WHERE
  hotel.action IS NULL AND hotelv3.action IS NULL AND hotelv4.action IS NULL
  AND parking.action IS NULL AND parkingv3.action IS NULL
  AND loungev1.action IS NULL AND transferv1.action IS NULL AND transferv2.action IS NULL
  AND err.error.code IS NOT NULL
  AND err.error.code not in('not-confirmed-canx', 'no-change-requested')

UNION ALL

SELECT
  'HX Error' as error_type,
  meta.event.organisation,
  meta.event.collected as error_date,
  error.message as error_message,
  error.source as error_source,
  error.supplier as error_supplier,
  error.code as error_code,
  IF(REGEXP_CONTAINS(error.message, '[vV]oucher'), 'voucher', IF(REGEXP_CONTAINS(error.message, "Couldn't find FR"), 'de-availability', error.code)) as fixed_error_code,
  error.info as error_info,
  meta.event.service,
  case when resource.path like '%/bookings/new%' then true else false end as hapi_booking_error,
  case when meta.event.service = "int-gateway" OR t_is_gateway_product.value = "true" then true else false end as int_gateway_error,
  resource.domain,
  resource.path,
  REGEXP_EXTRACT(resource.path, '^/([^/]+)/') as product_type,
  r_agent.value as agent_code,
  r_discount_code.value as discount_code,
  r_sid.value as sid,
  JSON_EXTRACT_SCALAR(r_booking.value, '$.code') AS product_code,
  JSON_EXTRACT_SCALAR(r_booking.value, '$.total_price') AS total_price,
  t_request_id.value as request_id,
  t_chips_reference.value as chips_reference,
  case when error.code = 'create-failure' then 'Create' when error.code = 'delete-failure' then 'Delete' when error.code = 'update-failure' then 'Update' else 'Other' end as booking_action,
  b.chipscode,
  b.supplier,
  b.country,
  b.category,
  b.agent,
  b.agent_name,
  b.agent_channel,
  b.booking_platform,
  b.start_date
FROM \`hx-data-production.collector__streaming.server_error_v2\`
LEFT JOIN UNNEST(resource.params) r_agent ON r_agent.key = 'agent'
LEFT JOIN UNNEST(resource.params) r_booking ON r_booking.key = 'booking'
LEFT JOIN UNNEST(resource.params) r_discount_code ON r_discount_code.key = 'discount_code'
LEFT JOIN UNNEST(resource.params) r_sid ON r_sid.key = 'sid'
LEFT JOIN UNNEST(tags) t_request_id ON t_request_id.key = 'request_id'
LEFT JOIN UNNEST(tags) t_is_gateway_product ON t_is_gateway_product.key = 'is_gateway_product'
LEFT JOIN UNNEST(tags) t_chips_reference ON t_chips_reference.key = 'chips_reference'
LEFT JOIN bookings b on b.ref = t_chips_reference.value
WHERE _PARTITIONDATE >= '2026-03-01'
AND meta.event.service in ('hapi','int-gateway')
),

final as (
SELECT DISTINCT
  summary.error_type,
  summary.error_supplier,
  summary.agent,
  summary.agent_name,
  summary.agent_channel,
  case when summary.booking_platform is null and summary.agent_channel = 'R' then 'Retail Site' else summary.booking_platform end as booking_platform,
  summary.country,
  summary.category,
  summary.chips_reference,
  summary.chipscode,
  case when summary.chipscode = 'TRZTRZ' then 'TZ' else summary.supplier end as supplier,
  summary.booking_action,
  summary.error_code,
  summary.error_info,
  summary.error_message,
  date(summary.start_date) as start_date,
  min(summary.error_date) as error_time
FROM summary
WHERE int_gateway_error is true
GROUP BY ALL
)

SELECT * FROM final
WHERE booking_action = 'Create'
ORDER BY start_date ASC, chips_reference ASC
`;

// ── Helpers ────────────────────────────────────────────────────────────────

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

// Row task template — adds all required app fields to a raw BigQuery row
function toTask(obj, queuePrefix, idx) {
  return {
    ...obj,
    _id:              `${queuePrefix}_${idx}`,
    status:           "pending",
    notes:            "",
    archived:         false,
    archived_at:      null,
    archived_by:      null,
    completed_by:     null,
    completed_at:     null,
    status_updated_at: null,
    status_updated_by: null,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────

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
      const status = await bqFetch(`${BQ_BASE}/jobs/${jobId}`, token);
      if (status.status.state === "DONE") {
        if (status.status.errorResult) throw new Error(status.status.errorResult.message);
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

    // 4. Split into 4 workstreams (mirrors the Apps Script logic)
    //    Sort each by start_date ASC (already ordered by query, but enforce here)
    const sortByStartDate = (a, b) => {
      const da = a.start_date ? new Date(a.start_date) : new Date(0);
      const db = b.start_date ? new Date(b.start_date) : new Date(0);
      return da - db;
    };

    const uk            = allRows.filter(r => r.country === "UK" && r.category !== "resort_transfer").sort(sortByStartDate);
    const ukTransfers   = allRows.filter(r => r.country === "UK" && r.category === "resort_transfer").sort(sortByStartDate);
    const de            = allRows.filter(r => r.country === "DE" && r.category !== "resort_transfer").sort(sortByStartDate);
    const deTransfers   = allRows.filter(r => r.country === "DE" && r.category === "resort_transfer").sort(sortByStartDate);

    return Response.json({
      uk:           uk.map((r, i)          => toTask(r, "uk", i)),
      uk_transfers: ukTransfers.map((r, i) => toTask(r, "ukt", i)),
      de:           de.map((r, i)          => toTask(r, "de", i)),
      de_transfers: deTransfers.map((r, i) => toTask(r, "det", i)),
      total: allRows.length,
    });

  } catch (err) {
    console.error("BigQuery error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
