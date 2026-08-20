import { subDays } from 'date-fns';
import { getDomainStats, type DomainStat } from '@/lib/queries';
import { istStartOfDay, istEndOfDay } from '@/lib/ist';
import { EmptyState, TrendArrow } from '@/components/ui';

export const dynamic = 'force-dynamic';

function UnfilledBar({ pct }: { pct: number }) {
  const color = pct < 20 ? 'var(--green)' : pct < 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: '8px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, pct)}%`,
            background: color,
            borderRadius: '4px',
            boxShadow: `0 0 8px ${color}`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontWeight: '700', color, fontVariantNumeric: 'tabular-nums', minWidth: '48px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

export default async function DomainsPage() {
  const now = new Date();
  const to = istEndOfDay(now);
  const from = istStartOfDay(subDays(now, 7));
  const prevFrom = istStartOfDay(subDays(from, 7));
  const prevTo = istEndOfDay(subDays(to, 7));

  let domainStats: DomainStat[] = [];
  let hasError = false;
  let errorMsg = '';

  try {
    domainStats = await getDomainStats(from, to, prevFrom, prevTo);
  } catch (err: unknown) {
    hasError = true;
    errorMsg = err instanceof Error ? err.message : 'Unknown error';
    domainStats = [];
  }

  const maxRequests = Math.max(...domainStats.map((d) => Number(d.total_requests)), 1);

  return (
    <div>
      <div style={{ marginBottom: '32px' }} className="animate-in">
        <h1 className="gradient-text" style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '6px' }}>
          Domain Comparison
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Last 7 days · Side-by-side performance across all properties
        </p>
      </div>

      {hasError && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: 'var(--red)', fontSize: '0.875rem' }}>
          ⚠️ Database error: {errorMsg}
        </div>
      )}

      {domainStats.length === 0 && !hasError ? (
        <div className="glass-card-static">
          <EmptyState message="No domain data yet." />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {domainStats.map((d, i) => {
            const unfilled = Number(d.unfilled_pct);
            const prev = d.prev_unfilled_pct !== null ? Number(d.prev_unfilled_pct) : null;
            const volPct = (Number(d.total_requests) / maxRequests) * 100;

            return (
              <div
                key={d.domain}
                className="glass-card animate-in"
                style={{
                  padding: '24px',
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                {/* Domain name */}
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    color: 'var(--accent-light)',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div className="glow-dot" />
                  {d.domain}
                </div>

                {/* Unfilled bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Unfilled %
                    </span>
                    <TrendArrow current={unfilled} prev={prev} />
                  </div>
                  <UnfilledBar pct={unfilled} />
                </div>

                {/* Volume bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Volume
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {Number(d.total_requests).toLocaleString()} req
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${volPct}%`,
                        background: 'rgba(99,102,241,0.6)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Requests', value: Number(d.total_requests).toLocaleString(), color: 'var(--text-primary)' },
                    { label: 'Filled', value: Number(d.total_filled).toLocaleString(), color: 'var(--green)' },
                    { label: 'Unfilled', value: Number(d.total_unfilled).toLocaleString(), color: 'var(--red)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color, fontVariantNumeric: 'tabular-nums' }}>
                        {value}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
