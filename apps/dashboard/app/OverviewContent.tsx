import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  getSummaryStats,
  getDomainStats,
  getHourlyTrend,
  getDomains,
  type SummaryStats,
  type DomainStat,
  type HourlyPoint,
} from '@/lib/queries';
import { StatCard, UnfilledBadge, TrendArrow, EmptyState } from '@/components/ui';
import { OverviewCharts } from './OverviewCharts';

export async function OverviewContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const days = parseInt((searchParams.days as string) || '7');
  const selectedDomains = searchParams.domain
    ? Array.isArray(searchParams.domain)
      ? searchParams.domain
      : [searchParams.domain]
    : [];
  const granularity = (searchParams.granularity as 'hourly' | 'daily') || 'daily';

  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(subDays(now, days));
  const prevFrom = startOfDay(subDays(from, days));
  const prevTo = endOfDay(subDays(to, days));

  let summary: SummaryStats = { total_requests: 0, total_filled: 0, total_unfilled: 0, unfilled_pct: 0 };
  let domains: string[] = [];
  let domainStats: DomainStat[] = [];
  let hourlyTrend: HourlyPoint[] = [];
  let hasError = false;
  let errorMsg = '';

  try {
    [summary, domains, domainStats, hourlyTrend] = await Promise.all([
      getSummaryStats(selectedDomains, from, to),
      getDomains(),
      getDomainStats(from, to, prevFrom, prevTo),
      getHourlyTrend(selectedDomains, from, to, granularity),
    ]);
  } catch (err: unknown) {
    hasError = true;
    errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    summary = { total_requests: 0, total_filled: 0, total_unfilled: 0, unfilled_pct: 0 };
    domains = [];
    domainStats = [];
    hourlyTrend = [];
  }

  const unfilledColor =
    Number(summary.unfilled_pct) < 20
      ? 'var(--green)'
      : Number(summary.unfilled_pct) < 50
        ? 'var(--amber)'
        : 'var(--red)';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }} className="animate-in">
        <h1 className="gradient-text" style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '6px' }}>
          Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Ad fill performance across all domains · Data in IST (GMT+5:30)
        </p>
      </div>

      {hasError && (
        <div
          style={{
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            color: 'var(--red)',
            fontSize: '0.875rem',
          }}
        >
          ⚠️ Database connection error: {errorMsg}. Check your PG_ environment variables.
        </div>
      )}

      {/* Filters */}
      <OverviewCharts
        domains={domains}
        selectedDomains={selectedDomains}
        days={days}
        granularity={granularity}
        hourlyTrend={hourlyTrend}
      />

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          label="Total Requests"
          value={summary.total_requests.toLocaleString()}
          icon="📡"
        />
        <StatCard
          label="Filled"
          value={summary.total_filled.toLocaleString()}
          icon="✅"
          color="var(--green)"
        />
        <StatCard
          label="Unfilled"
          value={summary.total_unfilled.toLocaleString()}
          icon="❌"
          color="var(--red)"
        />
        <StatCard
          label="Unfilled %"
          value={`${summary.unfilled_pct}%`}
          icon="📊"
          color={unfilledColor}
          sub={`Last ${days} days`}
        />
      </div>

      {/* Domain Table */}
      <div className="glass-card-static animate-in-delay-2" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            By Domain
          </h2>
        </div>
        {domainStats.length === 0 ? (
          <EmptyState message="No data for the selected date range." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th style={{ textAlign: 'right' }}>Requests</th>
                  <th style={{ textAlign: 'right' }}>Filled</th>
                  <th style={{ textAlign: 'right' }}>Unfilled</th>
                  <th style={{ textAlign: 'right' }}>Unfilled %</th>
                  <th style={{ textAlign: 'right' }}>vs Prev Period</th>
                </tr>
              </thead>
              <tbody>
                {domainStats.map((d) => (
                  <tr key={d.domain}>
                    <td>
                      <span
                        style={{
                          fontWeight: '500',
                          color: 'var(--accent-light)',
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {d.domain}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(d.total_requests).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(d.total_filled).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(d.total_unfilled).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <UnfilledBadge pct={Number(d.unfilled_pct)} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <TrendArrow
                        current={Number(d.unfilled_pct)}
                        prev={d.prev_unfilled_pct !== null ? Number(d.prev_unfilled_pct) : null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
