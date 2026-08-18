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
  ReferenceLine,
} from 'recharts';
import type { HourlyPoint } from '@/lib/queries';
import { format, parseISO } from 'date-fns';

interface Props {
  domains: string[];
  selectedDomains: string[];
  days: number;
  granularity: 'hourly' | 'daily';
  hourlyTrend: HourlyPoint[];
}

const DAY_OPTIONS = [1, 7, 14, 30];

export function OverviewCharts({
  domains,
  selectedDomains,
  days,
  granularity,
  hourlyTrend,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string | string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  }

  function toggleDomain(d: string) {
    const next = selectedDomains.includes(d)
      ? selectedDomains.filter((x) => x !== d)
      : [...selectedDomains, d];
    update('domain', next);
  }

  const chartData = hourlyTrend.map((p) => ({
    ...p,
    label: (() => {
      try {
        const d = parseISO(p.hour.replace(' ', 'T'));
        return granularity === 'daily'
          ? format(d, 'MMM d')
          : format(d, 'MMM d HH:mm');
      } catch {
        return p.hour;
      }
    })(),
  }));

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Controls Row */}
      <div
        className="glass-card-static animate-in-delay-1"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Date Range */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Days:</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              id={`days-${d}`}
              onClick={() => update('days', String(d))}
              className={`btn-glass ${days === d ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

        {/* Granularity */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>View:</span>
          {(['daily', 'hourly'] as const).map((g) => (
            <button
              key={g}
              id={`granularity-${g}`}
              onClick={() => update('granularity', g)}
              className={`btn-glass ${granularity === g ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Divider */}
        {domains.length > 0 && (
          <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />
        )}

        {/* Domain Filter */}
        {domains.map((d) => (
          <button
            key={d}
            id={`domain-${d}`}
            onClick={() => toggleDomain(d)}
            className={`btn-glass ${selectedDomains.includes(d) ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.75rem', fontFamily: 'monospace' }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div
        className="glass-card-static animate-in-delay-1"
        style={{ padding: '24px', marginBottom: '4px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Unfilled % Over Time
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IST (GMT+5:30)</span>
        </div>

        {chartData.length === 0 ? (
          <div
            style={{
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            No data for selected filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8b8ba7', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#8b8ba7', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,16,53,0.95)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                }}
                labelStyle={{ color: '#818cf8', fontWeight: 600 }}
                itemStyle={{ color: '#f0f0ff' }}
                formatter={(v: any) => [`${v}%`, 'Unfilled']}
              />
              <ReferenceLine y={20} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" label={{ value: '20%', fill: '#10b981', fontSize: 10, position: 'insideRight' }} />
              <ReferenceLine y={50} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 4" label={{ value: '50%', fill: '#f43f5e', fontSize: 10, position: 'insideRight' }} />
              <Line
                type="monotone"
                dataKey="unfilled_pct"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#6366f1', stroke: '#a78bfa', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
