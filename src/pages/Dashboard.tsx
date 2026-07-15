import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Music, Mic2, Monitor, Users, Shield, Wind, BookOpen,
  Sparkles, Flame, ArrowRight, Clock, Trophy,
  CalendarDays, BarChart3, ChevronRight, Sun, Moon,
  TrendingUp, Zap, Lock, User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTodayWarmupExercises } from '@/lib/warmup-exercises';
import { getCoachSuggestions, getTodayPlan, loadCoachState, getVoicePartName } from '@/lib/ai-coach';

// ========== LOGIN ==========
function AuthScreen({ onLogin, onRegister }: {
  onLogin: (n: string, p: string) => Promise<void>;
  onRegister: (n: string, p: string, part: string, role: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [part, setPart] = useState('soprano');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('请输入姓名'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    if (mode === 'register' && password.length < 4) { setError('密码至少4位'); return; }
    setLoading(true);
    try {
      if (mode === 'login') await onLogin(name.trim(), password);
      else await onRegister(name.trim(), password, part, role);
    } catch (err: any) { setError(err.message || '失败'); }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 relative z-10">
      <div className="mb-8 text-center">
        {/* Logo with accent fill */}
        <div className="w-[72px] h-[72px] mx-auto mb-5 flex items-center justify-center"
          style={{
            borderRadius: '22px',
            background: 'linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 10%), 0.9), hsla(var(--accent-h), var(--accent-s), var(--accent-l), 1))',
            boxShadow: '6px 6px 14px var(--nd), -6px -6px 14px var(--nl), inset 0 1px 2px rgba(255,255,255,0.3)',
          }}>
          <Mic2 className="w-8 h-8 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
        </div>
        <h1 className="text-3xl font-bold mb-1">ChoirAI</h1>
        <p className="text-sm" style={{ color: 'hsl(var(--text-tertiary))' }}>合唱智能训练助手</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3.5">
        {error && (
          <div className="p-3 rounded-2xl text-sm" style={{ background: 'hsla(0,70%,55%,0.08)', color: 'hsl(0,70%,50%)' }}>
            {error}
          </div>
        )}
        <div className="neu-inset p-1" style={{ borderRadius: '16px' }}>
          <div className="flex items-center px-4">
            <User className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="姓名"
              className="flex-1 bg-transparent text-sm py-3.5 ml-3 focus:outline-none placeholder:text-neutral-400" />
          </div>
        </div>
        <div className="neu-inset p-1" style={{ borderRadius: '16px' }}>
          <div className="flex items-center px-4">
            <Lock className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '密码（至少4位）' : '密码'}
              className="flex-1 bg-transparent text-sm py-3.5 ml-3 focus:outline-none placeholder:text-neutral-400" />
          </div>
        </div>

        {mode === 'register' && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {[
                { k: 'soprano', l: 'S', c: 'hsla(0,70%,58%,0.15)', t: 'hsl(0,65%,50%)' },
                { k: 'alto', l: 'A', c: 'hsla(210,70%,55%,0.15)', t: 'hsl(210,65%,48%)' },
                { k: 'tenor', l: 'T', c: 'hsla(155,60%,48%,0.15)', t: 'hsl(155,55%,42%)' },
                { k: 'bass', l: 'B', c: 'hsla(35,80%,50%,0.15)', t: 'hsl(35,75%,45%)' },
              ].map(p => (
                <button key={p.k} type="button" onClick={() => setPart(p.k)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={part === p.k
                    ? { background: p.c, color: p.t, boxShadow: '2px 2px 6px var(--nd), -2px -2px 6px var(--nl)' }
                    : { background: 'transparent', color: 'hsl(var(--text-tertiary))' }}>
                  {p.l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'member', l: '团员' },
                { k: 'captain', l: '声部长' },
                { k: 'admin', l: '团干' },
              ].map(r => (
                <button key={r.k} type="button" onClick={() => setRole(r.k)}
                  className="py-2 rounded-xl text-center text-xs font-medium transition-all"
                  style={role === r.k
                    ? { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: '2px 2px 6px var(--nd), -2px -2px 6px var(--nl)' }
                    : { background: 'transparent', color: 'hsl(var(--text-tertiary))' }}>
                  {r.l}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Login button: light orange bg + dark text, hover press effect */}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200
                     disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 20%), 0.95), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 10%), 1))',
            color: 'hsl(0 0% 18%)',
            boxShadow: '6px 6px 12px var(--nd), -4px -4px 10px var(--nl), inset 0 1px 1px rgba(255,255,255,0.4)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--neu-down)';
            e.currentTarget.style.transform = 'scale(0.99)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '6px 6px 12px var(--nd), -4px -4px 10px var(--nl), inset 0 1px 1px rgba(255,255,255,0.4)';
            e.currentTarget.style.transform = 'scale(1)';
          }}>
          {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
        </button>

        {/* Toggle mode - register highlighted */}
        <p className="text-center text-xs mt-2" style={{ color: 'hsl(var(--text-tertiary))' }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="ml-1.5 font-bold text-xs px-3 py-1 rounded-full transition-all
                       hover:scale-105 active:scale-95"
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              boxShadow: '2px 2px 5px var(--nd), -2px -2px 5px var(--nl)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = 'var(--neu-down)';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '2px 2px 5px var(--nd), -2px -2px 5px var(--nl)';
              e.currentTarget.style.transform = 'scale(1)';
            }}>
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </form>
    </div>
  );
}

