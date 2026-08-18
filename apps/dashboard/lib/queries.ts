import pool from './db';

export interface SummaryStats {
  total_requests: number;
  total_filled: number;
  total_unfilled: number;
  unfilled_pct: number;
}

export interface DomainStat {
  domain: string;
  total_requests: number;
  total_filled: number;
  total_unfilled: number;
  unfilled_pct: number;
  prev_unfilled_pct: number | null;
}

export interface HourlyPoint {
  hour: string;
  requests: number;
  filled: number;
  unfilled: number;
  unfilled_pct: number;
}

export interface AdUnitStat {
  ad_unit: string;
  domain: string;
  total_requests: number;
  total_filled: number;
  total_unfilled: number;
  unfilled_pct: number;
}

export interface PageStat {
  page_url: string;
  domain: string;
  ad_units: string[];
  total_requests: number;
  total_unfilled: number;
  unfilled_pct: number;
}

export interface HeatmapCell {
  dow: number; // 0=Sun, 1=Mon ... 6=Sat
  hour: number; // 0-23
  avg_unfilled_pct: number;
  sample_count: number;
}

export interface AdUnitTrend {
  hour: string;
  unfilled_pct: number;
  requests: number;
}

export interface AdUnitTopUrl {
  page_url: string;
  total_requests: number;
  unfilled_pct: number;
}

// ─── Overview ────────────────────────────────────────────────────────────────

export async function getSummaryStats(
  domains: string[],
  from: Date,
  to: Date
): Promise<SummaryStats> {
  const domainFilter = domains.length
    ? `AND domain = ANY($3::text[])`
    : '';
  const params: (Date | string[])[] = [from, to];
  if (domains.length) params.push(domains);

  const { rows } = await pool.query<SummaryStats>(
    `SELECT
       COALESCE(SUM(requests),0)::int AS total_requests,
       COALESCE(SUM(filled),0)::int   AS total_filled,
       COALESCE(SUM(unfilled),0)::int AS total_unfilled,
       CASE WHEN SUM(requests) > 0
         THEN ROUND((SUM(unfilled)::numeric / SUM(requests)) * 100, 2)
         ELSE 0
       END AS unfilled_pct
     FROM ad_stats_hourly
     WHERE hour_bucket >= $1 AND hour_bucket < $2 ${domainFilter}`,
    params
  );
  return rows[0];
}

export async function getDomainStats(
  from: Date,
  to: Date,
  prevFrom: Date,
  prevTo: Date
): Promise<DomainStat[]> {
  const { rows } = await pool.query<DomainStat>(
    `WITH current AS (
       SELECT domain,
              SUM(requests)::int  AS total_requests,
              SUM(filled)::int    AS total_filled,
              SUM(unfilled)::int  AS total_unfilled,
              CASE WHEN SUM(requests)>0
                THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
                ELSE 0 END AS unfilled_pct
       FROM ad_stats_hourly
       WHERE hour_bucket >= $1 AND hour_bucket < $2
       GROUP BY domain
     ),
     previous AS (
       SELECT domain,
              CASE WHEN SUM(requests)>0
                THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
                ELSE NULL END AS prev_unfilled_pct
       FROM ad_stats_hourly
       WHERE hour_bucket >= $3 AND hour_bucket < $4
       GROUP BY domain
     )
     SELECT c.*, p.prev_unfilled_pct
     FROM current c
     LEFT JOIN previous p ON c.domain = p.domain
     ORDER BY c.unfilled_pct DESC`,
    [from, to, prevFrom, prevTo]
  );
  return rows;
}

export async function getHourlyTrend(
  domains: string[],
  from: Date,
  to: Date,
  granularity: 'hourly' | 'daily' = 'hourly'
): Promise<HourlyPoint[]> {
  const domainFilter = domains.length ? `AND domain = ANY($3::text[])` : '';
  const params: (Date | string[])[] = [from, to];
  if (domains.length) params.push(domains);

  const truncExpr =
    granularity === 'daily'
      ? `DATE_TRUNC('day', hour_bucket AT TIME ZONE 'Asia/Kolkata')`
      : `DATE_TRUNC('hour', hour_bucket AT TIME ZONE 'Asia/Kolkata')`;

  const { rows } = await pool.query<HourlyPoint>(
    `SELECT
       ${truncExpr}::text AS hour,
       SUM(requests)::int AS requests,
       SUM(filled)::int   AS filled,
       SUM(unfilled)::int AS unfilled,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct
     FROM ad_stats_hourly
     WHERE hour_bucket >= $1 AND hour_bucket < $2 ${domainFilter}
     GROUP BY 1
     ORDER BY 1`,
    params
  );
  return rows;
}

export async function getDomains(): Promise<string[]> {
  const { rows } = await pool.query<{ domain: string }>(
    'SELECT DISTINCT domain FROM ad_stats_hourly ORDER BY domain'
  );
  return rows.map((r) => r.domain);
}

