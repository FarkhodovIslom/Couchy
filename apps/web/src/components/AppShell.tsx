'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '../lib/SessionProvider';
import { MessageSquare, Network, BarChart3, LogOut, ChevronLeft } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Role display labels                                                        */
/* -------------------------------------------------------------------------- */

const ROLE_LABELS: Record<string, string> = {
  junior_backend: 'Junior Backend',
  junior_frontend: 'Junior Frontend',
  qa: 'QA Engineer',
  lead: 'Tech Lead',
  sa: 'Solution Architect',
};

/* -------------------------------------------------------------------------- */
/*  Navigation items                                                           */
/* -------------------------------------------------------------------------- */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { session } = useSession();
  const sid = session?.sessionId ?? '';
  const completedSteps = session?.steps?.filter((s) => s.completed).length ?? 0;
  const totalSteps = session?.steps?.length ?? 0;

  return [
    { href: `/chat/${sid}`, label: 'Chat', icon: <MessageSquare size={16} /> },
    { href: '/graph', label: 'Knowledge Graph', icon: <Network size={16} /> },
    { href: `/report/${sid}`, label: 'Report', icon: <BarChart3 size={16} /> },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, clearSession, isAuthenticated } = useSession();
  const pathname = usePathname();
  const navItems = useNavItems();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [profileHover, setProfileHover] = useState(false);

  // No shell for unauthenticated pages (onboarding, root)
  if (!isAuthenticated || !session) {
    return <>{children}</>;
  }

  const user = session.user;
  const completedCount = session.steps.filter((s) => s.completed).length;
  const totalCount = session.steps.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* ================================================================== */}
      {/*  Sidebar                                                            */}
      {/* ================================================================== */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="anim-slide-up"
      >
        {/* ---- Logo / Brand ---- */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              K
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                Kibo AI
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '10px',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Onboarding Platform
              </div>
            </div>
          </div>
        </div>

        {/* ---- User Profile Card ---- */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            backgroundColor: profileHover ? 'var(--bg-elevated)' : 'transparent',
            transition: 'background-color var(--dur-fast) var(--ease-ios)',
          }}
          onMouseEnter={() => setProfileHover(true)}
          onMouseLeave={() => setProfileHover(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
                boxShadow: '0 2px 8px var(--accent-dim)',
              }}
            >
              {user.avatar}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            </div>
          </div>

          {/* Department & join date */}
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              {user.department}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              {user.joinDate}
            </span>
          </div>
        </div>

        {/* ---- Navigation ---- */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
              padding: '0 8px',
              marginBottom: 8,
            }}
          >
            Navigation
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const isHovered = hoveredNav === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isActive
                      ? 'var(--accent-dim)'
                      : isHovered
                        ? 'var(--bg-elevated)'
                        : 'transparent',
                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                    transition: 'all var(--dur-fast) var(--ease-ios)',
                  }}
                  onMouseEnter={() => setHoveredNav(item.href)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  <span style={{ lineHeight: 1, display: 'flex', alignItems: 'center', color: isActive ? 'var(--accent)' : 'inherit' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#fff',
                        backgroundColor: 'var(--danger)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ---- Progress Section ---- */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 500,
              }}
            >
              Onboarding
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: progressPct >= 100 ? 'var(--success)' : 'var(--accent)',
                fontWeight: 500,
              }}
            >
              {progressPct}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 4,
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 999,
              overflow: 'hidden',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: progressPct >= 100 ? 'var(--success)' : 'var(--accent)',
                borderRadius: 999,
                transition: 'width 0.6s var(--ease-out-quart)',
              }}
            />
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-tertiary)',
            }}
          >
            {completedCount} / {totalCount} steps completed
          </div>
        </div>

        {/* ---- Session Info / Logout ---- */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 140,
            }}
            title={`Session: ${session.sessionId}`}
          >
            sid: {session.sessionId.slice(0, 8)}…
          </span>
          <button
            onClick={() => {
              clearSession();
              window.location.href = '/';
            }}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              transition: 'all var(--dur-fast) var(--ease-ios)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* ================================================================== */}
      {/*  Main content                                                       */}
      {/* ================================================================== */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
        className="anim-page-enter"
      >
        {children}
      </main>
    </div>
  );
}
