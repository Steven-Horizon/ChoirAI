import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Music, Mic2, Monitor, Users, CalendarCheck, Settings, LogOut, Wind,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AIBookmark from './AIBookmark';
import { initTheme } from '@/lib/theme';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('member' | 'captain' | 'admin')[];
}

const ALL_NAV: NavItem[] = [
  { path: '/', label: '首页', icon: Home, roles: ['member', 'captain', 'admin'] },
  { path: '/scores', label: '谱子', icon: Music, roles: ['member', 'captain', 'admin'] },
  { path: '/practice', label: '练习', icon: Mic2, roles: ['member', 'captain', 'admin'] },
  { path: '/hall', label: '排练', icon: Monitor, roles: ['member', 'captain', 'admin'] },
  { path: '/voice-parts', label: '声部', icon: Users, roles: ['captain', 'admin'] },
  { path: '/plans', label: '计划', icon: CalendarCheck, roles: ['member', 'captain', 'admin'] },
  { path: '/warmup', label: '开声', icon: Wind, roles: ['member', 'captain', 'admin'] },
  { path: '/settings', label: '设置', icon: Settings, roles: ['captain', 'admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const [device, setDevice] = useState<'mobile' | 'pad'>('mobile');

  useEffect(() => { initTheme(); }, []);

  useEffect(() => {
    const check = () => setDevice(window.innerWidth >= 768 ? 'pad' : 'mobile');
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  // Filter nav by role
  const role = user?.role || 'member';
  const navItems = ALL_NAV.filter(n => n.roles.includes(role as any));
  // Mobile shows first 5 allowed + more
  const mobileTabs = navItems.slice(0, 5);

  return (
    <div className="bg-ambient w-screen h-screen overflow-hidden">
      {/* PAD: Floating Narrow Vertical Tab */}
      {device === 'pad' && isLoggedIn && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
          <div className="vtab-float flex flex-col items-center gap-1.5 p-2">
            {/* Logo */}
            <button onClick={() => navigate('/')}
              className="vtab-btn active mb-1 transition-transform hover:scale-110"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Mic2 className="w-[18px] h-[18px]" />
            </button>

            <div className="w-5 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-0.5" />

            {/* Nav - filtered by role */}
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`vtab-btn transition-all hover:scale-110 ${isActive ? 'active' : ''}`}
                  title={item.label}>
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              );
            })}

            <div className="w-5 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-0.5" />

            {/* Logout */}
            <button onClick={handleLogout}
              className="vtab-btn transition-all hover:scale-110"
              title="退出">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className={`h-full overflow-y-auto overflow-x-hidden scroller relative z-10
        ${device === 'pad' ? 'pl-20' : ''}`}>
        {children}
      </main>

      {/* AI Bookmark */}
      {isLoggedIn && <AIBookmark />}

      {/* MOBILE: Bottom Floating Pill */}
      {device === 'mobile' && isLoggedIn && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
          <nav className="pill flex items-center gap-0.5 px-2 py-1.5">
            {mobileTabs.map((item, i) => {
              const Icon = item.icon;
              const isActive = i === 0
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`pill-item transition-transform hover:scale-110 active:scale-95 ${isActive ? 'active' : ''}`}>
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={() => navigate('/settings')}
              className="pill-item transition-transform hover:scale-110 active:scale-95">
              <Settings className="w-[18px] h-[18px]" />
              <span>更多</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