// ─── Ad Units ────────────────────────────────────────────────────────────────

export async function getAdUnitStats(
  domains: string[],
  from: Date,
  to: Date
): Promise<AdUnitStat[]> {
  const domainFilter = domains.length ? `AND domain = ANY($3::text[])` : '';
  const params: (Date | string[])[] = [from, to];
  if (domains.length) params.push(domains);

  const { rows } = await pool.query<AdUnitStat>(
    `SELECT ad_unit, domain,
       SUM(requests)::int  AS total_requests,
       SUM(filled)::int    AS total_filled,
       SUM(unfilled)::int  AS total_unfilled,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct
     FROM ad_stats_hourly
     WHERE hour_bucket >= $1 AND hour_bucket < $2 ${domainFilter}
     GROUP BY ad_unit, domain
     ORDER BY unfilled_pct DESC`,
    params
  );
  return rows;
}

export async function getAdUnitTrend(
  adUnit: string,
  from: Date,
  to: Date
): Promise<AdUnitTrend[]> {
  const { rows } = await pool.query<AdUnitTrend>(
    `SELECT
       DATE_TRUNC('hour', hour_bucket AT TIME ZONE 'Asia/Kolkata')::text AS hour,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct,
       SUM(requests)::int AS requests
     FROM ad_stats_hourly
     WHERE ad_unit = $1 AND hour_bucket >= $2 AND hour_bucket < $3
     GROUP BY 1
     ORDER BY 1`,
    [adUnit, from, to]
  );
  return rows;
}

export async function getAdUnitTopUrls(
  adUnit: string,
  from: Date,
  to: Date
): Promise<AdUnitTopUrl[]> {
  const { rows } = await pool.query<AdUnitTopUrl>(
    `SELECT page_url,
       SUM(requests)::int AS total_requests,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct
     FROM ad_stats_hourly
     WHERE ad_unit = $1 AND hour_bucket >= $2 AND hour_bucket < $3
     GROUP BY page_url
     ORDER BY unfilled_pct DESC
     LIMIT 10`,
    [adUnit, from, to]
  );
  return rows;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export async function getPageStats(
  domains: string[],
  from: Date,
  to: Date,
  search: string,
  limit: number,
  offset: number
): Promise<{ rows: PageStat[]; total: number }> {
  const conditions: string[] = ['hour_bucket >= $1', 'hour_bucket < $2'];
  const params: (Date | string[] | string | number)[] = [from, to];

  if (domains.length) {
    params.push(domains);
    conditions.push(`domain = ANY($${params.length}::text[])`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`page_url ILIKE $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT page_url || '|' || domain)::text AS count
     FROM ad_stats_hourly ${where}`,
    params
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0');

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query<PageStat>(
    `SELECT page_url, domain,
       ARRAY_AGG(DISTINCT ad_unit) AS ad_units,
       SUM(requests)::int AS total_requests,
       SUM(unfilled)::int AS total_unfilled,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct
     FROM ad_stats_hourly ${where}
     GROUP BY page_url, domain
     ORDER BY unfilled_pct DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total };
}

export async function getPageTrend(
  pageUrl: string,
  from: Date,
  to: Date
): Promise<HourlyPoint[]> {
  const { rows } = await pool.query<HourlyPoint>(
    `SELECT
       DATE_TRUNC('hour', hour_bucket AT TIME ZONE 'Asia/Kolkata')::text AS hour,
       SUM(requests)::int AS requests,
       SUM(filled)::int   AS filled,
       SUM(unfilled)::int AS unfilled,
       CASE WHEN SUM(requests)>0
         THEN ROUND((SUM(unfilled)::numeric/SUM(requests))*100,2)
         ELSE 0 END AS unfilled_pct
     FROM ad_stats_hourly
     WHERE page_url = $1 AND hour_bucket >= $2 AND hour_bucket < $3
     GROUP BY 1 ORDER BY 1`,
    [pageUrl, from, to]
  );
  return rows;
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

export async function getHeatmapData(
  domains: string[],
  from: Date,
  to: Date
): Promise<HeatmapCell[]> {
  const domainFilter = domains.length ? `AND domain = ANY($3::text[])` : '';
  const params: (Date | string[])[] = [from, to];
  if (domains.length) params.push(domains);

  const { rows } = await pool.query<HeatmapCell>(
    `SELECT
       EXTRACT(DOW FROM hour_bucket AT TIME ZONE 'Asia/Kolkata')::int AS dow,
       EXTRACT(HOUR FROM hour_bucket AT TIME ZONE 'Asia/Kolkata')::int AS hour,
       ROUND(AVG(CASE WHEN requests>0 THEN (unfilled::numeric/requests)*100 ELSE 0 END),2) AS avg_unfilled_pct,
       COUNT(*)::int AS sample_count
     FROM ad_stats_hourly
     WHERE hour_bucket >= $1 AND hour_bucket < $2 ${domainFilter}
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    params
  );
  return rows;
}
