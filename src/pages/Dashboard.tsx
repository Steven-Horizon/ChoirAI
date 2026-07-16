import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic2, Shield, Wind, Monitor, Music, CalendarCheck,
  Sparkles, Sun, Moon, Zap, Lock, User,
  Plus, X, ChevronLeft, AlertCircle, ChevronRight, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTodayWarmupExercises } from '@/lib/warmup-exercises';
import { getCoachSuggestions, getTodayPlan, getVoicePartName } from '@/lib/ai-coach';

// ========== VOICE PART COLORS ==========
const PART_COLORS: Record<string, { fill: string; bg: string; label: string }> = {
  soprano: { fill: '#ec4899', bg: 'rgba(236,72,153,0.12)', label: '女高音' },
  alto:    { fill: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', label: '女中音' },
  tenor:   { fill: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '男高音' },
  bass:    { fill: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: '男低音' },
};

// ========== GET REAL WEEK DATA (7 days with dates) ==========
function getWeekData() {
  const now = new Date();
  const today = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayBased = today === 0 ? 6 : today - 1; // Mon=0, Tue=1, ..., Sat=5, Sun=6
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // Get Monday of this week
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayBased);

  // Generate all 7 days with dates
  const allDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const isPastOrToday = i <= mondayBased;
    const isToday = i === mondayBased;
    const isReport = i === 5; // Saturday = report day

    allDays.push({
      day: dayNames[i],
      date: dateStr,
      isToday,
      isReport,
      isFuture: !isPastOrToday,
      soprano: isPastOrToday ? 10 : 0,
      alto: isPastOrToday ? 10 : 0,
      tenor: isPastOrToday ? 10 : 0,
      bass: isPastOrToday ? 10 : 0,
    });
  }
  return allDays;
}

interface TodoItem { id: string; text: string; priority: 'high' | 'normal'; }

// ========== AUTH SCREEN ==========
function AuthScreen({ onLogin, onRegister }: { onLogin: (n: string, p: string) => Promise<void>; onRegister: (n: string, p: string, part: string, role: string) => Promise<void>; }) {
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
    try { if (mode === 'login') await onLogin(name.trim(), password); else await onRegister(name.trim(), password, part, role); }
    catch (err: any) { setError(err.message || '失败'); }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 relative z-10">
      <div className="mb-8 text-center">
        <div className="w-[72px] h-[72px] mx-auto mb-5 flex items-center justify-center"
          style={{ borderRadius: '22px', background: 'linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 10%), 0.95), hsla(var(--accent-h), var(--accent-s), var(--accent-l), 1))', boxShadow: '6px 6px 14px var(--nd), -6px -6px 14px var(--nl), inset 0 1px 2px rgba(255,255,255,0.3)' }}>
          <Mic2 className="w-8 h-8 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
        </div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text))' }}>ChoirAI</h1>
        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>合唱智能训练助手</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3.5">
        {error && <div className="p-3 rounded-2xl text-sm font-medium" style={{ background: 'hsla(0,70%,55%,0.1)', color: 'hsl(0,65%,45%)' }}>{error}</div>}
        <div className="neu-inset p-1" style={{ borderRadius: '16px' }}>
          <div className="flex items-center px-4"><User className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="姓名" className="flex-1 bg-transparent text-sm py-3.5 ml-3 focus:outline-none placeholder:text-neutral-400" style={{ color: 'hsl(var(--text))' }} /></div>
        </div>
        <div className="neu-inset p-1" style={{ borderRadius: '16px' }}>
          <div className="flex items-center px-4"><Lock className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? '密码（至少4位）' : '密码'} className="flex-1 bg-transparent text-sm py-3.5 ml-3 focus:outline-none placeholder:text-neutral-400" style={{ color: 'hsl(var(--text))' }} /></div>
        </div>
        {mode === 'register' && (<>
          <div className="grid grid-cols-4 gap-2">
            {[{ k: 'soprano', l: 'S', c: 'hsla(330,80%,70%,0.2)', t: '#db2777' }, { k: 'alto', l: 'A', c: 'hsla(200,80%,60%,0.2)', t: '#0ea5e9' }, { k: 'tenor', l: 'T', c: 'hsla(45,90%,60%,0.2)', t: '#ca8a04' }, { k: 'bass', l: 'B', c: 'hsla(260,60%,65%,0.2)', t: '#8b5cf6' }].map(p => (
              <button key={p.k} type="button" onClick={() => setPart(p.k)} className="py-2.5 rounded-xl text-sm font-bold transition-all" style={part === p.k ? { background: p.c, color: p.t, boxShadow: '2px 2px 6px var(--nd), -2px -2px 6px var(--nl)' } : { background: 'transparent', color: 'hsl(var(--text-tertiary))' }}>{p.l}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ k: 'member', l: '团员' }, { k: 'captain', l: '声部长' }, { k: 'admin', l: '团干' }].map(r => (
              <button key={r.k} type="button" onClick={() => setRole(r.k)} className="py-2 rounded-xl text-center text-xs font-bold transition-all" style={role === r.k ? { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: '2px 2px 6px var(--nd), -2px -2px 6px var(--nl)' } : { background: 'transparent', color: 'hsl(var(--text-tertiary))' }}>{r.l}</button>
            ))}
          </div>
        </>)}
        <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50 neu-hover"
          style={{ background: 'linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 22%), 0.95), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 12%), 1))', color: '#fff', boxShadow: '4px 4px 12px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.08)' }}>
          {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
        </button>
        <p className="text-center text-xs mt-2 font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="ml-1.5 font-bold text-xs px-3 py-1 rounded-full transition-all hover:scale-105 active:scale-95" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', boxShadow: '2px 2px 5px var(--nd), -2px -2px 5px var(--nl)' }}>{mode === 'login' ? '注册' : '登录'}</button>
        </p>
      </form>
    </div>
  );
}

