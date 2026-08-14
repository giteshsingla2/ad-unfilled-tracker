import { Suspense } from 'react';
import { OverviewContent } from './OverviewContent';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OverviewContent searchParams={resolvedParams} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            height: '36px',
            width: '220px',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            marginBottom: '8px',
          }}
        />
        <div
          style={{
            height: '20px',
            width: '300px',
            background: 'var(--bg-card)',
            borderRadius: '6px',
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="stat-card"
            style={{ height: '120px', opacity: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}
