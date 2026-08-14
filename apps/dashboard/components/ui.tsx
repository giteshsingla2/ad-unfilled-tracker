'use client';

interface UnfilledBadgeProps {
  pct: number;
}

export function UnfilledBadge({ pct }: UnfilledBadgeProps) {
  if (pct < 20) return <span className="badge-good">{pct}%</span>;
  if (pct < 50) return <span className="badge-warn">{pct}%</span>;
  return <span className="badge-bad">{pct}%</span>;
}

export function TrendArrow({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return <span style={{ color: 'var(--text-muted)' }}>–</span>;
  const diff = current - prev;
  if (Math.abs(diff) < 0.5) return <span style={{ color: 'var(--text-muted)' }}>→</span>;
  if (diff > 0) return (
    <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
      ↑ {diff.toFixed(1)}%
    </span>
  );
  return (
    <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
      ↓ {Math.abs(diff).toFixed(1)}%
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
      <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
        No data available
      </div>
      <div style={{ fontSize: '0.875rem' }}>{message}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="stat-card animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '700', color: color || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{sub}</div>
      )}
    </div>
  );
}