// ========== WEEKLY PROGRESS CHART (Large, slot-style) ==========
function WeeklyChart({ onExpand }: { onExpand: () => void }) {
  const data = useMemo(() => getWeekData(), []);
  const parts = ['soprano', 'alto', 'tenor', 'bass'] as const;

  return (
    <div className="neu-hover glass p-5 h-full" onClick={onExpand}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'hsl(var(--text))' }}>各声部进度</h2>
        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'hsl(var(--text-tertiary))' }}>本周 <ChevronRight className="w-3.5 h-3.5" /></span>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-5">
        {Object.entries(PART_COLORS).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm" style={{ background: c.fill }} />
            <span className="text-[9px] md:text-[11px] font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>{c.label}</span>
          </div>
        ))}
      </div>
      {/* Chart - 7 day slot bars with Y-axis */}
      <div className="flex gap-1.5 md:gap-2 h-[220px] md:h-[300px]">
        {/* Y-axis labels */}
        <div className="hidden md:flex flex-col justify-between items-end pr-1 py-4" style={{ height: '240px', marginTop: '20px' }}>
          {[100, 75, 50, 25, 0].map(v => (
            <span key={v} className="text-[9px] font-bold" style={{ color: 'hsl(var(--text-tertiary))' }}>{v}%</span>
          ))}
        </div>
        {/* Bars */}
        <div className="flex-1 flex items-end gap-1 md:gap-2">
          {data.map((d, di) => (
            <div key={di} className="flex-1 flex flex-col items-center gap-1">
              {/* Date label on top */}
              <span className={`text-[8px] md:text-[10px] font-bold ${d.isToday ? 'text-accent' : 'text-[hsl(var(--text-tertiary))]'}`}>{d.date}</span>
              {/* Bars */}
              <div className="flex items-end gap-[1px] md:gap-[2px] w-full justify-center" style={{ height: '170px' }}>
              {parts.map(p => {
                const val = (d as any)[p];
                const isFuture = d.isFuture;
                return (
                  <div key={p} className="w-2.5 md:w-4 flex flex-col justify-end rounded-md md:rounded-lg overflow-hidden"
                    style={{
                      height: '100%',
                      background: isFuture ? 'hsla(240,7%,90%,0.3)' : 'hsl(240 7% 90%)',
                      boxShadow: isFuture ? 'inset 1px 1px 2px rgba(0,0,0,0.03)' : 'inset 2px 2px 4px var(--nd), inset -2px -2px 4px var(--nl)',
                    }}>
                    {!isFuture && (
                      <div className="w-full transition-all duration-500" style={{ height: `${val}%`, background: PART_COLORS[p].fill, borderRadius: '3px 3px 0 0', boxShadow: '0 -1px 2px rgba(255,255,255,0.3)' }} />
                    )}
                  </div>
                );
              })}
            </div>
              {/* Day label */}
              <span className={`text-[8px] md:text-[10px] font-semibold ${d.isToday ? 'text-accent' : 'text-[hsl(var(--text-secondary))]'}`}>{d.day}</span>
              {d.isReport && <span className="text-[6px] md:text-[7px] font-bold px-1 rounded text-accent bg-[var(--accent-soft)]">汇报</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== TODO PANEL ==========
function TodoPanel() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '周六通选课大课汇报进度', priority: 'high' },
    { id: '2', text: '女高音声部周末加练', priority: 'normal' },
    { id: '3', text: '确认下周排练曲目', priority: 'high' },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => { if (!newTodo.trim()) return; setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), priority: 'normal' }]); setNewTodo(''); };
  const removeTodo = (id: string) => setTodos(todos.filter(t => t.id !== id));

  return (
    <div className="glass p-4 h-full flex flex-col">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}><AlertCircle className="w-4 h-4 text-accent" />重要事项</h3>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-start gap-2 p-3 neu-inset" style={{ borderRadius: '12px' }}>
            <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: todo.priority === 'high' ? '#ef4444' : '#a3a3a3' }} />
            <span className="text-xs flex-1 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{todo.text}</span>
            <button onClick={() => removeTodo(todo.id)} className="w-5 h-5 flex items-center justify-center shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }}><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="添加事项..." className="flex-1 bg-transparent text-xs px-3 py-2.5 neu-inset focus:outline-none" style={{ borderRadius: '10px', color: 'hsl(var(--text))' }} />
        <button onClick={addTodo} className="w-9 h-9 flex items-center justify-center neu-sm-hover neu-sm" style={{ borderRadius: '10px', color: 'var(--accent)' }}><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ========== SHORTCUT GRID ==========
