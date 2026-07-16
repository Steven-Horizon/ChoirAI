import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play, Pause, Square, SkipBack, Mic, MicOff,
  Volume2, VolumeX, ArrowLeft, AlertCircle,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { useMultiTrackPlayer } from '@/hooks/useMultiTrackPlayer';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import type { Score, VoicePart } from '@/types';
import { API_BASE } from '@/config';


const PARTS = [
  { key: 'soprano', label: '女高音', short: 'S', color: '#FBCEE0', bg: 'bg-[#FBCEE0]' },
  { key: 'alto', label: '女低音', short: 'A', color: '#CFF6F6', bg: 'bg-[#CFF6F6]' },
  { key: 'tenor', label: '男高音', short: 'T', color: '#FBEBB8', bg: 'bg-[#FBEBB8]' },
  { key: 'bass', label: '男低音', short: 'B', color: '#F1D9D0', bg: 'bg-[#F1D9D0]' },
];

// Map note names to jianpu numbers and solfege
const NOTE_TO_JIANPU: Record<string, { num: string; solfege: string }> = {
  'C3': { num: '1', solfege: 'do' }, 'C#3': { num: '#1', solfege: 'di' },
  'D3': { num: '2', solfege: 're' }, 'D#3': { num: '#2', solfege: 'ri' },
  'E3': { num: '3', solfege: 'mi' },
  'F3': { num: '4', solfege: 'fa' }, 'F#3': { num: '#4', solfege: 'fi' },
  'G3': { num: '5', solfege: 'sol' }, 'G#3': { num: '#5', solfege: 'si' },
  'A3': { num: '6', solfege: 'la' }, 'A#3': { num: '#6', solfege: 'li' },
  'B3': { num: '7', solfege: 'ti' },
  'C4': { num: '1̇', solfege: 'do' }, 'C#4': { num: '#1̇', solfege: 'di' },
  'D4': { num: '2̇', solfege: 're' }, 'D#4': { num: '#2̇', solfege: 'ri' },
  'E4': { num: '3̇', solfege: 'mi' },
  'F4': { num: '4̇', solfege: 'fa' }, 'F#4': { num: '#4̇', solfege: 'fi' },
  'G4': { num: '5̇', solfege: 'sol' }, 'G#4': { num: '#5̇', solfege: 'si' },
  'A4': { num: '6̇', solfege: 'la' }, 'A#4': { num: '#6̇', solfege: 'li' },
  'B4': { num: '7̇', solfege: 'ti' },
};

