'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { HeatmapCell } from '@/lib/queries';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  data: HeatmapCell[];
  domains: string[];
  selectedDomains: string[];
  days: number;
}

function pctToColor(pct: number): string {
  // 0% → cool blue, 50% → amber, 100% → deep red
  if (pct === 0) return 'rgba(99,102,241,0.08)';
  const clamped = Math.min(100, pct);
  if (clamped < 20) {
    const t = clamped / 20;
    return `rgba(16,185,129,${0.15 + t * 0.45})`;
  } else if (clamped < 50) {
    const t = (clamped - 20) / 30;
    return `rgba(245,158,11,${0.2 + t * 0.5})`;
  } else {
    const t = Math.min(1, (clamped - 50) / 50);
    return `rgba(244,63,94,${0.25 + t * 0.6})`;
  }
}

export function HeatmapGrid({ data, domains, selectedDomains, days }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tooltip, setTooltip] = useState<{ dow: number; hour: number; pct: number; samples: number } | null>(null);

  // Build lookup map
  const cellMap = new Map<string, HeatmapCell>();
  data.forEach((c) => cellMap.set(`${c.dow}-${c.hour}`, c));

  function update(key: string, value: string | string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
    router.push(`/patterns?${params.toString()}`);
  }

  function toggleDomain(d: string) {
    const next = selectedDomains.includes(d)
      ? selectedDomains.filter((x) => x !== d)
      : [...selectedDomains, d];
    update('domain', next);
  }

  return (
    <div>
      {/* Controls */}
      <div
        className="glass-card-static animate-in"
        style={{ padding: '14px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Days:</span>
        {[7, 14, 30, 90].map((d) => (
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

      {/* Heatmap */}
      {data.length > 0 && (
        <div className="glass-card-static animate-in-delay-1" style={{ padding: '24px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>Unfilled % by Hour × Day (UTC)</h2>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0%</span>
              <div
                style={{
                  width: '120px',
                  height: '12px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, rgba(16,185,129,0.5), rgba(245,158,11,0.6), rgba(244,63,94,0.85))',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100%</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Grid */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              {/* Y axis: hours */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '4px', paddingTop: '24px' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: '28px',
                      width: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      paddingRight: '4px',
                    }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Columns: days */}
              {DAYS_OF_WEEK.map((dayName, dow) => (
                <div key={dow} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {dayName}
                  </div>
                  {HOURS.map((hour) => {
                    const cell = cellMap.get(`${dow}-${hour}`);
                    const pct = cell ? Number(cell.avg_unfilled_pct) : 0;
                    return (
                      <div
                        key={hour}
                        className="heatmap-cell"
                        style={{
                          width: '28px',
                          height: '28px',
                          background: pctToColor(pct),
                          border: '1px solid rgba(255,255,255,0.04)',
                          position: 'relative',
                        }}
                        onMouseEnter={() =>
                          cell && setTooltip({ dow, hour, pct: Number(cell.avg_unfilled_pct), samples: Number(cell.sample_count) })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div
                style={{
                  position: 'fixed',
                  pointerEvents: 'none',
                  background: 'rgba(15,16,53,0.95)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.8125rem',
                  zIndex: 100,
                  right: '20px',
                  top: '20px',
                  minWidth: '160px',
                }}
              >
                <div style={{ fontWeight: '600', color: '#818cf8', marginBottom: '6px' }}>
                  {DAYS_OF_WEEK[tooltip.dow]} {String(tooltip.hour).padStart(2, '0')}:00 UTC
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  Avg unfilled: <strong>{tooltip.pct}%</strong>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {tooltip.samples} samples
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