// ========== MEMBER HOME ==========
function MemberHome({ userName, voicePart }: { userName: string; voicePart: string }) {
  const navigate = useNavigate();
  const [coachState] = useState(loadCoachState());
  const [todayWarmup] = useState(() => getTodayWarmupExercises(5));
  const [warmupCompleted, setWarmupCompleted] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recentScores, setRecentScores] = useState<string[]>([]);
  const [rehearsalRecords, setRehearsalRecords] = useState<any[]>([]);
  const token = localStorage.getItem('choirai_token');
  const vpName = getVoicePartName(voicePart);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  useEffect(() => {
    const d = new Date().toISOString().split('T')[0];
    const c = localStorage.getItem(`choirai_warmup_${d}`);
    if (c) setWarmupCompleted(new Set(JSON.parse(c)));
    fetch('/api/scores', { headers: token ? { 'x-auth-token': token } : {} })
      .then(r => r.json()).then(data => {
        setRecentScores((data || []).filter((s: any) => s.title).map((s: any) => s.title).slice(0, 5));
      }).catch(() => {});
    fetch('/api/rehearsal/records', { headers: token ? { 'x-auth-token': token } : {} })
      .then(r => r.ok ? r.json() : []).then(setRehearsalRecords).catch(() => {});
  }, [token]);

  useEffect(() => {
    setSuggestions(getCoachSuggestions(voicePart, recentScores.length > 0, recentScores));
  }, [voicePart, recentScores]);

  const todayPlan = useMemo(() => {
    try { return getTodayPlan(voicePart, 'intermediate', 30); } catch { return null; }
  }, [voicePart]);

  const warmupPct = todayWarmup.morning.length > 0
    ? Math.round(warmupCompleted.size / (todayWarmup.morning.length + todayWarmup.evening.length) * 100) : 0;

  return (
    <div className="page max-w-lg mx-auto relative z-10">
      {/* Welcome */}
      <div className="mb-4">
        <p className="text-xs" style={{ color: 'hsl(var(--text-tertiary))' }}>{greeting}</p>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-xl font-bold">{userName}</h1>
          <span className="glass px-3 py-1 rounded-full text-[10px] font-medium text-accent">{vpName}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {[
          { icon: Wind, label: '开声', route: '/warmup', grad: 'from-orange-400/20 to-amber-400/10' },
          { icon: Monitor, label: '排练', route: '/hall', grad: 'from-blue-400/20 to-sky-400/10' },
          { icon: BookOpen, label: '谱子', route: '/scores', grad: 'from-amber-400/20 to-yellow-400/10' },
          { icon: Mic2, label: '练习', route: '/practice', grad: 'from-emerald-400/20 to-green-400/10' },
        ].map(item => (
          <button key={item.label} onClick={() => navigate(item.route)}
            className="neu flex flex-col items-center gap-1.5 py-3.5 transition-all duration-200
                       hover:scale-105"
            style={{ boxShadow: 'var(--neu-up)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--neu-down)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--neu-up)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center`}>
              <item.icon className="w-4.5 h-4.5" style={{ color: 'hsl(var(--text-secondary))' }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-bold" style={{ color: 'hsl(var(--text))' }}>AI 建议</h2>
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((s, i) => (
              <button key={i} onClick={() => s.action.route && navigate(s.action.route)}
                className="w-full text-left neu-sm p-3.5 active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: s.type === 'warmup' ? 'hsla(25,80%,55%,0.12)' : 'hsla(220,70%,55%,0.12)' }}>
                    {s.type === 'warmup' ? <Wind className="w-4 h-4" style={{ color: 'hsl(25,70%,50%)' }} /> : <Zap className="w-4 h-4" style={{ color: 'hsl(220,65%,50%)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{s.title}</span>
                    <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.message}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warmup */}
      <div className="neu p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5" style={{ color: 'hsl(30,80%,50%)' }} />
            <h2 className="text-xs font-bold">今日开声</h2>
          </div>
          <button onClick={() => navigate('/warmup')} className="text-[10px] font-medium flex items-center gap-0.5 text-accent">
            去练习 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="h-2.5 neu-inset overflow-hidden mb-2" style={{ borderRadius: '10px' }}>
          <div className="h-full transition-all duration-700" style={{ width: `${Math.min(100, warmupPct * 2)}%`, background: 'linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 12%), 1))', borderRadius: '10px' }} />
        </div>
        <div className="flex justify-between text-[10px] mb-3" style={{ color: 'hsl(var(--text-tertiary))' }}>
          <span>已完成 {warmupCompleted.size}/{todayWarmup.morning.length + todayWarmup.evening.length} 条</span>
          <span>{Math.min(100, warmupPct * 2)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="neu-inset p-2.5" style={{ borderRadius: '14px' }}>
            <div className="text-[10px] mb-1 flex items-center gap-1" style={{ color: 'hsl(var(--text-tertiary))' }}>
              <Sun className="w-3 h-3" style={{ color: 'hsl(30,80%,50%)' }} />早间
            </div>
            <div className="text-[10px] truncate" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayWarmup.morning.map(e => e.name).join('、') || '—'}</div>
          </div>
          <div className="neu-inset p-2.5" style={{ borderRadius: '14px' }}>
            <div className="text-[10px] mb-1 flex items-center gap-1" style={{ color: 'hsl(var(--text-tertiary))' }}>
              <Moon className="w-3 h-3" style={{ color: 'hsl(250,50%,55%)' }} />晚间
            </div>
            <div className="text-[10px] truncate" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayWarmup.evening.map(e => e.name).join('、') || '—'}</div>
          </div>
        </div>
      </div>

      {/* Today Plan */}
      {todayPlan && todayPlan.tasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-xs font-bold flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-secondary))' }} />今日计划</h2>
            <span className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayPlan.totalDuration}min</span>
          </div>
          <div className="space-y-2">
            {todayPlan.tasks.slice(0, 3).map((task, i) => (
              <div key={i} className="neu-sm p-3 flex items-center gap-3">
                <div className="w-7 h-7 neu-convex flex items-center justify-center text-[10px] font-bold" style={{ color: task.priority === 'high' ? 'var(--accent)' : 'hsl(var(--text-tertiary))', borderRadius: '10px' }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{task.title}</div>
                  <div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>{task.duration}min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { icon: Flame, label: '连续', value: coachState.streak, c: 'hsl(20,80%,50%)' },
          { icon: Clock, label: '分钟', value: coachState.totalPracticeMinutes, c: 'hsl(210,65%,50%)' },
          { icon: Trophy, label: '排练', value: rehearsalRecords.length, c: 'hsl(40,80%,45%)' },
        ].map(s => (
          <div key={s.label} className="neu p-3.5 text-center">
            <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.c }} />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Scores */}
      {recentScores.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-xs font-bold">最近谱子</h2>
            <Link to="/scores" className="text-[10px] font-medium text-accent">查看</Link>
          </div>
          <div className="space-y-2">
            {recentScores.slice(0, 3).map((title, i) => (
              <Link key={i} to="/scores" className="flex items-center gap-3 p-3 neu-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <Music className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs font-medium truncate flex-1">{title}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pb-6 pt-1">
        <p className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))', opacity: 0.5 }}>ChoirAI · 校合唱团智能训练助手</p>
      </div>
    </div>
  );
}

// ========== CAPTAIN / ADMIN DASHBOARD ==========
function AdminDashboard({ userName, voicePart, isAdmin }: { userName: string; voicePart: string; isAdmin: boolean }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [voicePartList, setVoicePartList] = useState<any[]>([]);
  const [recentScores, setRecentScores] = useState<string[]>([]);
  const [rehearsalRecords, setRehearsalRecords] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const token = localStorage.getItem('choirai_token');
  const vpName = getVoicePartName(voicePart);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  useEffect(() => {
    fetch('/api/scores', { headers: token ? { 'x-auth-token': token } : {} })
      .then(r => r.json()).then(data => setRecentScores((data || []).filter((s: any) => s.title).map((s: any) => s.title))).catch(() => {});
    fetch('/api/rehearsal/records', { headers: token ? { 'x-auth-token': token } : {} })
      .then(r => r.ok ? r.json() : []).then(setRehearsalRecords).catch(() => {});
    fetch('/api/voice-parts').then(r => r.json()).then(setVoicePartList).catch(() => {});
    if (isAdmin) fetch('/api/admin/stats', { headers: token ? { 'x-auth-token': token } : {} })
      .then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, [isAdmin, token]);

  useEffect(() => { setSuggestions(getCoachSuggestions(voicePart, recentScores.length > 0, recentScores)); }, [voicePart, recentScores]);

  const partProgress = [
    { name: '女高音', key: 'soprano', members: 12, attendance: 85, pitch: 78, c: 'hsl(0,65%,55%)' },
    { name: '女低音', key: 'alto', members: 10, attendance: 72, pitch: 80, c: 'hsl(210,65%,50%)' },
    { name: '男高音', key: 'tenor', members: 8, attendance: 90, pitch: 70, c: 'hsl(155,55%,45%)' },
    { name: '男低音', key: 'bass', members: 9, attendance: 65, pitch: 75, c: 'hsl(35,75%,45%)' },
  ];

  return (
    <div className="page relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs" style={{ color: 'hsl(var(--text-tertiary))' }}>{greeting}</p>
          <h1 className="text-xl font-bold mt-0.5">{userName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass px-3 py-1 rounded-full text-[10px] font-medium text-accent">{vpName}</span>
          <span className="glass px-3 py-1 rounded-full text-[10px] font-medium text-accent flex items-center gap-1"><Shield className="w-3 h-3" />{isAdmin ? '团干' : '声部长'}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-2.5 mb-5">
        {[
          { icon: Wind, label: '开声', route: '/warmup' },
          { icon: Monitor, label: '排练', route: '/hall' },
          { icon: Mic2, label: '练习', route: '/practice' },
          { icon: Music, label: '谱子', route: '/scores' },
          { icon: Users, label: '声部', route: '/voice-parts' },
        ].map(item => (
          <button key={item.label} onClick={() => navigate(item.route)} className="neu flex flex-col items-center gap-1.5 py-3.5 active:scale-95 transition-transform">
            <item.icon className="w-5 h-5" style={{ color: 'hsl(var(--text-secondary))' }} />
            <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        {[
          { icon: Users, label: '总人数', value: stats?.totalUsers || voicePartList.reduce((s, v) => s + (v.members?.length || 0), 0), c: 'hsl(210,65%,50%)' },
          { icon: Music, label: '总谱数', value: stats?.totalScores || recentScores.length, c: 'hsl(35,75%,45%)' },
          { icon: Trophy, label: '排练', value: stats?.totalRehearsals || rehearsalRecords.length, c: 'hsl(155,55%,45%)' },
          { icon: TrendingUp, label: '出勤', value: `${Math.round(partProgress.reduce((s, p) => s + p.attendance, 0) / partProgress.length)}%`, c: 'hsl(260,60%,55%)' },
        ].map(s => (
          <div key={s.label} className="neu p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.c }} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Voice Part Progress */}
      <div className="mb-5">
        <h2 className="text-xs font-bold mb-3 flex items-center gap-2 px-0.5"><BarChart3 className="w-3.5 h-3.5 text-accent" />各声部进度</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {partProgress.map(part => (
            <div key={part.key} className="neu p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 neu-convex flex items-center justify-center text-xs font-bold" style={{ color: part.c, borderRadius: '12px' }}>{part.name[0]}</div>
                  <div>
                    <div className="text-xs font-semibold">{part.name}</div>
                    <div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>{part.members}人</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-accent">{Math.round((part.attendance + part.pitch) / 2)}</div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[9px] mb-1" style={{ color: 'hsl(var(--text-tertiary))' }}><span>出勤</span><span>{part.attendance}%</span></div>
                  <div className="h-1.5 neu-inset overflow-hidden" style={{ borderRadius: '6px' }}>
                    <div className="h-full transition-all" style={{ width: `${part.attendance}%`, background: 'linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 10%), 1))', borderRadius: '6px' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1" style={{ color: 'hsl(var(--text-tertiary))' }}><span>音准</span><span>{part.pitch}</span></div>
                  <div className="h-1.5 neu-inset overflow-hidden" style={{ borderRadius: '6px' }}>
                    <div className="h-full transition-all" style={{ width: `${part.pitch}%`, background: 'linear-gradient(90deg, hsl(210,70%,55%), hsl(200,70%,60%))', borderRadius: '6px' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold mb-3 flex items-center gap-2 px-0.5"><Sparkles className="w-3.5 h-3.5 text-accent" />AI 建议</h2>
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((s, i) => (
              <button key={i} onClick={() => s.action.route && navigate(s.action.route)} className="w-full text-left neu-sm p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold">{s.title}</span>
                    <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.message}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="mb-5">
          <h2 className="text-xs font-bold mb-3 flex items-center gap-2 px-0.5"><BarChart3 className="w-3.5 h-3.5 text-accent" />全团数据</h2>
          <div className="neu p-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '注册人数', value: stats.totalUsers },
                { label: '乐谱', value: stats.totalScores },
                { label: '声部', value: stats.totalVoiceParts },
                { label: '排练', value: stats.totalRehearsals },
              ].map(item => (
                <div key={item.label} className="neu-inset py-3 text-center" style={{ borderRadius: '14px' }}>
                  <div className="text-xl font-bold text-accent">{item.value}</div>
                  <div className="text-[9px] mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center pb-6">
        <p className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))', opacity: 0.5 }}>ChoirAI · 校合唱团智能训练助手</p>
      </div>
    </div>
  );
}

// ========== MAIN ==========
export default function Dashboard() {
  const { user, isLoggedIn, isAdmin, isCaptain, login, register, loading } = useAuth();
  const voicePart = user?.part || localStorage.getItem('choirai_voice_part') || 'soprano';

  if (loading) return (
    <div className="flex items-center justify-center h-[100dvh]">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'hsl(var(--text-tertiary))', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  if (!isLoggedIn) return <AuthScreen onLogin={login} onRegister={(n, p, pt, r) => register(n, p, pt, r)} />;

  if (isAdmin || isCaptain) {
    return <AdminDashboard userName={user?.name || ''} voicePart={voicePart} isAdmin={isAdmin} />;
  }
  return <MemberHome userName={user?.name || ''} voicePart={voicePart} />;
}
