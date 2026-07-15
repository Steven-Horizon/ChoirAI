import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Target, Trash2, CheckCircle, Clock,
  Loader2, ChevronRight, Play, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/config';

interface Exercise {
  id: string;
  name: string;
  type: string;
  description: string;
  duration: number;
  dayIndex: number;
  completed?: boolean;
}

interface Plan {
  id: string;
  userId: string;
  userName: string;
  title: string;
  type: 'personal' | 'voicePart';
  targetPart: string;
  exercises: Exercise[];
  daysTotal: number;
  createdAt: string;
  todayCompleted?: number;
  todayTotal?: number;
  currentDay?: number;
}

const TYPE_NAMES: Record<string, string> = {
  ear_training: '听力训练', pitch: '音准练习', rhythm: '节奏练习',
  breath: '气息控制', voice: '发声技巧', sight: '视唱练耳', scale: '音阶练习'
};

function getToken() { return localStorage.getItem('choirai_token') || ''; }

export default function TrainingPlans() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [todayExercises, setTodayExercises] = useState<Exercise[]>([]);
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { if (isLoggedIn) fetchPlans(); else setLoading(false); }, [isLoggedIn]);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plans`, { headers: { 'x-auth-token': getToken() } });
      if (res.ok) { const data = await res.json(); setPlans(data); }
    } catch {}
    setLoading(false);
  };

  const openPlan = async (plan: Plan) => {
    setDetailLoading(true);
    setSelectedPlan(plan);
    try {
      const res = await fetch(`${API_BASE}/api/plans/${plan.id}`, { headers: { 'x-auth-token': getToken() } });
      if (res.ok) {
        const data = await res.json();
        setCurrentDay(data.currentDay || 0);
        setTodayExercises(data.todayExercises || []);
        setTodayCompleted(data.todayCompleted || []);
      }
    } catch {}
    setDetailLoading(false);
  };

  const goToPractice = (exercise: Exercise) => {
    // Store the current plan and exercise so we can return after practice
    localStorage.setItem('choirai_current_plan', selectedPlan?.id || '');
    localStorage.setItem('choirai_current_exercise', exercise.id);
    // Navigate to practice room
    navigate('/practice');
  };

  // Custom exercise descriptions storage (keyed by exercise id)
  const getCustomDesc = (exId: string): string => {
    try {
      const data = JSON.parse(localStorage.getItem('choirai_custom_exercises') || '{}');
      return data[exId] || '';
    } catch { return ''; }
  };

  const saveCustomDesc = (exId: string, desc: string) => {
    try {
      const data = JSON.parse(localStorage.getItem('choirai_custom_exercises') || '{}');
      data[exId] = desc;
      localStorage.setItem('choirai_custom_exercises', JSON.stringify(data));
    } catch {}
  };

  const completeCustomExercise = async (planId: string, ex: Exercise) => {
    const existing = getCustomDesc(ex.id);
    const desc = prompt(`请描述你完成的练习内容：`, existing || ex.description || '');
    if (desc === null) return; // User cancelled
    const trimmed = desc.trim();
    if (!trimmed) {
      alert('请填写练习内容才能标记完成');
      return;
    }
    saveCustomDesc(ex.id, trimmed);
    // Then mark as completed
    try {
      const res = await fetch(`${API_BASE}/api/plans/${planId}/complete/${ex.id}`, {
        method: 'POST',
        headers: { 'x-auth-token': getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDescription: trimmed })
      });
      if (res.ok) {
        const data = await res.json();
        setTodayCompleted(data.completed || []);
        fetchPlans();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '完成失败');
      }
    } catch {}
  };

  const deletePlan = async (id: string) => {
    if (!confirm('确定删除此计划？')) return;
    try {
      const res = await fetch(`${API_BASE}/api/plans/${id}`, { method: 'DELETE', headers: { 'x-auth-token': getToken() } });
      if (res.ok) { setPlans(prev => prev.filter(p => p.id !== id)); setSelectedPlan(null); }
    } catch {}
  };

  const pct = todayExercises.length > 0
    ? Math.round(todayExercises.filter(e => todayCompleted.includes(e.id)).length / todayExercises.length * 100)
    : 0;

  if (!isLoggedIn) {
    return (
      <div className="p-4 md:p-8 w-full text-center">
        <Target className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
        <p className="text-[hsl(var(--text-tertiary))] mb-4">请先登录查看训练计划</p>
        <Link to="/" className="text-amber-600 hover:text-amber-300 text-sm">去登录</Link>
      </div>
    );
  }

  // Plan detail view
  if (selectedPlan) {
    return (
      <div className="p-4 md:p-8 w-full">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedPlan(null)} className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text))]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{selectedPlan.title}</h2>
            <p className="text-xs text-[hsl(var(--text-tertiary))]">
              第{currentDay + 1}天 / 共{selectedPlan.daysTotal}天 ·
              <span className={selectedPlan.type === 'personal' ? 'text-amber-600' : 'text-blue-600'}>
                {selectedPlan.type === 'personal' ? ' 个人计划' : ' 声部计划'}
              </span>
            </p>
          </div>
          <button onClick={() => deletePlan(selectedPlan.id)} className="text-[hsl(var(--text-secondary))] hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--text-tertiary))]" /></div>
        ) : (
          <>
            {/* Overall progress */}
            <div className="bg-transparent rounded-xl border border-[hsl(var(--border))] p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[hsl(var(--text-tertiary))]">今日进度</span>
                <span className="text-sm font-medium">{pct}%</span>
              </div>
              <div className="h-2.5 bg-[hsl(var(--bg-deep))] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-[hsl(var(--text-tertiary))]">
                <span>{todayExercises.filter(e => todayCompleted.includes(e.id)).length}/{todayExercises.length} 已完成</span>
                <span>第{currentDay + 1}天</span>
              </div>
            </div>

            {/* Today's exercises */}
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              今日任务（第{currentDay + 1}天）
            </h3>

            {todayExercises.length === 0 ? (
              <div className="text-center py-10 text-[hsl(var(--text-tertiary))] text-sm">今天没有安排任务</div>
            ) : (
              <div className="space-y-3 mb-8">
                {todayExercises.map((ex, i) => {
                  const done = todayCompleted.includes(ex.id);
                  return (
                    <div key={ex.id} className={`bg-transparent rounded-xl border p-4 transition-all ${done ? 'border-green-500/30 bg-green-500/5' : 'border-[hsl(var(--border))]'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-green-500/20' : 'bg-[hsl(var(--bg-deep))]'}`}>
                          {done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <span className="text-sm text-[hsl(var(--text-tertiary))]">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${done ? 'text-green-600 line-through' : 'text-[hsl(var(--text))]'}`}>{ex.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-tertiary))]">
                              {TYPE_NAMES[ex.type] || ex.type}
                            </span>
                          </div>
                          <p className="text-xs text-[hsl(var(--text-tertiary))] mb-2">{ex.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {!done ? (
                              <>
                                <button onClick={() => goToPractice(ex)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-amber-400">
                                  <Play className="w-3 h-3" />练习室练习
                                </button>
                                <button onClick={() => completeCustomExercise(selectedPlan.id, ex)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-tertiary))] rounded-lg text-xs hover:bg-[hsl(var(--bg))]">
                                  <CheckCircle className="w-3 h-3" />自定义练习
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />已完成
                                {getCustomDesc(ex.id) && (
                                  <span className="text-green-600/60 ml-1">({getCustomDesc(ex.id)})</span>
                                )}
                              </span>
                            )}
                            <span className="text-xs text-[hsl(var(--text-secondary))] flex items-center gap-1 ml-auto">
                              <Clock className="w-3 h-3" />{ex.duration}min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* All exercises overview */}
            <h3 className="text-sm font-semibold mb-3 text-[hsl(var(--text-tertiary))]">全部练习条目</h3>
            <div className="space-y-1">
              {selectedPlan.exercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg text-xs">
                  <span className="text-[hsl(var(--text-secondary))] w-5">{i + 1}</span>
                  <span className="text-[hsl(var(--text-tertiary))] flex-1">{ex.name}</span>
                  <span className="text-[hsl(var(--text-secondary))]">第{ex.dayIndex + 1}天</span>
                  <span className="text-[hsl(var(--text-secondary))]">{ex.duration}min</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Plans list view
  return (
    <div className="p-4 md:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text))]"><ArrowLeft className="w-5 h-5" /></Link>
          <h2 className="text-2xl font-bold">训练计划</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--text-tertiary))]" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <p className="text-[hsl(var(--text-tertiary))] mb-2">还没有训练计划</p>
          <p className="text-xs text-[hsl(var(--text-secondary))] mb-4">和AI助手聊天，让它帮你制定计划</p>
          <Link to="/ai-agent" className="text-amber-600 hover:text-amber-300 text-sm">去AI助手</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const progress = plan.todayTotal && plan.todayTotal > 0
              ? Math.round((plan.todayCompleted || 0) / plan.todayTotal * 100)
              : 0;
            return (
              <button key={plan.id} onClick={() => openPlan(plan)}
                className="w-full text-left bg-transparent rounded-xl border border-[hsl(var(--border))] p-4 hover:border-[hsl(var(--border))] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{plan.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${plan.type === 'personal' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {plan.type === 'personal' ? '个人' : '声部'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--text-secondary))]" />
                </div>
                <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-tertiary))] mb-2">
                  <span>第{plan.currentDay}天 / 共{plan.daysTotal}天</span>
                  <span>{plan.exercises.length}项练习</span>
                </div>
                <div className="h-1.5 bg-[hsl(var(--bg-deep))] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-[hsl(var(--text-secondary))]">
                  <span>今日 {plan.todayCompleted || 0}/{plan.todayTotal || 0}</span>
                  <span>{progress}%</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
