import { Suspense } from 'react';
import { subDays } from 'date-fns';
import {
  getAdUnitStats,
  getDomains,
  getAdUnitTrend,
  getAdUnitTopUrls,
  type AdUnitStat,
  type AdUnitTrend,
  type AdUnitTopUrl,
} from '@/lib/queries';
import { istStartOfDay, istEndOfDay } from '@/lib/ist';
import { UnfilledBadge, EmptyState } from '@/components/ui';
import { AdUnitDetailPanel } from './AdUnitDetailPanel';

export const dynamic = 'force-dynamic';

export default async function AdUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const days = parseInt((sp.days as string) || '7');
  const selectedDomains = sp.domain
    ? Array.isArray(sp.domain) ? sp.domain : [sp.domain]
    : [];
  const selectedUnit = sp.unit as string | undefined;

  const now = new Date();
  const to = istEndOfDay(now);
  const from = istStartOfDay(subDays(now, days));

  let adUnits: AdUnitStat[] = [];
  let domains: string[] = [];
  let unitTrend: AdUnitTrend[] | undefined;
  let topUrls: AdUnitTopUrl[] | undefined;
  let hasError = false;
  let errorMsg = '';

  try {
    [adUnits, domains] = await Promise.all([
      getAdUnitStats(selectedDomains, from, to),
      getDomains(),
    ]);

    if (selectedUnit) {
      [unitTrend, topUrls] = await Promise.all([
        getAdUnitTrend(selectedUnit, from, to),
        getAdUnitTopUrls(selectedUnit, from, to),
      ]);
    }
  } catch (err: unknown) {
    hasError = true;
    errorMsg = err instanceof Error ? err.message : 'Unknown error';
    adUnits = []; domains = [];
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }} className="animate-in">
        <h1 className="gradient-text" style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '6px' }}>
          Ad Units
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Unfilled rates broken down by ad unit · Click a row to see hourly trend
        </p>
      </div>

      {hasError && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: 'var(--red)', fontSize: '0.875rem' }}>
          ⚠️ Database error: {errorMsg}
        </div>
      )}

      {/* Filters */}
      <Suspense>
        <AdUnitDetailPanel
          domains={domains}
          selectedDomains={selectedDomains}
          days={days}
          selectedUnit={selectedUnit}
          unitTrend={unitTrend}
          topUrls={topUrls}
        />
      </Suspense>

      {/* Table */}
      <div className="glass-card-static animate-in-delay-1" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>
            {adUnits.length} Ad Units
          </h2>
        </div>
        {adUnits.length === 0 ? (
          <EmptyState message="No ad unit data for the selected filters." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Ad Unit</th>
                  <th>Domain</th>
                  <th style={{ textAlign: 'right' }}>Requests</th>
                  <th style={{ textAlign: 'right' }}>Filled</th>
                  <th style={{ textAlign: 'right' }}>Unfilled</th>
                  <th style={{ textAlign: 'right' }}>Unfilled %</th>
                </tr>
              </thead>
              <tbody>
                {adUnits.map((u, i) => (
                  <AdUnitRow key={`${u.domain}-${u.ad_unit}`} unit={u} index={i} selected={selectedUnit === u.ad_unit} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdUnitRow({
  unit,
  selected,
}: {
  unit: { ad_unit: string; domain: string; total_requests: number; total_filled: number; total_unfilled: number; unfilled_pct: number };
  index: number;
  selected: boolean;
}) {
  return (
    <tr
      style={{
        background: selected ? 'rgba(99,102,241,0.08)' : undefined,
        cursor: 'pointer',
      }}
    >
      <td>
        <a
          href={`/ad-units?unit=${encodeURIComponent(unit.ad_unit)}`}
          style={{
            color: 'var(--accent-light)',
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            fontWeight: selected ? '600' : '400',
            textDecoration: 'none',
          }}
        >
          {unit.ad_unit}
        </a>
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
        {unit.domain}
      </td>
      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {Number(unit.total_requests).toLocaleString()}
      </td>
      <td style={{ textAlign: 'right', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
        {Number(unit.total_filled).toLocaleString()}
      </td>
      <td style={{ textAlign: 'right', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
        {Number(unit.total_unfilled).toLocaleString()}
      </td>
      <td style={{ textAlign: 'right' }}>
        <UnfilledBadge pct={Number(unit.unfilled_pct)} />
      </td>
    </tr>
  );
}
