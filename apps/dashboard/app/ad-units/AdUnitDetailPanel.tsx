'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { AdUnitTrend, AdUnitTopUrl } from '@/lib/queries';
import { UnfilledBadge } from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';

interface Props {
  domains: string[];
  selectedDomains: string[];
  days: number;
  selectedUnit?: string;
  unitTrend?: AdUnitTrend[];
  topUrls?: AdUnitTopUrl[];
}

export function AdUnitDetailPanel({
  domains,
  selectedDomains,
  days,
  selectedUnit,
  unitTrend = [],
  topUrls = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string | string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
    router.push(`/ad-units?${params.toString()}`);
  }

  function toggleDomain(d: string) {
    const next = selectedDomains.includes(d)
      ? selectedDomains.filter((x) => x !== d)
      : [...selectedDomains, d];
    update('domain', next);
  }

  const chartData = unitTrend.map((p) => ({
    ...p,
    label: (() => {
      try { return format(parseISO(p.hour.replace(' ', 'T')), 'MMM d HH:mm'); }
      catch { return p.hour; }
    })(),
  }));

  return (
    <div>
      {/* Filters */}
      <div
        className="glass-card-static animate-in"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Days:</span>
        {[1, 7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => update('days', String(d))}
            className={`btn-glass ${days === d ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
          >
            {d}d
          </button>
        ))}
        {domains.length > 0 && (
          <>
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                className={`btn-glass ${selectedDomains.includes(d) ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.75rem', fontFamily: 'monospace' }}
              >
                {d}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selectedUnit && (
        <div className="glass-card-static animate-in" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ad Unit Detail</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: '600', color: 'var(--accent-light)' }}>
                {selectedUnit}
              </div>
            </div>
            <a
              href="/ad-units"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={14} />
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '0' }}>
            {/* Trend Chart */}
            <div style={{ padding: '20px 24px', borderRight: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Hourly Unfilled %
              </div>
              {chartData.length === 0 ? (
                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No trend data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: '#8b8ba7', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#8b8ba7', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(15,16,53,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '0.75rem' }}
                      formatter={(v: any) => [`${v}%`, 'Unfilled']}
                    />
                    <Line type="monotone" dataKey="unfilled_pct" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top URLs */}
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Top URLs by Unfilled %
              </div>
              {topUrls.map((u, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 0',
                    borderBottom: i < topUrls.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                    title={u.page_url}
                  >
                    {u.page_url}
                  </div>
                  <UnfilledBadge pct={Number(u.unfilled_pct)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
