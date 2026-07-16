import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Sun, Moon,
  Clock, RefreshCw, Wind, ChevronDown, ChevronUp, Shield, Eye, Music
} from 'lucide-react';
import {
  WARMUP_EXERCISES, WARMUP_SONGS, VOICE_PART_TIPS,
  getTodayWarmupExercises,
} from '@/lib/warmup-exercises';
import { recordPractice } from '@/lib/ai-coach';
import { useAuth } from '@/contexts/AuthContext';

const PART_TABS = [
  { key: 'soprano', label: 'S', color: '#f472b6' },
  { key: 'alto', label: 'A', color: '#22d3ee' },
  { key: 'tenor', label: 'T', color: '#fbbf24' },
  { key: 'bass', label: 'B', color: '#d4a574' },
];

export default function WarmUpRoom() {
  const { isLoggedIn, isAdmin, isCaptain } = useAuth();
  const canCheck = isAdmin || isCaptain;
  const [voicePart, setVoicePart] = useState('soprano');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tod, setTod] = useState<'morning'|'evening'>(() => { const h = new Date().getHours(); return h >= 6 && h < 18 ? 'morning' : 'evening'; });
  const [showAll, setShowAll] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  const todayEx = getTodayWarmupExercises(5);
  const list = tod === 'morning' ? todayEx.morning : todayEx.evening;
  const tips = VOICE_PART_TIPS[voicePart] || VOICE_PART_TIPS.soprano;
  const pct = list.length ? Math.round(completed.size / list.length * 100) : 0;
  const allDone = list.length > 0 && list.every(e => completed.has(e.id));
  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const cats = [...new Set(WARMUP_EXERCISES.map(e => e.category))];

  useEffect(() => {
    const saved = localStorage.getItem('choirai_voice_part');
    if (saved) setVoicePart(saved);
    const d = new Date().toISOString().split('T')[0];
    const c = localStorage.getItem(`choirai_warmup_${d}`);
    if (c) setCompleted(new Set(JSON.parse(c)));
  }, []);

  useEffect(() => {
    let i: ReturnType<typeof setInterval>;
    if (timerOn) i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [timerOn]);

  const toggle = (id: string) => {
    if (!canCheck) return;
    setCompleted(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      localStorage.setItem(`choirai_warmup_${new Date().toISOString().split('T')[0]}`, JSON.stringify([...n]));
      return n;
    });
  };

  const partName = voicePart === 'soprano' ? '女高音' : voicePart === 'alto' ? '女中音' : voicePart === 'tenor' ? '男高音' : '男低音';

  return (
    <div className="page relative z-10" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="neu neu-hover flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '12px' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--text))' }}>开声练习</h1>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
          <span className="text-sm font-mono font-bold" style={{ color: 'hsl(var(--text-tertiary))' }}>{fmt(elapsed)}</span>
          <button onClick={() => { if (timerOn) { setTimerOn(false); recordPractice(Math.ceil(elapsed/60)); } else setTimerOn(true); }}
            className={`neu text-xs font-bold px-3 py-1.5 rounded-lg ${timerOn ? 'text-red-500' : 'text-accent'}`}>
            {timerOn ? '结束' : '计时'}
          </button>
        </div>
      </div>

      {/* Part selector -凸起 pills */}
      <div className="neu p-2 flex gap-2 mb-4" style={{ borderRadius: '16px' }}>
        {PART_TABS.map(p => (
          <button key={p.key} onClick={() => { setVoicePart(p.key); localStorage.setItem('choirai_voice_part', p.key); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${voicePart === p.key ? 'text-white shadow-lg' : 'text-[hsl(var(--text-tertiary))] neu-hover'}`}
            style={voicePart === p.key ? { background: p.color, boxShadow: `0 4px 12px ${p.color}40` } : {}}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Morning/Evening toggle - 凸起 */}
      <div className="neu p-1.5 flex gap-1.5 mb-4" style={{ borderRadius: '16px' }}>
        <button onClick={() => setTod('morning')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${tod === 'morning' ? 'neu-inset text-accent' : 'neu-hover text-[hsl(var(--text-tertiary))]'}`}>
          <Sun className="w-4 h-4" />早间
        </button>
        <button onClick={() => setTod('evening')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${tod === 'evening' ? 'neu-inset text-indigo-500' : 'neu-hover text-[hsl(var(--text-tertiary))]'}`}>
          <Moon className="w-4 h-4" />晚间
        </button>
      </div>

      {/* Date info */}
      <div className="text-xs font-medium mb-4 flex items-center gap-1.5" style={{ color: 'hsl(var(--text-secondary))' }}>
        <RefreshCw className="w-3 h-3" />{todayEx.date} · 每日随机5条 · 勾选计入今日进度
      </div>

      {/* Progress bar */}
      <div className="neu-inset p-1 mb-1" style={{ borderRadius: '10px' }}>
        <div className="h-2 transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), hsla(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 12%), 1))', borderRadius: '8px' }} />
      </div>
      <div className="flex justify-between text-xs font-bold mb-4" style={{ color: 'hsl(var(--text-tertiary))' }}>
        <span>{completed.size}/{list.length} 已完成</span><span>{pct}%</span>
      </div>

      {/* Voice part tip - 凸起卡片 */}
      <div className="neu p-4 mb-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
          <Music className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--accent)' }}>{partName}提示</div>
          <div className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{tips[0]}</div>
        </div>
      </div>

      {/* Permission notice */}
      {!canCheck && isLoggedIn && (
        <div className="neu p-3 mb-4 flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-tertiary))' }}>
          <Eye className="w-3.5 h-3.5 shrink-0" />你是部员，只能查看开声条目，不能勾选
        </div>
      )}
      {canCheck && (
        <div className="neu p-3 mb-4 flex items-center gap-2 text-xs" style={{ color: 'var(--accent)' }}>
          <Shield className="w-3.5 h-3.5 shrink-0" />你是{isAdmin ? '团干' : '声部长'}，可以勾选确认开声条目
        </div>
      )}

      {/* Exercise list - 凸起卡片 */}
      <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text))' }}>
        {tod === 'morning' ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        今日{tod === 'morning' ? '早间' : '晚间'}开声
      </h2>

      <div className="space-y-3 mb-6">
        {list.map((ex, i) => {
          const done = completed.has(ex.id);
          const isExpanded = expandedEx === ex.id;
          return (
            <div key={ex.id} className="neu p-0 overflow-hidden" style={{ borderRadius: '16px' }}>
              {/* Main row - clickable */}
              <button onClick={() => canCheck ? toggle(ex.id) : setExpandedEx(isExpanded ? null : ex.id)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-all neu-hover ${done ? 'opacity-70' : ''}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 neu-sm"
                  style={{ background: done ? 'hsla(150,60%,45%,0.15)' : 'var(--accent-soft)' }}>
                  {done ? <CheckCircle className="w-5 h-5" style={{ color: 'hsl(150,60%,40%)' }} /> :
                   canCheck ? <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{i+1}</span> :
                   <Eye className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${done ? 'line-through' : ''}`} style={{ color: done ? 'hsl(var(--text-tertiary))' : 'hsl(var(--text))' }}>{ex.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{ex.notation.slice(0, 40)}{ex.notation.length > 40 ? '...' : ''}</div>
                </div>
                <div className="neu-inset px-2 py-1 rounded-lg text-[10px] font-bold shrink-0" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {ex.category}
                </div>
              </button>
              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="neu-inset p-3 rounded-xl">
                    <div className="text-xs font-bold mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>完整唱法</div>
                    <div className="text-sm font-mono" style={{ color: 'hsl(var(--text))' }}>{ex.notation}</div>
                    <div className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-tertiary))' }}>{ex.description || '按照音阶顺序平稳演唱，注意气息支撑。'}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="neu p-5 text-center mb-6" style={{ borderRadius: '16px' }}>
          <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'hsl(150,60%,40%)' }} />
          <p className="text-sm font-bold" style={{ color: 'hsl(150,60%,40%)' }}>{tod === 'morning' ? '早间' : '晚间'}开声完成！</p>
        </div>
      )}

      {/* Warmup songs - 凸起卡片 */}
      <h2 className="text-sm font-bold mb-3" style={{ color: 'hsl(var(--text-secondary))' }}>开声曲</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {WARMUP_SONGS.map(s => (
          <button key={s.id} className="neu p-4 text-center neu-hover" style={{ borderRadius: '16px' }}>
            <Wind className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <div className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>{s.name}</div>
            <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>{(s as any).composer || '传统曲目'}</div>
          </button>
        ))}
      </div>

      {/* View all toggle */}
      <button onClick={() => setShowAll(!showAll)} className="w-full neu neu-hover p-3 text-sm font-bold flex items-center justify-center gap-2 mb-4" style={{ color: 'hsl(var(--text-secondary))', borderRadius: '16px' }}>
        {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAll ? '收起' : '查看全部27条'}
      </button>

      {showAll && (
        <div className="mb-6 space-y-4">
          {cats.map(cat => (
            <div key={cat} className="neu p-4" style={{ borderRadius: '16px' }}>
              <div className="text-xs font-bold mb-3" style={{ color: 'hsl(var(--text-tertiary))' }}>{cat}</div>
              <div className="space-y-2">
                {WARMUP_EXERCISES.filter(e => e.category === cat).map(ex => {
                  const done = completed.has(ex.id);
                  return (
                    <button key={ex.id} onClick={() => toggle(ex.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left neu-sm ${canCheck ? 'neu-sm-hover' : ''} ${done ? 'opacity-60' : ''}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? 'border-green-500 bg-green-500' : 'border-[hsl(var(--border))]'}`}>
                        {done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-xs font-medium ${done ? 'line-through text-[hsl(var(--text-tertiary))]' : 'text-[hsl(var(--text-secondary))]'}`}>{ex.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