function Shortcuts({ navigate }: { navigate: (p: string) => void }) {
  const items = [
    { icon: Wind, label: '开声', path: '/warmup', grad: 'from-pink-300/30 to-rose-200/20' },
    { icon: Music, label: '谱子', path: '/scores', grad: 'from-sky-300/30 to-blue-200/20' },
    { icon: Monitor, label: '排练', path: '/hall', grad: 'from-amber-300/30 to-yellow-200/20' },
    { icon: Mic2, label: '练习', path: '/practice', grad: 'from-emerald-300/30 to-green-200/20' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(item => (
        <button key={item.label} onClick={() => navigate(item.path)}
          className="neu neu-hover flex flex-col items-center gap-2 py-4 transition-all"
          style={{ borderRadius: '16px' }}>
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center`}>
            <item.icon className="w-5 h-5" style={{ color: 'hsl(var(--text-secondary))' }} />
          </div>
          <span className="text-[11px] font-bold" style={{ color: 'hsl(var(--text-secondary))' }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ========== AI SUGGESTIONS + WARMUP PANEL ==========
function AISuggestionsPanel({ navigate, voicePart }: { navigate: any; voicePart: string }) {
  const [warmup, setWarmup] = useState<{morning: any[], evening: any[]}>({ morning: [], evening: [] });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const token = localStorage.getItem('choirai_token');

  useEffect(() => {
    const data = getTodayWarmupExercises(5);
    setWarmup(data);
    fetch('/api/scores', { headers: token ? { 'x-auth-token': token } : {} }).then(r => r.json()).then((data: any) => {
      const t = (data || []).filter((s: any) => s.title).map((s: any) => s.title).slice(0, 5);
      setSuggestions(getCoachSuggestions(voicePart, t.length > 0, t));
    }).catch(() => setSuggestions(getCoachSuggestions(voicePart, false, [])));
  }, [voicePart, token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
      {/* Left: Warmup - all 5 entries */}
      <div className="lg:col-span-2 neu p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" style={{ color: 'hsl(30,80%,50%)' }} />
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>今日开声</span>
          </div>
          <span className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{warmup.morning.length + warmup.evening.length}条</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-tertiary))' }}>白天 ({warmup.morning.length})</div>
            <div className="space-y-1.5">
              {warmup.morning.map((e, i) => (
                <div key={i} className="neu-inset px-2.5 py-1.5 rounded-lg text-[10px] font-medium truncate" style={{ color: 'hsl(var(--text-secondary))' }}>{e.name}</div>
              ))}
              {warmup.morning.length === 0 && <div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>—</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-tertiary))' }}>晚上 ({warmup.evening.length})</div>
            <div className="space-y-1.5">
              {warmup.evening.map((e, i) => (
                <div key={i} className="neu-inset px-2.5 py-1.5 rounded-lg text-[10px] font-medium truncate" style={{ color: 'hsl(var(--text-secondary))' }}>{e.name}</div>
              ))}
              {warmup.evening.length === 0 && <div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>—</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Right: AI Suggestions - direct list */}
      <div className="lg:col-span-3 neu p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>AI 建议</span>
        </div>
        {suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((s, i) => (
              <button key={i} onClick={() => s.action.route && navigate(s.action.route)} className="w-full text-left neu-sm neu-sm-hover p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.type === 'warmup' ? 'hsla(25,80%,55%,0.12)' : 'hsla(220,70%,55%,0.12)' }}>
                    {s.type === 'warmup' ? <Wind className="w-3.5 h-3.5" style={{ color: 'hsl(25,70%,50%)' }} /> : <Zap className="w-3.5 h-3.5" style={{ color: 'hsl(220,65%,50%)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'hsl(var(--text))' }}>{s.title}</div>
                    <div className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.message}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {['建议女高音增加周三练习量，目前进度偏低', '周六汇报需提前准备，建议周四加强排练', '男低音进度稳定，可安排协助其他声部'].map((text, i) => (
              <div key={i} className="neu-sm p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                  <Zap className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== EXPANDED PROGRESS ==========
function ExpandedProgress({ onClose }: { onClose: () => void }) {
  const data = useMemo(() => getWeekData(), []);
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '周六通选课大课汇报进度', priority: 'high' },
    { id: '2', text: '女高音声部周末加练', priority: 'normal' },
    { id: '3', text: '确认下周排练曲目', priority: 'high' },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const parts = ['soprano', 'alto', 'tenor', 'bass'] as const;

  const addTodo = () => { if (!newTodo.trim()) return; setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), priority: 'normal' }]); setNewTodo(''); };
  const removeTodo = (id: string) => setTodos(todos.filter(t => t.id !== id));

  return (
    <div className="page relative z-10 anim-slide-in">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="neu flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '12px' }}>
          <ChevronLeft className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text))' }}>声部进度详情</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Large Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'hsl(var(--text))' }}>本周各声部练习进度</h2>
            <div className="flex items-center gap-4 mb-5">
              {Object.entries(PART_COLORS).map(([k, c]) => (<div key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c.fill }} /><span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>{c.label}</span></div>))}
            </div>
            {/* Large 7-day slot chart */}
            <div className="flex items-end gap-3" style={{ height: '380px' }}>
              {data.map((d, di) => (
                <div key={di} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${d.isToday ? 'text-accent' : 'text-[hsl(var(--text-tertiary))]'}`}>{d.date}</span>
                  <div className="flex items-end gap-[3px] w-full justify-center" style={{ height: '310px' }}>
                    {parts.map(p => {
                      const val = (d as any)[p];
                      const isFuture = d.isFuture;
                      return (
                        <div key={p} className="w-6 flex flex-col justify-end rounded-lg overflow-hidden"
                          style={{
                            height: '100%',
                            background: isFuture ? 'hsla(240,7%,90%,0.3)' : 'hsl(240 7% 90%)',
                            boxShadow: isFuture ? 'inset 1px 1px 2px rgba(0,0,0,0.03)' : 'inset 2px 2px 4px var(--nd), inset -2px -2px 4px var(--nl)',
                          }}>
                          {!isFuture && (
                            <div className="w-full transition-all duration-500" style={{ height: `${val}%`, background: PART_COLORS[p].fill, borderRadius: '4px 4px 0 0' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className={`text-xs font-semibold ${d.isToday ? 'text-accent' : 'text-[hsl(var(--text-secondary))]'}`}>{d.day}</span>
                  {d.isReport && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>汇报日</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Part cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(PART_COLORS).map(([k, c]) => (
              <div key={k} className="glass p-4" style={{ borderTop: `3px solid ${c.fill}` }}>
                <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c.fill }}>{c.label[0]}</span><span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>{c.label}</span></div>
                <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text))' }}>10%</div>
                <div className="text-[10px] font-medium mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>日定量</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Todos */}
        <div className="glass p-4 flex flex-col" style={{ maxHeight: '500px' }}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}><AlertCircle className="w-4 h-4 text-accent" />重要事项</h3>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-start gap-2 p-3 neu-inset" style={{ borderRadius: '12px' }}>
                <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: todo.priority === 'high' ? '#ef4444' : '#a3a3a3' }} />
                <span className="text-xs flex-1 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{todo.text}</span>
                <button onClick={() => removeTodo(todo.id)} className="w-5 h-5 flex items-center justify-center shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="添加事项..." className="flex-1 bg-transparent text-xs px-3 py-2.5 neu-inset focus:outline-none" style={{ borderRadius: '10px', color: 'hsl(var(--text))' }} />
            <button onClick={addTodo} className="w-9 h-9 flex items-center justify-center neu-sm-hover neu-sm" style={{ borderRadius: '10px', color: 'var(--accent)' }}><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== MEMBER HOME ==========
function MemberHome({ userName, voicePart }: { userName: string; voicePart: string }) {
  const navigate = useNavigate();
  const [todayWarmup] = useState(() => getTodayWarmupExercises(5));
  const [warmupCompleted, setWarmupCompleted] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const token = localStorage.getItem('choirai_token');
  const vpName = getVoicePartName(voicePart);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  useEffect(() => {
    const d = new Date().toISOString().split('T')[0];
    const c = localStorage.getItem(`choirai_warmup_${d}`);
    if (c) setWarmupCompleted(new Set(JSON.parse(c)));
    fetch('/api/scores', { headers: token ? { 'x-auth-token': token } : {} }).then(r => r.json()).then(data => {
      const titles = (data || []).filter((s: any) => s.title).map((s: any) => s.title).slice(0, 5);
      setSuggestions(getCoachSuggestions(voicePart, titles.length > 0, titles));
    }).catch(() => {});
  }, [token, voicePart]);

  const todayPlan = useMemo(() => { try { return getTodayPlan(voicePart, 'intermediate', 30); } catch { return null; } }, [voicePart]);
  const warmupPct = todayWarmup.morning.length > 0 ? Math.round(warmupCompleted.size / (todayWarmup.morning.length + todayWarmup.evening.length) * 100) : 0;

  return (
    <div className="page max-w-lg mx-auto relative z-10">
      <div className="mb-4">
        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{greeting}</p>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text))' }}>{userName}</h1>
          <span className="neu px-3 py-1 rounded-full text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{vpName}</span>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-accent" /><h2 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>AI 建议</h2></div>
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((s, i) => (
              <button key={i} onClick={() => s.action.route && navigate(s.action.route)} className="w-full text-left neu-sm neu-sm-hover p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.type === 'warmup' ? 'hsla(25,80%,55%,0.12)' : 'hsla(220,70%,55%,0.12)' }}>
                    {s.type === 'warmup' ? <Wind className="w-4 h-4" style={{ color: 'hsl(25,70%,50%)' }} /> : <Zap className="w-4 h-4" style={{ color: 'hsl(220,65%,50%)' }} />}
                  </div>
                  <div className="flex-1 min-w-0"><span className="text-xs font-bold" style={{ color: 'hsl(var(--text))' }}>{s.title}</span><p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.message}</p></div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warmup */}
      <div className="glass p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Sun className="w-3.5 h-3.5" style={{ color: 'hsl(30,80%,50%)' }} /><h2 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>今日开声</h2></div>
          <button onClick={() => navigate('/warmup')} className="text-[10px] font-bold flex items-center gap-0.5 text-accent">去练习 <ArrowRight className="w-3 h-3" /></button>
        </div>
        <div className="h-2.5 neu-inset overflow-hidden mb-2" style={{ borderRadius: '10px' }}>
          <div className="h-full transition-all duration-700" style={{ width: `${Math.min(100, warmupPct * 2)}%`, background: 'linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 12%), 1))', borderRadius: '10px' }} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="neu-inset p-2.5" style={{ borderRadius: '14px' }}>
            <div className="text-[10px] mb-1 flex items-center gap-1 font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}><Sun className="w-3 h-3" style={{ color: 'hsl(30,80%,50%)' }} />早间</div>
            <div className="text-[10px] truncate" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayWarmup.morning.map(e => e.name).join('、') || '—'}</div>
          </div>
          <div className="neu-inset p-2.5" style={{ borderRadius: '14px' }}>
            <div className="text-[10px] mb-1 flex items-center gap-1 font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}><Moon className="w-3 h-3" style={{ color: 'hsl(250,50%,55%)' }} />晚间</div>
            <div className="text-[10px] truncate" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayWarmup.evening.map(e => e.name).join('、') || '—'}</div>
          </div>
        </div>
      </div>

      {todayPlan && todayPlan.tasks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}><CalendarCheck className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-secondary))' }} />今日计划</h2><span className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{todayPlan.totalDuration}min</span></div>
          <div className="space-y-2">
            {todayPlan.tasks.slice(0, 3).map((task, i) => (
              <div key={i} className="neu-sm p-3 flex items-center gap-3">
                <div className="w-7 h-7 neu-convex flex items-center justify-center text-[10px] font-bold" style={{ color: task.priority === 'high' ? 'var(--accent)' : 'hsl(var(--text-tertiary))', borderRadius: '10px' }}>{i + 1}</div>
                <div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--text))' }}>{task.title}</div><div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>{task.duration}min</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

// ========== ADMIN DASHBOARD ==========
function AdminDashboard({ userName, voicePart, isAdmin }: { userName: string; voicePart: string; isAdmin: boolean }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const token = localStorage.getItem('choirai_token');
  const vpName = getVoicePartName(voicePart);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  useEffect(() => {
    if (isAdmin) fetch('/api/admin/stats', { headers: token ? { 'x-auth-token': token } : {} }).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, [isAdmin, token]);

  if (expanded) return <ExpandedProgress onClose={() => setExpanded(false)} />;

  return (
    <div className="page relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{greeting}</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: 'hsl(var(--text))' }}>{userName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="neu px-3 py-1 rounded-full text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{vpName}</span>
          <span className="neu px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--accent)' }}><Shield className="w-3 h-3" />{isAdmin ? '团干' : '声部长'}</span>
        </div>
      </div>

      {/* Main: Todos on top on mobile, Chart left on desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 mb-5">
        <div className="lg:col-span-1 order-first lg:order-last" style={{ minHeight: '300px' }}><TodoPanel /></div>
        <div className="lg:col-span-3 order-last lg:order-first"><WeeklyChart onExpand={() => setExpanded(true)} /></div>
      </div>

      {/* AI Suggestions + Warmup side by side */}
      <AISuggestionsPanel navigate={navigate} voicePart={voicePart} />

      {/* Shortcuts */}
      <div className="mb-5"><Shortcuts navigate={navigate} /></div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="mb-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}><Zap className="w-3.5 h-3.5 text-accent" />全团数据</h2>
          <div className="neu p-5">
            <div className="grid grid-cols-4 gap-3">
              {[{ label: '注册人数', value: stats.totalUsers }, { label: '乐谱', value: stats.totalScores }, { label: '声部', value: stats.totalVoiceParts }, { label: '排练', value: stats.totalRehearsals }].map(item => (
                <div key={item.label} className="neu-inset py-3 text-center" style={{ borderRadius: '14px' }}><div className="text-xl font-bold text-accent">{item.value}</div><div className="text-[9px] mt-1 font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{item.label}</div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

// ========== MAIN ==========
export default function Dashboard() {
  const { user, isLoggedIn, isAdmin, isCaptain, login, register, loading } = useAuth();
  const voicePart = user?.part || localStorage.getItem('choirai_voice_part') || 'soprano';

  if (loading) return <div className="flex items-center justify-center h-[100dvh]"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'hsl(var(--text-tertiary))', borderTopColor: 'var(--accent)' }} /></div>;
  if (!isLoggedIn) return <AuthScreen onLogin={login} onRegister={(n, p, pt, r) => register(n, p, pt, r)} />;
  if (isAdmin || isCaptain) return <AdminDashboard userName={user?.name || ''} voicePart={voicePart} isAdmin={isAdmin} />;
  return <MemberHome userName={user?.name || ''} voicePart={voicePart} />;
}
