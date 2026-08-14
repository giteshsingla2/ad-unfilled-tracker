'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { HourlyPoint } from '@/lib/queries';
import { format, parseISO } from 'date-fns';
import { Search, X } from 'lucide-react';

interface Props {
  domains: string[];
  selectedDomains: string[];
  days: number;
  search: string;
  selectedUrl?: string;
  urlTrend?: HourlyPoint[];
}

export function PagesControls({ domains, selectedDomains, days, search, selectedUrl, urlTrend = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(search);

  function update(updates: Record<string, string | string[] | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      params.delete(key);
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else if (value) params.set(key, value);
    }
    params.delete('page'); // reset page on filter change
    router.push(`/pages?${params.toString()}`);
  }

  function toggleDomain(d: string) {
    const next = selectedDomains.includes(d)
      ? selectedDomains.filter((x) => x !== d)
      : [...selectedDomains, d];
    update({ domain: next });
  }

  const chartData = urlTrend.map((p) => ({
    ...p,
    label: (() => {
      try { return format(parseISO(p.hour.replace(' ', 'T')), 'MMM d HH:mm'); }
      catch { return p.hour; }
    })(),
  }));

  return (
    <div>
      <div
        className="glass-card-static animate-in"
        style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="pages-search"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') update({ q }); }}
            placeholder="Search by URL…"
            className="glass-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <button
          onClick={() => update({ q })}
          className="btn-glass"
          style={{ padding: '8px 16px' }}
        >
          Search
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />

        {/* Days */}
        {[1, 7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => update({ days: String(d) })}
            className={`btn-glass ${days === d ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
          >
            {d}d
          </button>
        ))}

        {/* Domains */}
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

      {/* Drill-down trend */}
      {selectedUrl && (
        <div className="glass-card-static animate-in" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Hourly trend for</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--accent-light)' }}>
                {selectedUrl}
              </div>
            </div>
            <a href="/pages" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </a>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {chartData.length === 0 ? (
              <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#8b8ba7', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8b8ba7', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: 'rgba(15,16,53,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '0.75rem' }} formatter={(v: any) => [`${v}%`, 'Unfilled']} />
                  <Line type="monotone" dataKey="unfilled_pct" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