export default function RehearsalRoom() {
  const { id } = useParams<{ id: string }>();
  const [score, setScore] = useState<Score | null>(null);
  const [volumes, setVolumes] = useState({ soprano: 0.7, alto: 0.7, tenor: 0.7, bass: 0.7 });
  const [enabled, setEnabled] = useState({ soprano: true, alto: true, tenor: true, bass: true });
  const [myPart, setMyPart] = useState('soprano');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const player = useMultiTrackPlayer();
  const pitch = usePitchDetection();

  // Load score
  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/api/scores/${id}`)
      .then(r => r.json())
      .then((data: Score) => {
        setScore(data);
        if (data.parts_data) {
          const { soprano, alto, tenor, bass } = data.parts_data;
          player.initSynths({ soprano, alto, tenor, bass });
          player.updateBpm(data.parts_data.tempo || 72);
        }
      });
  }, [id]);

  // Pitch visualization
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = 'hsl(var(--bg-deep))';
      ctx.fillRect(0, 0, w, h);

      // Center line (in tune)
      ctx.strokeStyle = 'hsl(var(--border))';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Tolerance zone (±25 cents)
      ctx.fillStyle = 'hsla(150,60%,45%,0.08)';
      const zoneHeight = (25 / 50) * (h / 2);
      ctx.fillRect(0, h / 2 - zoneHeight, w, zoneHeight * 2);

      if (pitch.pitchData && pitch.volume > 0.015) {
        const { cents, note } = pitch.pitchData;
        const x = w / 2 + (cents / 50) * (w / 2);
        const clampedX = Math.max(12, Math.min(w - 12, x));

        const isInTune = Math.abs(cents) < 25;
        const color = isInTune ? '#22c55e' : Math.abs(cents) < 50 ? '#eab308' : '#ef4444';

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(clampedX, h / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(clampedX, h / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Note label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(note, clampedX, h / 2 - 22);

        // Cents
        ctx.font = '12px monospace';
        ctx.fillStyle = color;
        ctx.fillText(`${cents > 0 ? '+' : ''}${cents}¢`, clampedX, h / 2 + 24);
      }

      // Labels
      ctx.fillStyle = '#555';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('偏低', 6, h / 2 + 4);
      ctx.textAlign = 'right';
      ctx.fillText('偏高', w - 6, h / 2 + 4);

      rafRef.current = requestAnimationFrame(draw);
    };

    const rafRef = { current: 0 };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pitch.pitchData, pitch.volume]);

  const handleVolumeChange = (part: string, val: number) => {
    setVolumes(prev => ({ ...prev, [part]: val }));
    player.setPartVolume(part, val);
  };

  const handleTogglePart = (part: string) => {
    const newVal = !enabled[part as keyof typeof enabled];
    setEnabled(prev => ({ ...prev, [part]: newVal }));
    player.setPartEnabled(part, newVal);
  };

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full page relative z-10">
        <div className="neu p-8 rounded-2xl text-center">
          <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3" style={{ borderColor: "hsl(var(--text-tertiary))", borderTopColor: "var(--accent)" }} />
          <div className="text-sm font-bold" style={{ color: "hsl(var(--text-secondary))" }}>加载乐谱中...</div>
        </div>
      </div>
    );
  }

  const partNotes = (key: string): VoicePart | undefined => {
    const pd = score.parts_data;
    if (!pd) return undefined;
    return pd[key as keyof typeof pd] as VoicePart | undefined;
  };

  return (
    <div className="flex h-full page relative z-10">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(var(--border))] glass">
          <div className="flex items-center gap-4">
            <Link to="/scores" className="neu neu-hover w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "hsl(var(--text-tertiary))" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "hsl(var(--text))" }}>{score.title}</h2>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>
                {score.composer || '未知'} · {score.key_sig || 'C大调'} · {score.time_signature || '4/4'} · ♩={player.bpm}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/conductor" className="text-xs neu neu-hover px-3 py-1.5 rounded-lg font-bold" style={{ color: "hsl(var(--text-secondary))" }}>
              指挥大屏
            </Link>
          </div>
        </div>

        {/* Score display */}
        <div className="flex-1 overflow-auto p-6" style={{ background: "hsl(var(--bg))" }}>
          <div className="w-full mx-auto neu p-6" style={{ borderRadius: "20px" }}>
            {/* Title */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "hsl(var(--text))" }}>{score.title}</h3>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{score.composer || '未知作曲家'}</p>
              </div>
              <div className="text-right text-sm font-medium" style={{ color: "hsl(var(--text-tertiary))" }}>
                <p>{score.key_sig}</p>
                <p>♩ = {player.bpm}</p>
              </div>
            </div>

            {/* Jianpu display for each part */}
            {PARTS.map(part => {
              const notes = partNotes(part.key)?.notes || [];
              return (
                <div key={part.key} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full ${part.bg} flex items-center justify-center text-xs font-bold text-white`}>
                      {part.short}
                    </span>
                    <span className="text-xs text-neutral-500">{part.label}</span>
                  </div>
                  {/* Jianpu bar */}
                  <div className="neu-inset rounded-xl p-3 overflow-x-auto">
                    <div className="flex items-center gap-1 min-w-max">
                      {/* Bar line start */}
                      <div className="w-0.5 h-10 flex-shrink-0" style={{ background: "hsl(var(--border))" }} />
                      {notes.map((n, i) => {
                        const jianpu = NOTE_TO_JIANPU[n.note] || { num: n.note, solfege: '' };
                        const isMyPart = part.key === myPart;
                        return (
                          <div key={i} className="flex flex-col items-center px-1">
                            <span
                              className="text-lg font-bold font-mono leading-tight"
                              style={{ color: isMyPart ? part.color : 'hsl(var(--text-tertiary))', opacity: enabled[part.key as keyof typeof enabled] ? 1 : 0.3 }}
                            >
                              {jianpu.num}
                            </span>
                            <span className="text-[9px] font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{jianpu.solfege}</span>
                          </div>
                        );
                      })}
                      {/* Bar line end */}
                      <div className="w-0.5 h-10 flex-shrink-0" style={{ background: "hsl(var(--border))" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Playback controls */}
        <div className="px-6 py-3 border-t border-[hsl(var(--border))] glass">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button onClick={() => { player.stop(); pitch.stopListening(); }}
                className="w-9 h-9 rounded-lg neu flex items-center justify-center neu-hover" style={{ color: "hsl(var(--text-secondary))" }}>
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => player.isPlaying ? player.pause() : player.play()}
                className="w-11 h-11 rounded-xl glass flex items-center justify-center neu-hover" style={{ color: "var(--accent)" }}>
                {player.isPlaying ? <Pause className="w-5 h-5" style={{ color: "var(--accent)" }} /> : <Play className="w-5 h-5 ml-0.5" style={{ color: "var(--accent)" }} />}
              </button>
              <button onClick={() => { player.stop(); pitch.stopListening(); }}
                className="w-9 h-9 rounded-lg neu flex items-center justify-center neu-hover" style={{ color: "hsl(var(--text-secondary))" }}>
                <Square className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <div className="h-1.5 neu-inset rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min(100, (player.currentTime / Math.max(player.duration, 1)) * 100)}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{player.currentTime.toFixed(1)}s</span>
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-tertiary))' }}>{player.duration.toFixed(1)}s</span>
              </div>
            </div>
            <MetronomeWheel bpm={player.bpm} onChange={player.updateBpm} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 neu flex flex-col overflow-auto ml-4" style={{ borderRadius: "20px", borderLeft: "none" }}>
        {/* My Part */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <label className="text-xs font-bold mb-2 block" style={{ color: "hsl(var(--text-tertiary))" }}>我的声部</label>
          <div className="grid grid-cols-4 gap-1.5">
            {PARTS.map(p => (
              <button key={p.key} onClick={() => setMyPart(p.key)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${myPart === p.key ? 'neu-inset' : 'neu neu-hover'}`} style={myPart === p.key ? { color: p.color, background: p.color + '20' } : { color: 'hsl(var(--text-tertiary))' }}>
                {p.short}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold mt-2" style={{ color: 'hsl(var(--text-tertiary))' }}>当前：{PARTS.find(p => p.key === myPart)?.label}</p>
        </div>

        {/* Part volume controls */}
        <div className="p-4 border-b border-[hsl(var(--border))] space-y-2">
          <label className="text-xs font-bold block" style={{ color: "hsl(var(--text-tertiary))" }}>声部音量</label>
          {PARTS.map(p => (
            <div key={p.key} className="flex items-center gap-2">
              <button onClick={() => handleTogglePart(p.key)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${enabled[p.key as keyof typeof enabled] ? 'neu' : 'neu-inset'}`} style={enabled[p.key as keyof typeof enabled] ? { color: p.color } : { color: 'hsl(var(--text-tertiary))' }}>
                {enabled[p.key as keyof typeof enabled] ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <span className="text-xs w-8 font-bold" style={{ color: p.color }}>{p.short}</span>
              <input type="range" min={0} max={1} step={0.05}
                value={volumes[p.key as keyof typeof volumes]}
                onChange={e => handleVolumeChange(p.key, Number(e.target.value))}
                className="flex-1" style={{ accentColor: 'var(--accent)' }} />
            </div>
          ))}
        </div>

        {/* Pitch detection */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <label className="text-xs font-bold mb-2 block" style={{ color: "hsl(var(--text-tertiary))" }}>音高检测</label>

          {pitch.error && (
            <div className="flex items-center gap-2 mb-2 text-xs rounded-xl p-2" style={{ color: "hsl(0,65%,45%)", background: "hsla(0,70%,55%,0.08)" }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{pitch.error}</span>
            </div>
          )}

          <canvas ref={canvasRef} width={280} height={80}
            className="w-full rounded-xl neu-inset mb-3" style={{ background: "hsl(var(--bg-deep))" }} />

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--text-tertiary))" }}>检测音高</p>
              <p className="text-xl font-bold font-mono" style={{ color: "hsl(var(--text))" }}>
                {pitch.pitchData?.note || '-'}
                {pitch.pitchData && (
                  <span className={`text-sm ml-1 ${Math.abs(pitch.pitchData.cents) < 25 ? 'text-green-600' : 'text-red-500'}`}>
                    {pitch.pitchData.cents > 0 ? '+' : ''}{pitch.pitchData.cents}¢
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: "hsl(var(--text-tertiary))" }}>音量</p>
              <p className="text-xl font-bold" style={{ color: "hsl(var(--text))" }}>{Math.round(pitch.volume * 100)}%</p>
            </div>
          </div>

          <button onClick={() => pitch.isListening ? pitch.stopListening() : pitch.startListening()}
            className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all neu ${pitch.isListening ? 'neu-hover' : 'neu-hover'}`} style={pitch.isListening ? { color: 'hsl(0,65%,45%)' } : { color: 'var(--accent)' }}>
            {pitch.isListening ? <><MicOff className="w-4 h-4" />停止检测</> : <><Mic className="w-4 h-4" />开始音高检测</>}
          </button>

          {pitch.isListening && pitch.pitchData && (
            <p className="text-xs text-center mt-2" style={{ color: Math.abs(pitch.pitchData.cents) < 25 ? '#22c55e' : '#ef4444' }}>
              {Math.abs(pitch.pitchData.cents) < 25 ? '音准良好' : Math.abs(pitch.pitchData.cents) < 50 ? '轻微偏差' : '音准偏差较大'}
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="p-4">
          <div className="neu-inset rounded-xl p-3 text-xs leading-relaxed font-medium" style={{ color: "hsl(var(--text-secondary))" }}>
            <p className="font-bold mb-1" style={{ color: "hsl(var(--text))" }}>练习建议</p>
            <p>关闭自己的声部，跟着其他三个声部练习。点击"开始音高检测"后对着麦克风唱，看实时偏差。</p>
            <p className="mt-1 font-bold" style={{ color: 'hsl(150,50%,40%)' }}>±25音分以内 = 合格</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ========== METRONOME WHEEL COMPONENT ==========
function MetronomeWheel({ bpm, onChange }: { bpm: number; onChange: (b: number) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [measure, setMeasure] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {}, 60000 / bpm);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, bpm]);

  const adjustBpm = (delta: number) => {
    const next = Math.max(40, Math.min(200, bpm + delta));
    onChange(next);
  };

  return (
    <div className="neu p-4 flex flex-col items-center gap-3" style={{ borderRadius: '16px' }}>
      {/* BPM Wheel */}
      <div className="flex items-center gap-4">
        <button onClick={() => adjustBpm(-1)} className="neu neu-hover w-10 h-10 rounded-xl flex items-center justify-center">
          <ChevronDown className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
        </button>
        <div className="text-center" style={{ minWidth: '60px' }}>
          <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text))' }}>{bpm}</div>
          <div className="text-[9px] font-bold" style={{ color: 'hsl(var(--text-tertiary))' }}>BPM</div>
        </div>
        <button onClick={() => adjustBpm(1)} className="neu neu-hover w-10 h-10 rounded-xl flex items-center justify-center">
          <ChevronUp className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} />
        </button>
      </div>
      {/* Measure control */}
      <div className="flex items-center gap-2 w-full">
        <span className="text-[10px] font-bold" style={{ color: 'hsl(var(--text-tertiary))' }}>排号</span>
        <input type="number" min={1} max={16} value={measure}
          onChange={e => setMeasure(Math.max(1, Math.min(16, Number(e.target.value))))}
          className="flex-1 neu p-2 text-center text-sm font-bold rounded-xl"
          style={{ color: 'hsl(var(--text))' }} />
      </div>
      {/* Play/Pause */}
      <button onClick={() => setIsPlaying(!isPlaying)}
        className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPlaying ? 'neu-inset' : 'glass neu-hover'}`}
        style={isPlaying ? { color: 'hsl(0,65%,45%)' } : { color: 'var(--accent)' }}>
        {isPlaying ? <><Square className="w-4 h-4" />停止</> : <><Play className="w-4 h-4" />开始节拍</>}
      </button>
    </div>
  );
}
