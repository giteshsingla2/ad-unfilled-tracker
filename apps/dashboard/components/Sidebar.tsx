'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  FileText,
  Grid3X3,
  Globe,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/ad-units', icon: Layers, label: 'Ad Units' },
  { href: '/pages', icon: FileText, label: 'Pages' },
  { href: '/patterns', icon: Grid3X3, label: 'Patterns' },
  { href: '/domains', icon: Globe, label: 'Domains' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sidebar"
      style={{
        width: '240px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '32px', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>A</span>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
              }}
            >
              Ad Tracker
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Unfilled Analytics
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '0.65rem',
              fontWeight: '600',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              padding: '0 8px',
              marginBottom: '8px',
            }}
          >
            Analytics
          </div>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div
        style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Data: UTC
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
