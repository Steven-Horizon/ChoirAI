import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic2, Shield, Wind, CalendarCheck, Clock, MapPin, Music,
  Sparkles, Sun, Moon, Zap, Lock, User,
  Plus, X, ChevronLeft, AlertCircle, ChevronRight, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTodayWarmupExercises } from '@/lib/warmup-exercises';
import { getCoachSuggestions, getTodayPlan, getVoicePartName } from '@/lib/ai-coach';

// ========== VOICE PART COLORS ==========
const PART_COLORS: Record<string, { fill: string; bg: string; label: string }> = {
  soprano: { fill: '#FAB2CE', bg: 'rgba(250,178,206,0.2)', label: '女高音' },
  alto:    { fill: '#95EAE0', bg: 'rgba(149,234,224,0.2)', label: '女中音' },
  tenor:   { fill: '#FED57C', bg: 'rgba(254,213,124,0.2)', label: '男高音' },
  bass:    { fill: '#E8A08F', bg: 'rgba(232,160,143,0.2)', label: '男低音' },
};

interface EnsembleInfo { day: number; time: string; location: string; repertoire: string; enabled: boolean; }

function getEnsembleData(): EnsembleInfo[] {
  const saved = localStorage.getItem('choirai_ensemble');
  if (saved) return JSON.parse(saved);
  return [
    { day: 5, time: '14:00-17:00', location: '排练厅A', repertoire: '越人歌、送别', enabled: true },
    { day: 6, time: '', location: '', repertoire: '', enabled: false },
  ];
}

function saveEnsembleData(data: EnsembleInfo[]) {
  localStorage.setItem('choirai_ensemble', JSON.stringify(data));
}

