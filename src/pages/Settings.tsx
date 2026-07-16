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

  // Load theme
  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved.preset);
  }, []);

  // Check mic permission
  useEffect(() => {
    if ('permissions' in navigator) {
      // @ts-ignore
      navigator.permissions.query({ name: 'microphone' }).then((result: any) => {
        setMicStatus(result.state);
        result.addEventListener('change', () => setMicStatus(result.state));
      }).catch(() => setMicStatus('unknown'));
    }
  }, []);

  // Load admin data
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
    // Convert hex to HSL
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    const _s = max === 0 ? 0 : (max - min) / max; // saturation (unused but computed)
    void _s;
    const _l = max / 2; // lightness (unused but computed)
    void _l;
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
      const keys = Object.keys(localStorage).filter(k => k.startsWith('choir') || k.startsWith('choirai'));
      keys.forEach(k => localStorage.removeItem(k));
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
    if (res.ok) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const ROLE_LABELS: Record<string, string> = { admin: '团干', captain: '声部长', member: '部员' };
  const PART_LABELS: Record<string, string> = { soprano: '女高音', alto: '女低音', tenor: '男高音', bass: '男低音' };

  return (
    <div className="page-container max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold">设置</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Theme Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
              <Palette className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-semibold text-sm">主题颜色</h3>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {THEME_PRESETS.map(preset => {
              const isActive = currentTheme === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => handleThemeChange(preset.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive ? 'ring-2' : ''
                  }`}
                  style={{
                    background: isActive ? `hsla(${preset.h}, ${preset.s}, ${preset.l}, 0.12)` : 'hsla(0,0%,12%,0.5)',
                    color: isActive ? `hsl(${preset.h}, ${preset.s}, ${preset.l})` : 'hsl(0,0%,50%)',
                    '--tw-ring-color': `hsl(${preset.h}, ${preset.s}, ${preset.l})`,
                  } as React.CSSProperties}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ background: `hsl(${preset.h}, ${preset.s}, ${preset.l})` }}
                  />
                  {preset.label}
                  {isActive && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-[hsl(var(--text-secondary))]">自定义</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={e => handleCustomColorChange(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                style={{ background: 'transparent' }}
              />
              <span className="text-xs text-[hsl(var(--text-secondary))] font-mono">{customColor}</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsla(210,60%,50%,0.12)' }}>
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm">我的信息</h3>
          </div>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl neu-convex flex items-center justify-center text-lg font-bold"
                  style={{
                    background: user.part === 'soprano' ? 'hsla(0,60%,45%,0.2)' :
                               user.part === 'alto' ? 'hsla(210,60%,45%,0.2)' :
                               user.part === 'tenor' ? 'hsla(150,55%,40%,0.2)' :
                               'hsla(45,70%,40%,0.2)',
                    color: user.part === 'soprano' ? 'hsla(0,70%,65%)' :
                          user.part === 'alto' ? 'hsla(210,70%,60%)' :
                          user.part === 'tenor' ? 'hsla(150,65%,55%)' :
                          'hsla(45,75%,55%)',
                  }}>
                  {user.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[hsl(var(--text-secondary))]">{PART_LABELS[user.part] || user.part}</span>
                    <span className="text-[10px] text-neutral-700">·</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{
                        background: user.role === 'admin' ? 'var(--accent-soft)' :
                                   user.role === 'captain' ? 'hsla(210,60%,50%,0.12)' :
                                   'hsla(0,0%,20%,0.5)',
                        color: user.role === 'admin' ? 'var(--accent-color)' :
                              user.role === 'captain' ? 'hsl(210,70%,60%)' :
                              'hsl(0,0%,50%)',
                      }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium
                           py-2.5 rounded-xl transition-all"
                style={{ background: 'hsla(0,60%,50%,0.08)', color: 'hsl(0,60%,55%)' }}>
                <LogOut className="w-3.5 h-3.5" />退出登录
              </button>
            </div>
          ) : <p className="text-sm text-[hsl(var(--text-tertiary))]">未登录</p>}
        </div>

        {/* Audio Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsla(35,80%,50%,0.12)' }}>
              <Volume2 className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-semibold text-sm">音频设置</h3>
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[hsl(var(--text-tertiary))]" />
                <span className="text-sm">麦克风权限</span>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-lg ${
                micStatus === 'granted' ? 'bg-green-500/10 text-green-600' :
                micStatus === 'denied' ? 'bg-red-500/10 text-red-500' :
                'neu-concave text-[hsl(var(--text-tertiary))]'
              }`}>
                {micStatus === 'granted' ? '已授权' : micStatus === 'denied' ? '被拒绝' : '待授权'}
              </span>
            </div>
            {micStatus === 'denied' && (
              <div className="flex items-start gap-2 rounded-xl p-3 mb-3" style={{ background: 'hsla(0,60%,50%,0.06)' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(0,60%,55%)' }} />
                <p className="text-xs" style={{ color: 'hsl(0,60%,55%)' }}>麦克风权限被拒绝。请在浏览器设置中将麦克风权限改为"允许"。</p>
              </div>
            )}
            <button onClick={requestMic}
              className="text-xs neu-raised px-4 py-2 rounded-xl text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">
              {micStatus === 'granted' ? '重新授权' : '请求授权'}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">麦克风测试</span>
              <button onClick={testMic}
                className={`text-[10px] px-3 py-1.5 rounded-lg transition-all ${
                  isTesting ? 'bg-red-500/10 text-red-500' : 'neu-raised text-[hsl(var(--text-tertiary))]'
                }`}>
                {isTesting ? '停止' : '开始测试'}
              </button>
            </div>
            <div className="h-8 neu-concave rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 flex items-center px-2 gap-0.5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all duration-75"
                    style={{
                      height: isTesting ? `${Math.min(100, testVolume * 100 * (0.5 + Math.random() * 0.5))}%` : '10%',
                      backgroundColor: isTesting ? 'var(--accent-color)' : 'hsl(0 0% 18%)',
                    }} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-[hsl(var(--text-secondary))] mt-2">{isTesting ? '对着麦克风说话...' : '点击测试检查麦克风'}</p>
          </div>
        </div>

        {/* Data Management */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsla(0,60%,50%,0.08)' }}>
              <Trash2 className="w-4 h-4" style={{ color: 'hsl(0,60%,55%)' }} />
            </div>
            <h3 className="font-semibold text-sm">数据管理</h3>
          </div>
          <p className="text-xs text-[hsl(var(--text-secondary))] mb-4">清除所有本地存储的数据。此操作不可恢复。</p>
          <button onClick={clearAllData}
            className="flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
            style={{ background: 'hsla(0,60%,50%,0.08)', color: 'hsl(0,60%,55%)' }}>
            <Trash2 className="w-3.5 h-3.5" />清除所有数据
          </button>
        </div>

        {/* Admin: User Management */}
        {isAdmin && (
          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--accent-color)' }}>团干管理</h3>
            </div>

            {stats && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: '总人数', value: stats.totalUsers },
                  { label: '乐谱总数', value: stats.totalScores },
                  { label: '声部数量', value: stats.totalVoiceParts },
                  { label: '排练记录', value: stats.totalRehearsals },
                ].map(item => (
                  <div key={item.label} className="neu-concave p-3 rounded-xl text-center">
                    <div className="text-lg font-bold text-accent">{item.value}</div>
                    <div className="text-[9px] text-[hsl(var(--text-secondary))] mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-medium mb-3 flex items-center gap-2 text-[hsl(var(--text-tertiary))]">
                <Users className="w-3.5 h-3.5" />成员列表
              </h4>
              {allUsers.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-secondary))]">暂无成员</p>
              ) : (
                allUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between neu-concave rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: u.part === 'soprano' ? 'hsla(0,60%,45%,0.2)' :
                                     u.part === 'alto' ? 'hsla(210,60%,45%,0.2)' :
                                     u.part === 'tenor' ? 'hsla(150,55%,40%,0.2)' :
                                     'hsla(45,70%,40%,0.2)',
                          color: u.part === 'soprano' ? 'hsla(0,70%,65%)' :
                                u.part === 'alto' ? 'hsla(210,70%,60%)' :
                                u.part === 'tenor' ? 'hsla(150,65%,55%)' :
                                'hsla(45,75%,55%)',
                        }}>
                        {u.name[0]}
                      </div>
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-[10px] text-[hsl(var(--text-secondary))]">{PART_LABELS[u.part] || u.part}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md"
                        style={{
                          background: u.role === 'admin' ? 'var(--accent-soft)' :
                                     u.role === 'captain' ? 'hsla(210,60%,50%,0.12)' :
                                     'hsla(0,0%,20%,0.5)',
                          color: u.role === 'admin' ? 'var(--accent-color)' :
                                u.role === 'captain' ? 'hsl(210,70%,60%)' :
                                'hsl(0,0%,50%)',
                        }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        className="neu-concave px-2 py-1 text-[10px] text-[hsl(var(--text-tertiary))] rounded-lg outline-none">
                        <option value="member">部员</option>
                        <option value="captain">声部长</option>
                        <option value="admin">团干</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* About */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsla(150,50%,45%,0.12)' }}>
              <Info className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-sm">关于</h3>
          </div>
          <div className="space-y-2 text-xs text-[hsl(var(--text-tertiary))]">
            <p>ChoirAI 合唱智能训练助手</p>
            <p>版本: v2.0 · 新拟态UI</p>
            <p>AI模型: DeepSeek + Kimi</p>
          </div>
        </div>
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
