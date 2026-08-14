import { Suspense } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  getPageStats,
  getDomains,
  getPageTrend,
  type PageStat,
  type HourlyPoint,
} from '@/lib/queries';
import { UnfilledBadge, EmptyState } from '@/components/ui';
import { PagesControls } from './PagesControls';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const days = parseInt((sp.days as string) || '7');
  const selectedDomains = sp.domain
    ? Array.isArray(sp.domain) ? sp.domain : [sp.domain]
    : [];
  const search = (sp.q as string) || '';
  const page = Math.max(1, parseInt((sp.page as string) || '1'));
  const selectedUrl = sp.url as string | undefined;

  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(subDays(now, days));

  let result: { rows: PageStat[]; total: number } = { rows: [], total: 0 };
  let domains: string[] = [];
  let urlTrend: HourlyPoint[] | undefined;
  let hasError = false;
  let errorMsg = '';

  try {
    [result, domains] = await Promise.all([
      getPageStats(selectedDomains, from, to, search, PAGE_SIZE, (page - 1) * PAGE_SIZE),
      getDomains(),
    ]);
    if (selectedUrl) {
      urlTrend = await getPageTrend(selectedUrl, from, to);
    }
  } catch (err: unknown) {
    hasError = true;
    errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result = { rows: [], total: 0 };
    domains = [];
  }

  const totalPages = Math.ceil((result?.total ?? 0) / PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: '32px' }} className="animate-in">
        <h1 className="gradient-text" style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '6px' }}>
          Pages
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Unfilled rates by page URL · Sorted worst first · Click a row to drill in
        </p>
      </div>

      {hasError && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: 'var(--red)', fontSize: '0.875rem' }}>
          ⚠️ Database error: {errorMsg}
        </div>
      )}

      <Suspense>
        <PagesControls
          domains={domains}
          selectedDomains={selectedDomains}
          days={days}
          search={search}
          selectedUrl={selectedUrl}
          urlTrend={urlTrend}
        />
      </Suspense>

      {/* Table */}
      <div className="glass-card-static animate-in-delay-1" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>
            {result.total.toLocaleString()} Pages
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages || 1}
          </span>
        </div>

        {result.rows.length === 0 ? (
          <EmptyState message="No page data for the selected filters." />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Page URL</th>
                    <th>Domain</th>
                    <th>Ad Units</th>
                    <th style={{ textAlign: 'right' }}>Requests</th>
                    <th style={{ textAlign: 'right' }}>Unfilled</th>
                    <th style={{ textAlign: 'right' }}>Unfilled %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      key={`${row.domain}${row.page_url}`}
                      style={{
                        background: selectedUrl === row.page_url ? 'rgba(99,102,241,0.08)' : undefined,
                      }}
                    >
                      <td style={{ maxWidth: '320px' }}>
                        <a
                          href={`/pages?url=${encodeURIComponent(row.page_url)}&days=${days}`}
                          style={{
                            color: 'var(--accent-light)',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={row.page_url}
                        >
                          {row.page_url}
                        </a>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {row.domain}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {row.ad_units?.slice(0, 3).map((u: string) => (
                            <span
                              key={u}
                              style={{
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.6875rem',
                                color: 'var(--accent-light)',
                                fontFamily: 'monospace',
                              }}
                            >
                              {u}
                            </span>
                          ))}
                          {(row.ad_units?.length ?? 0) > 3 && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              +{row.ad_units.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(row.total_requests).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(row.total_unfilled).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <UnfilledBadge pct={Number(row.unfilled_pct)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {page > 1 && (
                  <a
                    href={`/pages?page=${page - 1}&days=${days}&q=${search}`}
                    className="btn-glass"
                    style={{ textDecoration: 'none' }}
                  >
                    ← Prev
                  </a>
                )}
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <a
                    href={`/pages?page=${page + 1}&days=${days}&q=${search}`}
                    className="btn-glass"
                    style={{ textDecoration: 'none' }}
                  >
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
