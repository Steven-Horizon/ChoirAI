import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Sun, Moon,
  Clock, RefreshCw, Wind, ChevronDown, ChevronUp, Shield, Eye
} from 'lucide-react';
import {
  WARMUP_EXERCISES, WARMUP_SONGS, VOICE_PART_TIPS,
  getTodayWarmupExercises,
} from '@/lib/warmup-exercises';
import { recordPractice } from '@/lib/ai-coach';
import { useAuth } from '@/contexts/AuthContext';

export default function WarmUpRoom() {
  const { isLoggedIn, isAdmin, isCaptain } = useAuth();
  const canCheck = isAdmin || isCaptain; // 只有团干和声部长能勾选
  const [voicePart, setVoicePart] = useState('soprano');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tod, setTod] = useState<'morning'|'evening'>(() => { const h = new Date().getHours(); return h >= 6 && h < 18 ? 'morning' : 'evening'; });
  const [showAll, setShowAll] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerOn, setTimerOn] = useState(false);

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
    if (!canCheck) return; // 部员不能勾选
    setCompleted(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      localStorage.setItem(`choirai_warmup_${new Date().toISOString().split('T')[0]}`, JSON.stringify([...n]));
      return n;
    });
  };

  return (
    <div className="text-[hsl(var(--text))] page">
      <div className="sticky top-0 z-50 bg-transparent backdrop-blur-[20px] border-b border-[hsl(var(--border))]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 hover:bg-[hsl(var(--bg-deep))] rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="font-semibold">开声练习</h1>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[hsl(var(--text-tertiary))]" />
            <span className="text-sm text-[hsl(var(--text-tertiary))] font-mono">{fmt(elapsed)}</span>
            <button onClick={() => { if (timerOn) { setTimerOn(false); recordPractice(Math.ceil(elapsed/60)); } else setTimerOn(true); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${timerOn ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)]' : 'bg-[var(--accent)] text-white'}`}>
              {timerOn ? '结束' : '计时'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* 声部 */}
        <div className="flex gap-2 mb-3">
          {['soprano','alto','tenor','bass'].map(p => (
            <button key={p} onClick={() => { setVoicePart(p); localStorage.setItem('choirai_voice_part', p); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${voicePart === p ? 'bg-[var(--accent)] text-white' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-tertiary))]'}`}>
              {p === 'soprano' ? 'S' : p === 'alto' ? 'A' : p === 'tenor' ? 'T' : 'B'}
            </button>
          ))}
        </div>

        {/* 早/晚 */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTod('morning')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border ${tod === 'morning' ? 'bg-[hsla(30,95%,53%,0.1)] border-[hsla(30,95%,53%,0.25)] text-[hsl(30,80%,45%)]' : 'bg-transparent border-[hsl(var(--border))] text-[hsl(var(--text-tertiary))]'}`}>
            <Sun className="w-4 h-4" />早间
          </button>
          <button onClick={() => setTod('evening')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border ${tod === 'evening' ? 'bg-[hsla(240,60%,55%,0.1)] border-[hsla(240,60%,55%,0.25)] text-[hsl(240,50%,50%)]' : 'bg-transparent border-[hsl(var(--border))] text-[hsl(var(--text-tertiary))]'}`}>
            <Moon className="w-4 h-4" />晚间
          </button>
        </div>

        <div className="text-xs text-[hsl(var(--text-secondary))] mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />{todayEx.date} · 每日随机5条 · 勾选计入今日进度
        </div>

        <div className="h-2 bg-[hsl(var(--bg-deep))] rounded-full overflow-hidden mb-1">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-[hsl(var(--text-tertiary))] mb-4">
          <span>{completed.size}/{list.length} 已完成</span><span>{pct}%</span>
        </div>

        <div className="bg-blue-500/5 rounded-lg p-3 mb-4 border border-blue-500/10 text-xs text-blue-600">
          {voicePart === 'soprano' ? '女高音' : voicePart === 'alto' ? '女低音' : voicePart === 'tenor' ? '男高音' : '男低音'}提示：{tips[0]}
        </div>

        {/* 权限提示 */}
        {!canCheck && isLoggedIn && (
          <div className="mb-3 p-2.5 bg-[hsl(var(--bg-deep))] rounded-lg border border-[hsl(var(--border))]/50 flex items-center gap-2 text-xs text-[hsl(var(--text-tertiary))]">
            <Eye className="w-3.5 h-3.5" />你是部员，只能查看开声条目
          </div>
        )}
        {canCheck && (
          <div className="mb-3 p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-center gap-2 text-xs text-amber-600">
            <Shield className="w-3.5 h-3.5" />你是{isAdmin ? '团干' : '声部长'}，可以勾选确认开声条目
          </div>
        )}

        {/* 今日5条 */}
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          {tod === 'morning' ? <Sun className="w-4 h-4 text-orange-600" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          今日{tod === 'morning' ? '早间' : '晚间'}开声
        </h2>

        <div className="space-y-2 mb-6">
          {list.map((ex, i) => {
            const done = completed.has(ex.id);
            return (
              <button key={ex.id} onClick={() => toggle(ex.id)} disabled={!canCheck}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  done ? 'bg-green-500/5 border-green-500/20' : 
                  canCheck ? 'bg-transparent border-[hsl(var(--border))] hover:border-[hsl(var(--border))]' : 'bg-transparent border-[hsl(var(--border))]/50'
                } ${!canCheck ? 'cursor-default' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-green-500/20' : 'bg-[hsl(var(--bg-deep))]'}`}>
                  {done ? <CheckCircle className="w-4 h-4 text-green-600" /> : 
                   canCheck ? <span className="text-xs text-[hsl(var(--text-tertiary))]">{i+1}</span> : <Eye className="w-3.5 h-3.5 text-[hsl(var(--text-secondary))]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? 'text-green-600 line-through' : 'text-[hsl(var(--text))]'}`}>{ex.name}</div>
                  <div className="text-xs text-[hsl(var(--text-tertiary))] font-mono">{ex.notation}</div>
                  <div className="text-[10px] text-[hsl(var(--text-secondary))]">{ex.category}</div>
                </div>
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="text-center py-4 mb-6 bg-green-500/5 rounded-xl border border-green-500/20">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-green-600 font-medium">{tod === 'morning' ? '早间' : '晚间'}开声完成！</p>
          </div>
        )}

        {/* 开声曲 */}
        <h2 className="text-sm font-semibold mb-2 text-[hsl(var(--text-secondary))]">开声曲</h2>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {WARMUP_SONGS.map(s => (
            <div key={s.id} className="bg-transparent rounded-xl p-3 border border-[hsl(var(--border))] text-center">
              <Wind className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-sm font-medium">{s.name}</div>
            </div>
          ))}
        </div>

        {/* 全部 */}
        <button onClick={() => setShowAll(!showAll)}
          className="w-full py-2.5 rounded-xl bg-transparent border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-tertiary))] flex items-center justify-center gap-2 mb-4 hover:text-[hsl(var(--text))]">
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAll ? '收起' : '查看全部27条'}
        </button>

        {showAll && (
          <div className="mb-6 space-y-4">
            {cats.map(cat => (
              <div key={cat}>
                <div className="text-xs text-[hsl(var(--text-tertiary))] mb-1.5 font-medium">{cat}</div>
                <div className="space-y-1">
                  {WARMUP_EXERCISES.filter(e => e.category === cat).map(ex => {
                    const done = completed.has(ex.id);
                    return (
                      <button key={ex.id} onClick={() => toggle(ex.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${done ? 'text-green-600' : 'text-[hsl(var(--text-tertiary))]'}`}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${done ? 'bg-green-500 border-green-500' : 'border-[hsl(var(--border))]'}`}>
                          {done && <CheckCircle className="w-3 h-3 text-[hsl(var(--text))]" />}
                        </div>
                        <span className={`text-xs ${done ? 'line-through' : ''}`}>{ex.name} · {ex.notation.slice(0, 25)}{ex.notation.length > 25 ? '...' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
