import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Music, Mic2, Monitor, Users, CalendarCheck, LogOut, Wind, Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AIBookmark from './AIBookmark';
import { initTheme } from '@/lib/theme';

const MAIN_NAV = [
  { path: '/', label: '首页', icon: Home },
  { path: '/scores', label: '谱子', icon: Music },
  { path: '/practice', label: '练习', icon: Mic2 },
  { path: '/hall', label: '排练', icon: Monitor },
  { path: '/voice-parts', label: '声部', icon: Users },
  { path: '/plans', label: '计划', icon: CalendarCheck },
  { path: '/warmup', label: '开声', icon: Wind },
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
  const role = user?.role || 'member';
  const navItems = MAIN_NAV.filter(n => {
    if (n.path === '/voice-parts') return role === 'captain' || role === 'admin';
    return true;
  });
  const mobileTabs = navItems.slice(0, 5);

  return (
    <div className="bg-ambient w-screen h-screen overflow-hidden">
      {/* PAD: Floating Narrow Vertical Tab */}
      {device === 'pad' && isLoggedIn && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
          <div className="vtab-float flex flex-col items-center gap-1 p-2">
            {/* Logo */}
            <button onClick={() => navigate('/')} className="vtab-btn active mb-1 transition-transform hover:scale-110" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Mic2 className="w-[18px] h-[18px]" />
            </button>
            <div className="w-5 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-0.5" />
            {/* Main Nav */}
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} className={`vtab-btn transition-all hover:scale-110 ${isActive ? 'active' : ''}`} title={item.label}>
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              );
            })}
            <div className="w-5 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-0.5" />
            {/* Settings at bottom */}
            <Link to="/settings" className={`vtab-btn transition-all hover:scale-110 ${location.pathname === '/settings' ? 'active' : ''}`} title="设置">
              <Settings className="w-[18px] h-[18px]" />
            </Link>
            {/* Logout */}
            <button onClick={handleLogout} className="vtab-btn transition-all hover:scale-110" title="退出">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className={`h-full overflow-y-auto overflow-x-hidden scroller relative z-10 ${device === 'pad' ? 'pl-20' : ''}`}>
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
              const isActive = i === 0 ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} className={`pill-item transition-transform hover:scale-110 active:scale-95 ${isActive ? 'active' : ''}`}>
                  <Icon className="w-[18px] h-[18px]" /><span>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={() => navigate('/settings')} className="pill-item transition-transform hover:scale-110 active:scale-95">
              <Settings className="w-[18px] h-[18px]" /><span>更多</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
