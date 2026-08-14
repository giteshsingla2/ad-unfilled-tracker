import { Suspense } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { getHeatmapData, getDomains, type HeatmapCell } from '@/lib/queries';
import { EmptyState } from '@/components/ui';
import { HeatmapGrid } from './HeatmapGrid';

export const dynamic = 'force-dynamic';

export default async function PatternsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const days = parseInt((sp.days as string) || '30');
  const selectedDomains = sp.domain
    ? Array.isArray(sp.domain) ? sp.domain : [sp.domain]
    : [];

  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(subDays(now, days));

  let heatmapData: HeatmapCell[] = [];
  let domains: string[] = [];
  let hasError = false;
  let errorMsg = '';

  try {
    [heatmapData, domains] = await Promise.all([
      getHeatmapData(selectedDomains, from, to),
      getDomains(),
    ]);
  } catch (err: unknown) {
    hasError = true;
    errorMsg = err instanceof Error ? err.message : 'Unknown error';
    heatmapData = [];
    domains = [];
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }} className="animate-in">
        <h1 className="gradient-text" style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '6px' }}>
          Patterns
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Hour-of-day × day-of-week heatmap · Spot which times are consistently bad
        </p>
      </div>

      {hasError && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: 'var(--red)', fontSize: '0.875rem' }}>
          ⚠️ Database error: {errorMsg}
        </div>
      )}

      <Suspense>
        <HeatmapGrid
          data={heatmapData}
          domains={domains}
          selectedDomains={selectedDomains}
          days={days}
        />
      </Suspense>

      {heatmapData.length === 0 && !hasError && (
        <div className="glass-card-static" style={{ padding: '0' }}>
          <EmptyState message="No data available. Adjust the date range or domain filters." />
        </div>
      )}
    </div>
  );
}