// ========== GET REAL WEEK DATA (7 days with dates) ==========
function getWeekData() {
  const now = new Date();
  const today = now.getDay();
  const mondayBased = today === 0 ? 6 : today - 1;
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayBased);

  const ensembleDays = new Set(getEnsembleData().filter(e => e.enabled).map(e => e.day));

  const allDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const isPastOrToday = i <= mondayBased;
    const isToday = i === mondayBased;
    const isReport = i === 5;
    const isEnsemble = ensembleDays.has(i);

    allDays.push({
      day: dayNames[i],
      date: dateStr,
      isToday,
      isReport,
      isFuture: !isPastOrToday,
      isEnsemble,
      soprano: isPastOrToday && !isEnsemble ? [85, 72, 90, 78, 88, 0, 0][i] : 0,
      alto: isPastOrToday && !isEnsemble ? [78, 88, 82, 91, 75, 0, 0][i] : 0,
      tenor: isPastOrToday && !isEnsemble ? [92, 75, 85, 80, 94, 0, 0][i] : 0,
      bass: isPastOrToday && !isEnsemble ? [80, 91, 76, 86, 82, 0, 0][i] : 0,
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
          {/* SATB - neu凸起底，未选中变灰，选中彩色 */}
          <div className="grid grid-cols-4 gap-2">
            {[{ k: 'soprano', l: 'S', c: 'hsla(330,65%,82%,0.35)', t: '#c2187a' }, { k: 'alto', l: 'A', c: 'hsla(180,60%,82%,0.35)', t: '#0891b2' }, { k: 'tenor', l: 'T', c: 'hsla(45,70%,78%,0.35)', t: '#a16207' }, { k: 'bass', l: 'B', c: 'hsla(15,45%,80%,0.35)', t: '#92400e' }].map(p => (
              <button key={p.k} type="button" onClick={() => setPart(p.k)}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${part === p.k ? '' : 'neu-hover'}`}
                style={part === p.k ? { background: p.c, color: p.t, boxShadow: 'inset 2px 2px 5px var(--nd), inset -2px -2px 5px var(--nl)' } : { color: 'hsl(var(--text-tertiary))', background: 'transparent' }}>
                {p.l}
              </button>
            ))}
          </div>
          {/* Role - same logic */}
          <div className="grid grid-cols-3 gap-2">
            {[{ k: 'member', l: '团员' }, { k: 'captain', l: '声部长' }, { k: 'admin', l: '团干' }].map(r => (
              <button key={r.k} type="button" onClick={() => setRole(r.k)}
                className={`py-2 rounded-xl text-center text-xs font-bold transition-all ${role === r.k ? '' : 'neu-hover'}`}
                style={role === r.k ? { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 2px 2px 5px var(--nd), inset -2px -2px 5px var(--nl)' } : { color: 'hsl(var(--text-tertiary))', background: 'transparent' }}>
                {r.l}
              </button>
            ))}
          </div>
        </>)}
        <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50 neu-hover"
          style={{ background: 'linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 22%), 0.95), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 12%), 1))', color: '#fff', boxShadow: '4px 4px 12px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.08)' }}>
          {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
        </button>
        <p className="text-center text-xs mt-2 font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="ml-1.5 font-bold text-xs px-3 py-1 rounded-full transition-all hover:scale-105 active:scale-95" style={{ color: '#fff', background: 'var(--accent)', boxShadow: '2px 2px 5px var(--accent-glow)' }}>{mode === 'login' ? '注册' : '登录'}</button>
        </p>
      </form>
    </div>
  );
}

// ========== WEEKLY PROGRESS CHART (Large, slot-style) ==========
function WeeklyChart({ onExpand, isAdmin }: { onExpand: () => void; isAdmin?: boolean }) {
  const data = useMemo(() => getWeekData(), []);
  const parts = ['soprano', 'alto', 'tenor', 'bass'] as const;
  const [ensemble, setEnsemble] = useState(getEnsembleData());

  const updateEnsemble = (idx: number, field: keyof EnsembleInfo, value: string | boolean) => {
    const next = ensemble.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    setEnsemble(next);
    saveEnsembleData(next);
  };

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
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm" style={{ background: c.fill, border: '1px solid rgba(0,0,0,0.08)' }} />
            <span className="text-[9px] md:text-[11px] font-semibold" style={{ color: 'hsl(var(--text))' }}>{c.label}</span>
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
        <div className="flex-1 flex items-end gap-0.5 md:gap-2">
          {data.map((d, di) => (
            <div key={di} className="flex-1 flex flex-col items-center gap-1">
              {/* 合拍标注 - 主题色圆角矩形 */}
              {d.isToday && (
                <span className="text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-md mb-1" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>当日排练</span>
              )}
              {/* Date label - 当日用主题深色 */}
              <span className={`text-[8px] md:text-[10px] font-bold ${d.isToday ? '' : 'text-[hsl(var(--text-tertiary))]'}`} style={d.isToday ? { color: 'hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) * 0.25))' } : {}}>{d.date}</span>

              {/* ENSEMBLE CARD for Sat/Sun */}
              {d.isEnsemble ? (
                <EnsembleCard day={di} ensemble={ensemble} isAdmin={isAdmin} onUpdate={updateEnsemble} />
              ) : (
                /* Regular bars */
                <div className="flex items-end gap-[1px] md:gap-[2px] w-full justify-center" style={{ height: '170px' }}>
                {parts.map(p => {
                  const val = (d as any)[p];
                  const isFuture = d.isFuture;
                  return (
                    <div key={p} className="w-1 md:w-4 flex flex-col justify-end rounded-sm md:rounded-lg overflow-hidden"
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
              )}

              {/* Day label */}
              <span className={`text-[8px] md:text-[10px] font-semibold ${d.isToday ? 'text-accent' : 'text-[hsl(var(--text-secondary))]'}`}>{d.day}</span>
              {d.isReport && !d.isEnsemble && <span className="text-[6px] md:text-[7px] font-bold px-1 rounded text-accent bg-[var(--accent-soft)]">汇报</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== ENSEMBLE CARD (Sat/Sun) ==========
function EnsembleCard({ day, ensemble, isAdmin, onUpdate }: { day: number; ensemble: EnsembleInfo[]; isAdmin?: boolean; onUpdate: (idx: number, field: keyof EnsembleInfo, value: string | boolean) => void }) {
  const info = ensemble.find(e => e.day === day);
  if (!info || !info.enabled) {
    return (
      <div className="flex items-end gap-[1px] md:gap-[2px] w-full justify-center" style={{ height: '170px' }}>
        {['soprano', 'alto', 'tenor', 'bass'].map(p => (
          <div key={p} className="w-1 md:w-4 flex flex-col justify-end rounded-sm md:rounded-lg overflow-hidden"
            style={{ height: '100%', background: 'hsla(240,7%,90%,0.3)', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.03)' }} />
        ))}
      </div>
    );
  }

  const idx = ensemble.findIndex(e => e.day === day);

  return (
    <div className="w-full flex flex-col items-center" style={{ height: '170px' }}>
      <div className="neu p-2 w-full h-full flex flex-col items-center justify-center text-center" style={{ borderRadius: '12px' }}>
        <span className="text-[8px] md:text-[9px] font-bold mb-1" style={{ color: 'var(--accent)' }}>合排</span>
        {isAdmin ? (
          <>
            <input value={info.time} onChange={e => onUpdate(idx, 'time', e.target.value)}
              className="w-full text-center text-[7px] md:text-[9px] font-bold bg-transparent focus:outline-none mb-0.5" style={{ color: 'hsl(var(--text))' }} placeholder="时间" />
            <input value={info.location} onChange={e => onUpdate(idx, 'location', e.target.value)}
              className="w-full text-center text-[7px] md:text-[9px] bg-transparent focus:outline-none mb-0.5" style={{ color: 'hsl(var(--text-secondary))' }} placeholder="地点" />
            <input value={info.repertoire} onChange={e => onUpdate(idx, 'repertoire', e.target.value)}
              className="w-full text-center text-[7px] md:text-[9px] bg-transparent focus:outline-none" style={{ color: 'hsl(var(--text-secondary))' }} placeholder="曲目" />
          </>
        ) : (
          <>
            <span className="text-[7px] md:text-[9px] font-bold" style={{ color: 'hsl(var(--text))' }}>{info.time || '待定'}</span>
            <span className="text-[7px] md:text-[9px]" style={{ color: 'hsl(var(--text-secondary))' }}>{info.location || '待定'}</span>
            <span className="text-[7px] md:text-[9px]" style={{ color: 'hsl(var(--text-secondary))' }}>{info.repertoire || '待定'}</span>
          </>
        )}
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
      {/* Left: Warmup - clickable entries */}
      <div className="lg:col-span-2 neu p-4">
        <button onClick={() => navigate('/warmup')} className="w-full flex items-center justify-between mb-3 text-left">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" style={{ color: 'hsl(30,80%,50%)' }} />
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>今日开声</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>{warmup.morning.length + warmup.evening.length}条</span>
            <ArrowRight className="w-3 h-3" style={{ color: 'hsl(var(--text-tertiary))' }} />
          </div>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-tertiary))' }}>白天 ({warmup.morning.length})</div>
            <div className="space-y-1.5">
              {warmup.morning.map((e, i) => (
                <button key={i} onClick={() => navigate('/warmup')} className="w-full text-left neu-sm neu-sm-hover px-2.5 py-1.5 text-[10px] font-medium truncate" style={{ color: 'hsl(var(--text-secondary))' }}>{e.name}</button>
              ))}
              {warmup.morning.length === 0 && <div className="text-[10px]" style={{ color: 'hsl(var(--text-tertiary))' }}>—</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-tertiary))' }}>晚上 ({warmup.evening.length})</div>
            <div className="space-y-1.5">
              {warmup.evening.map((e, i) => (
                <button key={i} onClick={() => navigate('/warmup')} className="w-full text-left neu-sm neu-sm-hover px-2.5 py-1.5 text-[10px] font-medium truncate" style={{ color: 'hsl(var(--text-secondary))' }}>{e.name}</button>
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
function ExpandedProgress({ onClose, isAdmin }: { onClose: () => void; isAdmin?: boolean }) {
  const data = useMemo(() => getWeekData(), []);
  const [ensemble, setEnsemble] = useState(getEnsembleData());
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '周六通选课大课汇报进度', priority: 'high' },
    { id: '2', text: '女高音声部周末加练', priority: 'normal' },
    { id: '3', text: '确认下周排练曲目', priority: 'high' },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const parts = ['soprano', 'alto', 'tenor', 'bass'] as const;

  const addTodo = () => { if (!newTodo.trim()) return; setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), priority: 'normal' }]); setNewTodo(''); };
  const removeTodo = (id: string) => setTodos(todos.filter(t => t.id !== id));
  const updateEnsemble = (idx: number, field: keyof EnsembleInfo, value: string | boolean) => {
    const next = ensemble.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    setEnsemble(next);
    saveEnsembleData(next);
  };

  const satEnsemble = ensemble.find(e => e.day === 5);

  return (
    <div className="page relative z-10 anim-slide-in" style={{ maxWidth: '100%' }}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="neu flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '12px' }}>
          <ChevronLeft className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text))' }}>声部进度详情</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Large Chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chart */}
          <div className="neu p-6" style={{ borderRadius: '20px' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'hsl(var(--text))' }}>本周各声部练习进度</h2>
            <div className="flex items-center gap-4 mb-5">
              {Object.entries(PART_COLORS).map(([k, c]) => (<div key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c.fill, border: '1px solid rgba(0,0,0,0.08)' }} /><span className="text-xs font-bold" style={{ color: 'hsl(var(--text))' }}>{c.label}</span></div>))}
            </div>
            {/* 7-day chart - Mon-Fri bars, Sat ensemble card, Sun empty */}
            <div className="flex items-end gap-2 md:gap-3" style={{ height: '380px' }}>
              {data.map((d, di) => (
                <div key={di} className="flex-1 flex flex-col items-center gap-1.5">
                  {/* Date - today uses dark theme color */}
                  <span className={`text-[10px] md:text-[11px] font-bold ${d.isToday ? '' : 'text-[hsl(var(--text-tertiary))]'}`} style={d.isToday ? { color: 'hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) * 0.25))' } : {}}>{d.date}</span>

                  {/* SATURDAY = Ensemble Card */}
                  {di === 5 && satEnsemble?.enabled ? (
                    <div className="w-full flex flex-col items-center" style={{ height: '310px' }}>
                      <div className="neu p-3 w-full h-full flex flex-col items-center justify-center text-center gap-2" style={{ borderRadius: '14px' }}>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>合排</span>
                        {isAdmin ? (
                          <>
                            <input value={satEnsemble.time} onChange={e => updateEnsemble(0, 'time', e.target.value)} className="w-full text-center text-[10px] font-bold bg-transparent focus:outline-none neu-inset p-1 rounded" style={{ color: 'hsl(var(--text))' }} placeholder="时间" />
                            <input value={satEnsemble.location} onChange={e => updateEnsemble(0, 'location', e.target.value)} className="w-full text-center text-[9px] bg-transparent focus:outline-none neu-inset p-1 rounded" style={{ color: 'hsl(var(--text-secondary))' }} placeholder="地点" />
                            <input value={satEnsemble.repertoire} onChange={e => updateEnsemble(0, 'repertoire', e.target.value)} className="w-full text-center text-[9px] bg-transparent focus:outline-none neu-inset p-1 rounded" style={{ color: 'hsl(var(--text-secondary))' }} placeholder="曲目" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold" style={{ color: 'hsl(var(--text))' }}>{satEnsemble.time || '待定'}</span>
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-secondary))' }}>{satEnsemble.location || '待定'}</span>
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-secondary))' }}>{satEnsemble.repertoire || '待定'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : di === 6 ? (
                    /* SUNDAY = Empty slot */
                    <div className="flex items-end gap-[2px] md:gap-[3px] w-full justify-center" style={{ height: '310px' }}>
                      {parts.map(p => (
                        <div key={p} className="w-4 md:w-6 flex flex-col justify-end rounded-md md:rounded-lg overflow-hidden"
                          style={{ height: '100%', background: 'hsla(240,7%,90%,0.3)', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.03)' }} />
                      ))}
                    </div>
                  ) : (
                    /* Mon-Fri = Regular bars */
                    <div className="flex items-end gap-[2px] md:gap-[3px] w-full justify-center" style={{ height: '310px' }}>
                      {parts.map(p => {
                        const val = (d as any)[p];
                        const isFuture = d.isFuture;
                        return (
                          <div key={p} className="w-4 md:w-6 flex flex-col justify-end rounded-md md:rounded-lg overflow-hidden"
                            style={{
                              height: '100%',
                              background: isFuture ? 'hsla(240,7%,90%,0.3)' : 'hsl(240 7% 90%)',
                              boxShadow: isFuture ? 'inset 1px 1px 2px rgba(0,0,0,0.03)' : 'inset 2px 2px 4px var(--nd), inset -2px -2px 4px var(--nl)',
                            }}>
                            {!isFuture && (
                              <div className="w-full transition-all duration-500" style={{ height: `${val}%`, background: PART_COLORS[p].fill, borderRadius: '3px 3px 0 0' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span className={`text-[10px] md:text-xs font-bold ${d.isToday ? '' : 'text-[hsl(var(--text-tertiary))]'}`} style={d.isToday ? { color: 'hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) * 0.25))' } : {}}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Part cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(PART_COLORS).map(([k, c]) => {
              const avg = Math.round([85,78,92,80][Object.keys(PART_COLORS).indexOf(k)]);
              return (
                <div key={k} className="neu p-4 neu-hover" style={{ borderRadius: '16px', borderTop: `3px solid ${c.fill}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: c.fill, color: '#333' }}>{c.label[0]}</span>
                    <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>{c.label}</span>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text))' }}>{avg}%</div>
                  <div className="text-[10px] font-bold mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>本周平均</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Weekend + Todos */}
        <div className="space-y-4">
          {/* Saturday ensemble info card */}
          <div className="neu p-5" style={{ borderRadius: '20px' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent-soft)' }}>六</span>
              周六合排
            </h3>
            {satEnsemble?.enabled ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-tertiary))' }} /><span className="text-xs font-bold" style={{ color: 'hsl(var(--text))' }}>{satEnsemble.time || '待定'}</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-tertiary))' }} /><span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{satEnsemble.location || '待定'}</span></div>
                <div className="flex items-center gap-2"><Music className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-tertiary))' }} /><span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{satEnsemble.repertoire || '待定'}</span></div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'hsl(var(--text-tertiary))' }}>本周无合排安排</p>
            )}
          </div>

          {/* Todos */}
          <div className="neu p-4 flex flex-col" style={{ borderRadius: '20px', maxHeight: '500px' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}><AlertCircle className="w-4 h-4 text-accent" />重要事项</h3>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-start gap-2 p-3 neu-inset" style={{ borderRadius: '12px' }}>
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: todo.priority === 'high' ? 'hsl(0,65%,55%)' : 'hsl(var(--text-tertiary))' }} />
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
      <div className="neu p-4 mb-4" style={{ borderRadius: '16px' }}>
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

      {/* Weekly Progress Chart - also for members */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>各声部进度</h2>
          <span className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-tertiary))' }}>本周</span>
        </div>
        <WeeklyChart onExpand={() => {}} isAdmin={false} />
      </div>
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

  if (expanded) return <ExpandedProgress onClose={() => setExpanded(false)} isAdmin={isAdmin} />;

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
        <div className="lg:col-span-3 order-last lg:order-first"><WeeklyChart onExpand={() => setExpanded(true)} isAdmin={isAdmin} /></div>
      </div>

      {/* AI Suggestions + Warmup side by side */}
      <AISuggestionsPanel navigate={navigate} voicePart={voicePart} />

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
