import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mic, Volume2, User, Trash2, AlertTriangle, Info, Shield, Users, LogOut,
  Palette, Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { THEME_PRESETS, applyTheme, saveTheme, getSavedTheme } from '@/lib/theme';
import type { ThemePreset } from '@/lib/theme';

export default function Settings() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [micStatus, setMicStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [testVolume, setTestVolume] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('amber');
  const [customColor, setCustomColor] = useState('#f59e0b');

  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved.preset);
  }, []);

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'microphone' as any }).then((result: any) => {
        setMicStatus(result.state);
        result.addEventListener('change', () => setMicStatus(result.state));
      }).catch(() => setMicStatus('unknown'));
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('choirai_token');
    fetch('/api/admin/users', { headers: { 'x-auth-token': token || '' } })
      .then(r => r.ok ? r.json() : []).then(setAllUsers).catch(() => {});
    fetch('/api/admin/stats', { headers: { 'x-auth-token': token || '' } })
      .then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, [isAdmin]);

  const handleThemeChange = (preset: ThemePreset, customH?: number) => {
    setCurrentTheme(preset);
    applyTheme(preset, customH);
    saveTheme(preset, customH);
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex);
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / (max - min) + 2;
      else h = (r - g) / (max - min) + 4;
      h *= 60;
    }
    handleThemeChange('custom', Math.round(h));
  };

  const requestMic = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(t => t.stop()); setMicStatus('granted'); }
    catch { setMicStatus('denied'); }
  };

  const testMic = async () => {
    if (isTesting) { setIsTesting(false); setTestVolume(0); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      setIsTesting(true);
      const detect = () => {
        if (!isTesting) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setTestVolume(avg / 255);
        requestAnimationFrame(detect);
      };
      detect();
    } catch { setMicStatus('denied'); }
  };

  const clearAllData = () => {
    if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
      Object.keys(localStorage).filter(k => k.startsWith('choir') || k.startsWith('choirai')).forEach(k => localStorage.removeItem(k));
      alert('已清除所有数据');
      window.location.reload();
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    const token = localStorage.getItem('choirai_token');
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token || '' },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const ROLE_LABELS: Record<string, string> = { admin: '团干', captain: '声部长', member: '部员' };
  const PART_LABELS: Record<string, string> = { soprano: '女高音', alto: '女中音', tenor: '男高音', bass: '男低音' };
  const PART_COLORS: Record<string, string> = { soprano: '#f472b6', alto: '#22d3ee', tenor: '#fbbf24', bass: '#d4a574' };

  return (
    <div className="page relative z-10" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="neu neu-hover flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '12px' }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--text))' }}>设置</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Theme Settings - 凸起卡片 */}
        <div className="neu p-5" style={{ borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'var(--accent-soft)' }}>
              <Palette className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>主题颜色</h3>
          </div>

          {/* Presets - 白色拟物凸起按钮 */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {THEME_PRESETS.map(preset => {
              const isActive = currentTheme === preset.key;
              return (
                <button key={preset.key} onClick={() => handleThemeChange(preset.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'neu-inset' : 'neu neu-hover'}`}
                  style={isActive ? { color: `hsl(${preset.h}, ${preset.s}, ${preset.l})` } : {}}>
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: `hsl(${preset.h}, ${preset.s}, ${preset.l})` }} />
                  <span className="truncate">{preset.label}</span>
                  {isActive && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold" style={{ color: 'hsl(var(--text-secondary))' }}>自定义</label>
            <input type="color" value={customColor} onChange={e => handleCustomColorChange(e.target.value)}
              className="w-8 h-8 rounded-lg border-0 cursor-pointer neu-sm" style={{ padding: '2px' }} />
            <span className="text-xs font-mono font-bold" style={{ color: 'hsl(var(--text-secondary))' }}>{customColor}</span>
          </div>
        </div>

        {/* User Info - 凸起卡片 */}
        <div className="neu p-5" style={{ borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'hsla(210,60%,50%,0.12)' }}>
              <User className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>我的信息</h3>
          </div>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl neu-sm flex items-center justify-center text-lg font-bold"
                  style={{ background: (PART_COLORS[user.part] || '#999') + '25', color: PART_COLORS[user.part] || '#999' }}>
                  {user.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>{user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="neu-inset text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {PART_LABELS[user.part] || user.part}
                    </span>
                    <span className="neu-inset text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: 'var(--accent)' }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={logout} className="w-full neu neu-hover p-3 text-xs font-bold flex items-center justify-center gap-2" style={{ color: 'hsl(0,60%,55%)', borderRadius: '14px' }}>
                <LogOut className="w-3.5 h-3.5" />退出登录
              </button>
            </div>
          ) : <p className="text-sm" style={{ color: 'hsl(var(--text-tertiary))' }}>未登录</p>}
        </div>

        {/* Audio Settings - 凸起卡片 */}
        <div className="neu p-5" style={{ borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'hsla(35,80%,50%,0.12)' }}>
              <Volume2 className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>音频设置</h3>
          </div>

          <div className="neu p-4 mb-4" style={{ borderRadius: '14px' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>麦克风权限</span>
              </div>
              <span className={`neu-inset text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                micStatus === 'granted' ? 'text-green-600' : micStatus === 'denied' ? 'text-red-500' : 'text-[hsl(var(--text-tertiary))]'
              }`}>
                {micStatus === 'granted' ? '已授权' : micStatus === 'denied' ? '被拒绝' : '待授权'}
              </span>
            </div>
            {micStatus === 'denied' && (
              <div className="neu p-3 mb-3 flex items-start gap-2" style={{ borderRadius: '12px' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(0,60%,55%)' }} />
                <p className="text-xs" style={{ color: 'hsl(0,60%,55%)' }}>麦克风权限被拒绝。请在浏览器设置中将麦克风权限改为"允许"。</p>
              </div>
            )}
            <button onClick={requestMic} className="neu neu-hover px-4 py-2 rounded-xl text-xs font-bold" style={{ color: 'hsl(var(--text-secondary))' }}>
              {micStatus === 'granted' ? '重新授权' : '请求授权'}
            </button>
          </div>

          <div className="neu p-4" style={{ borderRadius: '14px' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>麦克风测试</span>
              <button onClick={testMic} className={`neu text-[10px] font-bold px-3 py-1.5 rounded-lg ${isTesting ? 'text-red-500 neu-inset' : 'text-[hsl(var(--text-tertiary))] neu-hover'}`}>
                {isTesting ? '停止' : '开始测试'}
              </button>
            </div>
            <div className="neu-inset p-2 rounded-xl overflow-hidden">
              <div className="flex items-center gap-0.5 h-6">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all duration-75"
                    style={{ height: isTesting ? `${Math.max(20, Math.min(100, testVolume * 100 * (0.3 + Math.random() * 0.7)))}%` : '20%', background: isTesting ? 'var(--accent)' : 'hsl(var(--border))' }} />
                ))}
              </div>
            </div>
            <p className="text-[10px] font-medium mt-2" style={{ color: 'hsl(var(--text-tertiary))' }}>{isTesting ? '对着麦克风说话...' : '点击开始测试检查麦克风'}</p>
          </div>
        </div>

        {/* Data Management - 凸起卡片 */}
        <div className="neu p-5" style={{ borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'hsla(0,60%,50%,0.08)' }}>
              <Trash2 className="w-4 h-4" style={{ color: 'hsl(0,60%,55%)' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>数据管理</h3>
          </div>
          <p className="text-xs font-medium mb-4" style={{ color: 'hsl(var(--text-secondary))' }}>清除所有本地存储的数据。此操作不可恢复。</p>
          <button onClick={clearAllData} className="neu neu-hover px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2" style={{ color: 'hsl(0,60%,55%)' }}>
            <Trash2 className="w-3.5 h-3.5" />清除所有数据
          </button>
        </div>

        {/* Admin: User Management - 凸起卡片 占满2列 */}
        {isAdmin && (
          <div className="neu p-5 lg:col-span-2" style={{ borderRadius: '20px' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'var(--accent-soft)' }}>
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>团干管理</h3>
            </div>

            {/* Stats - 凸起数字卡片 */}
            {stats && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: '总人数', value: stats.totalUsers },
                  { label: '乐谱总数', value: stats.totalScores },
                  { label: '声部数量', value: stats.totalVoiceParts },
                  { label: '排练记录', value: stats.totalRehearsals },
                ].map(item => (
                  <div key={item.label} className="neu p-3 text-center" style={{ borderRadius: '14px' }}>
                    <div className="text-xl font-bold text-accent">{item.value}</div>
                    <div className="text-[9px] font-bold mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Member list */}
            <div className="neu p-4" style={{ borderRadius: '16px' }}>
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--text-tertiary))' }}>
                <Users className="w-3.5 h-3.5" />成员列表
              </h4>
              {allUsers.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'hsl(var(--text-secondary))' }}>暂无成员</p>
              ) : (
                <div className="space-y-2">
                  {allUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between neu p-3" style={{ borderRadius: '12px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg neu-sm flex items-center justify-center text-[10px] font-bold"
                          style={{ background: (PART_COLORS[u.part] || '#999') + '25', color: PART_COLORS[u.part] || '#999' }}>
                          {u.name[0]}
                        </div>
                        <div>
                          <span className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>{u.name}</span>
                          <span className="neu-inset text-[10px] font-bold px-2 py-0.5 rounded-lg ml-2" style={{ color: 'hsl(var(--text-tertiary))' }}>
                            {PART_LABELS[u.part] || u.part}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="neu-inset text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: u.role === 'admin' ? 'var(--accent)' : u.role === 'captain' ? 'hsl(210,70%,60%)' : 'hsl(var(--text-tertiary))' }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          className="neu-inset px-2 py-1 text-[10px] font-bold rounded-lg outline-none" style={{ color: 'hsl(var(--text-tertiary))' }}>
                          <option value="member">部员</option>
                          <option value="captain">声部长</option>
                          <option value="admin">团干</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* About - 凸起卡片 */}
        <div className="neu p-5" style={{ borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neu-sm" style={{ background: 'hsla(150,50%,45%,0.12)' }}>
              <Info className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>关于</h3>
          </div>
          <div className="space-y-2 text-xs font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>
            <p>ChoirAI 合唱智能训练助手</p>
            <p>版本: v2.0 · 新拟态UI</p>
            <p>AI模型: DeepSeek + Kimi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
