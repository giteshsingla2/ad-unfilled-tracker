import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Ad Tracker Dashboard — Unfilled Ad Analytics',
  description:
    'Internal analytics dashboard for monitoring Google Ad Manager unfilled ad rates across domains, pages, and ad units.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main
              style={{
                marginLeft: '240px',
                flex: 1,
                padding: '32px',
                minHeight: '100vh',
                maxWidth: '100%',
                overflowX: 'hidden',
              }}
            >
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
