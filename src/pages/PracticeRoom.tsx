import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, CheckCircle, XCircle, Star, Volume2, Headphones, Clock, Plus, X } from 'lucide-react';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import * as Tone from 'tone';

const synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.5 } }).toDestination();
const polySynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.5 } }).toDestination();

function playNote(note: string, dur = '2n') { Tone.start(); synth.triggerAttackRelease(note, dur); }
function playChord(notes: string[], dur = '1n') { Tone.start(); polySynth.triggerAttackRelease(notes, dur); }
function playMelody(notes: string[], interval = 0.4) { Tone.start(); const now = Tone.now(); notes.forEach((n, i) => synth.triggerAttackRelease(n, '8n', now + i * interval)); }
function playRhythm(pattern: string[]) { Tone.start(); const now = Tone.now(); let time = 0; pattern.forEach(dur => { const duration = dur === '4n' ? 0.5 : dur === '8n' ? 0.25 : dur === '4n.' ? 0.75 : dur === '16n' ? 0.125 : 0.5; synth.triggerAttackRelease('C5', '32n', now + time); time += duration; }); }
function playMetronome(bpm: number, beats: number) { Tone.start(); const now = Tone.now(); for (let i = 0; i < beats; i++) { synth.triggerAttackRelease(i % 4 === 0 ? 'C6' : 'C5', '32n', now + i * (60 / bpm)); } }

const NOTE_SOLFEGE: Record<string, string> = { 'C': 'do', 'D': 're', 'E': 'mi', 'F': 'fa', 'G': 'sol', 'A': 'la', 'B': 'si' };
const ALL_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
const nn = (n: string) => n.replace(/\d/, '');
const solf = (n: string) => NOTE_SOLFEGE[nn(n)] || '';

// ============ EXERCISE DATABASE (10+ types) ============
const EXERCISE_LIBRARY = [
  { id: 'pitch-single', label: '单音模唱', icon: 'mic', desc: '听单个音并模唱', category: '音高' },
  { id: 'pitch-interval', label: '音程模唱', icon: 'mic', desc: '听两个音并模唱第二个', category: '音高' },
  { id: 'interval-highlow', label: '音程高低', icon: 'volume2', desc: '判断两个音哪个更高', category: '音高' },
  { id: 'scale-updown', label: '音阶上下行', icon: 'mic', desc: 'C大调音阶模唱', category: '音高' },
  { id: 'chord', label: '和弦听辨', icon: 'headphones', desc: '判断大三/小三/增减三和弦，然后唱出根音', category: '和声' },
  { id: 'key', label: '调式判断', icon: 'volume2', desc: '听旋律判断大调或小调，然后唱出主音', category: '调式' },
  { id: 'rhythm', label: '节奏识别', icon: 'clock', desc: '听节奏型选择对应图案', category: '节奏' },
  { id: 'rhythm-imitate', label: '节奏模仿', icon: 'clock', desc: '用哒模仿听到的节奏', category: '节奏' },
  { id: 'tempo', label: '速度判断', icon: 'clock', desc: '判断节拍器的BPM', category: '节奏' },
  { id: 'sight-sing', label: '视唱练耳', icon: 'mic', desc: '看简谱唱出旋律', category: '综合' },
  { id: 'time-sig', label: '拍号判断', icon: 'clock', desc: '听节奏判断几几拍', category: '节奏' },
];

const ICON_MAP: Record<string, any> = { mic: Mic, headphones: Headphones, volume2: Volume2, clock: Clock };

function loadActiveExercises(): string[] {
  const saved = localStorage.getItem('choir_practice_active');
  if (saved) return JSON.parse(saved);
  return ['pitch-single', 'chord', 'key', 'rhythm', 'sight-sing'];
}
function saveActiveExercises(ids: string[]) { localStorage.setItem('choir_practice_active', JSON.stringify(ids)); }

// ============ DATA ============
const INTERVALS = [
  { name: '纯四度', notes: ['C4', 'F4'] }, { name: '纯五度', notes: ['C4', 'G4'] },
  { name: '纯八度', notes: ['C4', 'C5'] }, { name: '大三度', notes: ['C4', 'E4'] },
  { name: '大六度', notes: ['C4', 'A4'] }, { name: '小三度', notes: ['E4', 'G4'] },
  { name: '小二度', notes: ['E4', 'F4'] }, { name: '大二度', notes: ['C4', 'D4'] },
];

const CHORD_DATA = [
  { notes: ['C4', 'E4', 'G4'], type: '大三和弦', opts: ['大三和弦', '小三和弦', '增三和弦', '减三和弦'], root: 'C4' },
  { notes: ['C4', 'Eb4', 'G4'], type: '小三和弦', opts: ['小三和弦', '大三和弦', '增三和弦', '减三和弦'], root: 'C4' },
  { notes: ['C4', 'E4', 'G#4'], type: '增三和弦', opts: ['增三和弦', '大三和弦', '小三和弦', '减三和弦'], root: 'C4' },
  { notes: ['C4', 'Eb4', 'Gb4'], type: '减三和弦', opts: ['减三和弦', '小三和弦', '大三和弦', '增三和弦'], root: 'C4' },
  { notes: ['C4', 'E4', 'G4', 'Bb4'], type: '属七和弦', opts: ['属七和弦', '大七和弦', '小七和弦', '半减七和弦'], root: 'C4' },
  { notes: ['C4', 'E4', 'G4', 'B4'], type: '大七和弦', opts: ['大七和弦', '属七和弦', '小七和弦', '半减七和弦'], root: 'C4' },
  { notes: ['C4', 'Eb4', 'G4', 'Bb4'], type: '小七和弦', opts: ['小七和弦', '属七和弦', '大七和弦', '半减七和弦'], root: 'C4' },
];

const KEY_DATA = [
  { notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], type: '大调', opts: ['大调', '小调'], hint: '明亮、开阔、主音C', root: 'C4' },
  { notes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'], type: '小调', opts: ['小调', '大调'], hint: '暗淡、忧伤、主音A', root: 'A3' },
  { notes: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4'], type: '大调', opts: ['大调', '小调'], hint: '明亮、主音G', root: 'G3' },
  { notes: ['E3', 'F#3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'], type: '小调', opts: ['小调', '大调'], hint: '暗淡、主音E', root: 'E3' },
  { notes: ['F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4'], type: '大调', opts: ['大调', '小调'], hint: '柔和、主音F', root: 'F3' },
  { notes: ['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C4', 'D4'], type: '小调', opts: ['小调', '大调'], hint: '忧伤、主音D', root: 'D3' },
];

const RHYTHM_DATA = [
  { pattern: ['4n', '4n', '4n', '4n'], name: '四分音符×4', opts: ['四分音符×4', '八分音符×8', '附点四分+八分', '切分节奏'] },
  { pattern: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'], name: '八分音符×8', opts: ['八分音符×8', '四分音符×4', '十六分音符×16', '附点节奏'] },
  { pattern: ['4n.', '8n', '4n', '4n'], name: '附点四分+八分', opts: ['附点四分+八分', '四分音符×4', '切分节奏', '三连音'] },
  { pattern: ['8n', '8n', '4n', '8n', '8n', '4n'], name: '切分节奏', opts: ['切分节奏', '附点四分+八分', '八分音符×8', '四分音符×4'] },
];

const SIGHT_SING_DATA = [
  { notes: ['C4', 'E4', 'G4', 'E4', 'C4'], jianpu: ['1', '3', '5', '3', '1'], name: 'C大调上行' },
  { notes: ['C4', 'D4', 'E4', 'D4', 'C4'], jianpu: ['1', '2', '3', '2', '1'], name: '简单上行' },
  { notes: ['G4', 'E4', 'C4', 'E4', 'G4'], jianpu: ['5', '3', '1', '3', '5'], name: 'C大调下行' },
  { notes: ['C4', 'E4', 'G4', 'A4', 'G4'], jianpu: ['1', '3', '5', '6', '5'], name: '五声音阶' },
  { notes: ['C4', 'D4', 'E4', 'G4', 'E4'], jianpu: ['1', '2', '3', '5', '3'], name: '跳跃旋律' },
  { notes: ['E4', 'D4', 'C4', 'D4', 'E4'], jianpu: ['3', '2', '1', '2', '3'], name: '波浪下行' },
  { notes: ['G4', 'A4', 'G4', 'E4', 'C4'], jianpu: ['5', '6', '5', '3', '1'], name: '五度下行' },
  { notes: ['C4', 'F4', 'E4', 'G4', 'C5'], jianpu: ['1', '4', '3', '5', '1̇'], name: '四度跳跃' },
];

function RhythmVisual({ pattern }: { pattern: string[] }) {
  return (
    <div className="flex items-center gap-1 h-6">
      {pattern.map((dur, i) => {
        const width = dur === '4n' ? 28 : dur === '8n' ? 18 : dur === '4n.' ? 40 : dur === '16n' ? 12 : 28;
        return <div key={i} className="flex items-end" style={{ width }}><div className={`w-full rounded-sm ${dur === '8n' ? 'h-3' : dur === '16n' ? 'h-2' : 'h-4'}`} style={{ backgroundColor: 'var(--accent)' }} /></div>;
      })}
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function ScoreBar({ score, total }: { score: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-[hsl(var(--text-tertiary))]">得分: <span className="text-amber-600 font-bold">{score}/{total}</span></div>
      <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${score >= s ? 'text-amber-600 fill-amber-500' : 'text-neutral-700'}`} />)}</div>
    </div>
  );
}

function GreenProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-48 h-2 bg-[hsl(var(--bg-deep))] rounded-full overflow-hidden mx-auto mb-3">
      <div
        className="h-full bg-green-400 transition-all duration-100"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ============ ACCUMULATED CHECK HOOK (0.5s green flash) ============
function useAccumulatedCheck(
  targetNote: string,
  centsThreshold: number = 25,
  requiredMs: number = 500
) {
  const pitch = usePitchDetection();
  const [phase, setPhase] = useState<'idle' | 'sing' | 'result'>('idle');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [detectedNote, setDetectedNote] = useState('');
  const [greenPercent, setGreenPercent] = useState(0);
  const [isGreen, setIsGreen] = useState(false);

  const pitchRef = useRef(pitch.pitchData);
  pitchRef.current = pitch.pitchData;
  const volumeRef = useRef(pitch.volume);
  volumeRef.current = pitch.volume;

  const startSinging = useCallback(() => {
    setPhase('sing');
    setGreenPercent(0);
    setIsGreen(false);
    pitch.startListening();
  }, [pitch]);

  const cancelSinging = useCallback(() => {
    pitch.stopListening();
    setPhase('idle');
    setGreenPercent(0);
    setIsGreen(false);
  }, [pitch]);

  const markWrong = useCallback((detected: string = '') => {
    pitch.stopListening();
    setDetectedNote(detected);
    setResult('wrong');
    setPhase('result');
    setGreenPercent(0);
    setIsGreen(false);
  }, [pitch]);

  useEffect(() => {
    if (phase !== 'sing') return;
    let greenTime = 0;
    const interval = setInterval(() => {
      const pd = pitchRef.current;
      const vol = volumeRef.current;
      if (!pd || vol <= 0.03) {
        setIsGreen(false);
        return;
      }
      const noteMatch = nn(targetNote) === nn(pd.note);
      const centsOk = Math.abs(pd.cents) < centsThreshold;
      if (noteMatch && centsOk) {
        setIsGreen(true);
        greenTime += 100;
        setGreenPercent((greenTime / requiredMs) * 100);
        if (greenTime >= requiredMs) {
          clearInterval(interval);
          pitch.stopListening();
          setDetectedNote(pd.note);
          setResult('correct');
          setPhase('result');
          setGreenPercent(100);
          setIsGreen(false);
        }
      } else {
        setIsGreen(false);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, targetNote, centsThreshold, requiredMs, pitch]);

  return {
    pitch, phase, setPhase, result, setResult,
    detectedNote, setDetectedNote,
    greenPercent, isGreen,
    startSinging, cancelSinging, markWrong,
  };
}

// ============ RANDOMIZED QUIZ HOOK ============
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useQuizExercise<T>(data: T[], checkFn: (item: T, answer: string) => boolean) {
  const [order, setOrder] = useState<number[]>(() => shuffleArray(data.map((_, i) => i)));
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const idx = order[current % order.length];
  const item = data[idx];

  const next = () => {
    const nextPos = current + 1;
    if (nextPos >= order.length) {
      // Reshuffle when all items used
      setOrder(shuffleArray(data.map((_, i) => i)));
      setCurrent(0);
    } else {
      setCurrent(nextPos);
    }
    setResult(null);
  };

  const guess = (answer: string) => {
    if (result) return;
    setTotal(t => t + 1);
    const ok = checkFn(item, answer);
    setResult(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
  };

  return { item, result, score, total, next, guess };
}

// ============ MAIN ============
export default function PracticeRoom() {
  const [activeIds, setActiveIds] = useState<string[]>(loadActiveExercises);
  const [currentTab, setCurrentTab] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { saveActiveExercises(activeIds); }, [activeIds]);
  useEffect(() => { if (activeIds.length > 0 && !currentTab) setCurrentTab(activeIds[0]); }, [activeIds, currentTab]);

  const addExercise = (id: string) => { if (!activeIds.includes(id)) { setActiveIds([...activeIds, id]); setCurrentTab(id); } setShowAdd(false); };
  const removeExercise = (id: string) => { const next = activeIds.filter(a => a !== id); setActiveIds(next); if (currentTab === id && next.length > 0) setCurrentTab(next[0]); };

  const activeDefs = activeIds.map(id => EXERCISE_LIBRARY.find(e => e.id === id)!).filter(Boolean);
  const availableDefs = EXERCISE_LIBRARY.filter(e => !activeIds.includes(e.id));

  const categories = [...new Set(availableDefs.map(e => e.category))];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[hsl(var(--border))]" style={{ background: "hsl(var(--bg))" }}>
        <Link to="/" className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text))]"><ArrowLeft className="w-5 h-5" /></Link>
        <h2 className="font-semibold">个人练习室</h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 neu border-b border-[hsl(var(--border))] overflow-x-auto overscroll-x-contain mb-4" style={{ borderRadius: "14px", scrollbarWidth: 'none' }}>
        {activeDefs.map(def => {
          const Icon = ICON_MAP[def.icon] || Mic;
          return (
            <div key={def.id} onClick={() => setCurrentTab(def.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all flex-shrink-0 neu-sm ${currentTab === def.id ? 'neu-inset text-accent' : 'text-[hsl(var(--text-secondary))] neu-sm-hover'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{def.label}</span>
              {activeIds.length > 1 && (
                <button onClick={e => { e.stopPropagation(); removeExercise(def.id); }}
                  className="ml-1 text-[hsl(var(--text-secondary))] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {availableDefs.length > 0 && (
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold flex-shrink-0 neu-sm neu-sm-hover" style={{ color: 'hsl(var(--text-secondary))' }}>
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add panel grouped by category */}
      {showAdd && availableDefs.length > 0 && (
        <div className="p-3 border-b border-[hsl(var(--border))]" style={{ background: "hsl(var(--bg))" }}>
          {categories.map(cat => (
            <div key={cat} className="mb-2 last:mb-0">
              <p className="text-xs text-[hsl(var(--text-tertiary))] mb-1">{cat}</p>
              <div className="flex gap-2 flex-wrap">
                {availableDefs.filter(e => e.category === cat).map(def => {
                  const Icon = ICON_MAP[def.icon] || Mic;
                  return (
                    <button key={def.id} onClick={() => addExercise(def.id)}
                      className="flex items-center gap-2 px-3 py-2 neu rounded-xl text-sm font-bold neu-hover" style={{ color: 'hsl(var(--text-secondary))' }}>
                      <Icon className="w-3.5 h-3.5" />{def.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {currentTab === 'pitch-single' && <PitchExerciseSingle />}
        {currentTab === 'pitch-interval' && <PitchExerciseInterval />}
        {currentTab === 'interval-highlow' && <IntervalHighLow />}
        {currentTab === 'scale-updown' && <ScaleExercise />}
        {currentTab === 'chord' && <ChordExercise />}
        {currentTab === 'key' && <KeyExercise />}
        {currentTab === 'rhythm' && <RhythmExercise />}
        {currentTab === 'rhythm-imitate' && <RhythmImitate />}
        {currentTab === 'tempo' && <TempoExercise />}
        {currentTab === 'sight-sing' && <SightSingExercise />}
        {currentTab === 'time-sig' && <TimeSignatureExercise />}
      </div>
    </div>
  );
}

// ============ 1. PITCH SINGLE ============
function PitchExerciseSingle() {
  const [targetNote, setTargetNote] = useState('');
  const [phase, setPhase] = useState<'idle' | 'listen' | 'sing' | 'result'>('idle');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const check = useAccumulatedCheck(targetNote, 25, 500);

  const generate = () => {
    check.setResult(null);
    check.setDetectedNote('');
    setPhase('listen');
    setTargetNote(ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)]);
  };

  const startSinging = () => {
    setPhase('sing');
    check.startSinging();
  };

  // Watch for check completion
  useEffect(() => {
    if (check.phase === 'result' && phase === 'sing') {
      setTotal(t => t + 1);
      if (check.result === 'correct') setScore(s => s + 1);
      setPhase('result');
    }
  }, [check.phase, check.result, phase]);

  const next = () => {
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setPhase('listen');
    setTargetNote(ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)]);
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {phase === 'idle' && <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>}
        {phase === 'listen' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">听标准音，然后模唱出相同的音</p>
            <div className="w-28 h-28 rounded-full neu-inset mx-auto mb-4">
              <div className="text-center"><span className="text-3xl font-bold text-amber-600">{nn(targetNote)}</span><p className="text-xs text-[hsl(var(--text-tertiary))]">{solf(targetNote)}</p></div>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => playNote(targetNote)} className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]"><Volume2 className="w-4 h-4" />播放</button>
              <button onClick={startSinging} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600"><Mic className="w-4 h-4" />开始模唱</button>
            </div>
          </div>
        )}
        {phase === 'sing' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">对着麦克风唱 {nn(targetNote)} ({solf(targetNote)})...</p>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && (
              <div>
                <p className="text-xl font-bold">{check.pitch.pitchData.note} <span className="text-sm text-[hsl(var(--text-tertiary))]">({solf(check.pitch.pitchData.note)})</span></p>
                <p className={`text-sm ${check.isGreen ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                  {check.pitch.pitchData.cents > 0 ? '+' : ''}{check.pitch.pitchData.cents}¢ {check.isGreen ? '✓' : ''}
                </p>
              </div>
            )}
            <button onClick={() => { check.cancelSinging(); setPhase('listen'); }} className="mt-3 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">取消</button>
          </div>
        )}
        {phase === 'result' && (
          <div>
            {check.result === 'correct' ? <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-2" />}
            <p className={`text-lg font-bold ${check.result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{check.result === 'correct' ? '正确!' : '音准有偏差'}</p>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mt-1">目标: {targetNote} ({solf(targetNote)}) {check.detectedNote && `· 检测: ${check.detectedNote}`}</p>
            <button onClick={next} className="mt-4 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>
          </div>
        )}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 2. PITCH INTERVAL ============
function PitchExerciseInterval() {
  const [targetNote, setTargetNote] = useState('');
  const [target2, setTarget2] = useState('');
  const [intervalName, setIntervalName] = useState('');
  const [phase, setPhase] = useState<'idle' | 'listen' | 'sing' | 'result'>('idle');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const check = useAccumulatedCheck(target2, 25, 500);

  const generate = () => {
    check.setResult(null);
    check.setDetectedNote('');
    setPhase('listen');
    const int = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    setTargetNote(int.notes[0]);
    setTarget2(int.notes[1]);
    setIntervalName(int.name);
  };

  const startSinging = () => { setPhase('sing'); check.startSinging(); };

  useEffect(() => {
    if (check.phase === 'result' && phase === 'sing') {
      setTotal(t => t + 1);
      if (check.result === 'correct') setScore(s => s + 1);
      setPhase('result');
    }
  }, [check.phase, check.result, phase]);

  const next = () => {
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setPhase('listen');
    const int = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    setTargetNote(int.notes[0]);
    setTarget2(int.notes[1]);
    setIntervalName(int.name);
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {phase === 'idle' && <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>}
        {phase === 'listen' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">听{intervalName}，模唱第二个音</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--bg-deep))] flex items-center justify-center"><span className="text-xl text-[hsl(var(--text-tertiary))]">{nn(targetNote)}</span></div>
              <span className="text-[hsl(var(--text-secondary))]">→</span>
              <div className="w-24 h-24 rounded-full bg-[hsl(var(--bg-deep))] border-2 border-amber-500/30 flex items-center justify-center"><span className="text-2xl font-bold text-amber-600">?</span></div>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { playNote(targetNote); setTimeout(() => playNote(target2), 600); }} className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]"><Volume2 className="w-4 h-4" />播放</button>
              <button onClick={startSinging} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600"><Mic className="w-4 h-4" />开始模唱</button>
            </div>
          </div>
        )}
        {phase === 'sing' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">对着麦克风唱{intervalName}的第二个音 ({nn(target2)})...</p>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && (
              <div>
                <p className="text-xl font-bold">{check.pitch.pitchData.note} <span className="text-sm text-[hsl(var(--text-tertiary))]">({solf(check.pitch.pitchData.note)})</span></p>
                <p className={`text-sm ${check.isGreen ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                  {check.pitch.pitchData.cents > 0 ? '+' : ''}{check.pitch.pitchData.cents}¢ {check.isGreen ? '✓' : ''}
                </p>
              </div>
            )}
            <button onClick={() => { check.cancelSinging(); setPhase('listen'); }} className="mt-3 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">取消</button>
          </div>
        )}
        {phase === 'result' && (
          <div>
            {check.result === 'correct' ? <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-2" />}
            <p className={`text-lg font-bold ${check.result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{check.result === 'correct' ? '正确!' : '音准有偏差'}</p>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mt-1">目标: {target2} ({solf(target2)}) {check.detectedNote && `· 检测: ${check.detectedNote}`}</p>
            <button onClick={next} className="mt-4 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>
          </div>
        )}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 3. INTERVAL HIGH/LOW ============
function IntervalHighLow() {
  const [note1, setNote1] = useState(''); const [note2, setNote2] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0); const [total, setTotal] = useState(0);

  const generate = () => {
    setResult(null);
    const n1 = ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)];
    const n2 = ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)];
    setNote1(n1); setNote2(n2);
  };
  const play = () => { playNote(note1); setTimeout(() => playNote(note2), 500); };
  const guess = (higher: string) => {
    if (result) return;
    setTotal(t => t + 1);
    const freq1 = Tone.Frequency(note1).toFrequency();
    const freq2 = Tone.Frequency(note2).toFrequency();
    const actualHigher = freq2 > freq1 ? '第二个' : freq1 > freq2 ? '第一个' : '一样高';
    const ok = higher === actualHigher;
    setResult(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {!note1 ? (
          <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>
        ) : (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听两个音，判断哪个更高</p>
            <button onClick={play} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Volume2 className="w-5 h-5" />播放两个音</button>
            <div className="flex gap-3 justify-center">
              {['第一个', '第二个', '一样高'].map(opt => (
                <button key={opt} onClick={() => guess(opt)} className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${result && ((Tone.Frequency(note2).toFrequency() > Tone.Frequency(note1).toFrequency() && opt === '第二个') || (Tone.Frequency(note1).toFrequency() > Tone.Frequency(note2).toFrequency() && opt === '第一个') || (Math.abs(Tone.Frequency(note1).toFrequency() - Tone.Frequency(note2).toFrequency()) < 1 && opt === '一样高')) ? 'bg-[hsla(150,60%,45%,0.12)] text-[hsl(150,55%,40%)] border border-green-500/30' : result ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)] border border-red-500/30' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]'}`}>{opt}</button>
              ))}
            </div>
            {result && <div className="mt-4"><p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `错误，${Tone.Frequency(note2).toFrequency() > Tone.Frequency(note1).toFrequency() ? '第二个更高' : Tone.Frequency(note1).toFrequency() > Tone.Frequency(note2).toFrequency() ? '第一个更高' : '两个音一样高'}`}</p><button onClick={generate} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
          </>
        )}
      </div>
    </div>
  );
}

// ============ 4. SCALE UP/DOWN ============
function ScaleExercise() {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [startNote, setStartNote] = useState('');
  const [targetNote, setTargetNote] = useState('');
  const [phase, setPhase] = useState<'idle' | 'listen' | 'sing' | 'result'>('idle');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const check = useAccumulatedCheck(targetNote, 25, 500);

  const generate = () => {
    check.setResult(null);
    check.setDetectedNote('');
    setPhase('listen');
    const dir = Math.random() > 0.5 ? 'up' : 'down';
    setDirection(dir);
    const startIdx = Math.floor(Math.random() * 5);
    setStartNote(ALL_NOTES[startIdx]);
    const targetIdx = dir === 'up' ? Math.min(startIdx + 3, 6) : Math.max(startIdx - 3, 0);
    setTargetNote(ALL_NOTES[targetIdx]);
  };

  const playScale = () => {
    const startIdx = ALL_NOTES.indexOf(startNote);
    const targetIdx = ALL_NOTES.indexOf(targetNote);
    Tone.start();
    const now = Tone.now();
    if (direction === 'up') { for (let i = startIdx; i <= targetIdx; i++) synth.triggerAttackRelease(ALL_NOTES[i], '8n', now + (i - startIdx) * 0.3); }
    else { for (let i = startIdx; i >= targetIdx; i--) synth.triggerAttackRelease(ALL_NOTES[i], '8n', now + (startIdx - i) * 0.3); }
  };

  const startSinging = () => { setPhase('sing'); check.startSinging(); };

  useEffect(() => {
    if (check.phase === 'result' && phase === 'sing') {
      setTotal(t => t + 1);
      if (check.result === 'correct') setScore(s => s + 1);
      setPhase('result');
    }
  }, [check.phase, check.result, phase]);

  const next = () => {
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setPhase('listen');
    const dir = Math.random() > 0.5 ? 'up' : 'down';
    setDirection(dir);
    const startIdx = Math.floor(Math.random() * 5);
    setStartNote(ALL_NOTES[startIdx]);
    const targetIdx = dir === 'up' ? Math.min(startIdx + 3, 6) : Math.max(startIdx - 3, 0);
    setTargetNote(ALL_NOTES[targetIdx]);
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {phase === 'idle' && <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>}
        {phase === 'listen' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">听音阶，模唱{direction === 'up' ? '上行' : '下行'}的最后一个音</p>
            <div className="w-28 h-28 rounded-full neu-inset mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-600">{direction === 'up' ? '↑' : '↓'}</span>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={playScale} className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]"><Volume2 className="w-4 h-4" />播放音阶</button>
              <button onClick={startSinging} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600"><Mic className="w-4 h-4" />模唱</button>
            </div>
          </div>
        )}
        {phase === 'sing' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">唱出音阶的最后一个音 ({nn(targetNote)})...</p>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && <p className="text-xl font-bold">{check.pitch.pitchData.note}</p>}
            <button onClick={() => { check.cancelSinging(); setPhase('listen'); }} className="mt-3 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">取消</button>
          </div>
        )}
        {phase === 'result' && <div>{check.result === 'correct' ? <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-2" />}<p className={`text-lg font-bold ${check.result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{check.result === 'correct' ? '正确!' : '偏差较大'}</p><p className="text-sm text-[hsl(var(--text-tertiary))] mt-1">目标: {targetNote} ({solf(targetNote)}) {check.detectedNote && `· 检测: ${check.detectedNote}`}</p><button onClick={next} className="mt-4 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 5. CHORD (Listen + Sing Root) ============
function ChordExercise() {
  const { item, result, score, total, next, guess } = useQuizExercise(CHORD_DATA, (item, ans) => ans === item.type);
  const [singPhase, setSingPhase] = useState(false);
  const check = useAccumulatedCheck(item.root, 25, 500);

  // Reset sing phase when new item
  useEffect(() => {
    setSingPhase(false);
  }, [item]);

  // Watch for singing completion
  useEffect(() => {
    if (check.phase === 'result' && singPhase) {
      setSingPhase(false);
    }
  }, [check.phase, singPhase]);

  const handleNext = () => {
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setSingPhase(false);
    next();
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Phase 1: Listen and identify chord */}
        {!singPhase && (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听和弦，判断和弦类型</p>
            <button onClick={() => playChord(item.notes)} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Headphones className="w-5 h-5" />播放和弦</button>
            <div className="grid grid-cols-2 gap-2">{item.opts.map((opt: string) => <button key={opt} onClick={() => guess(opt)} className={`py-3 rounded-lg text-sm border transition-colors ${result && opt === item.type ? 'bg-[hsla(150,60%,45%,0.12)] text-[hsl(150,55%,40%)] border-green-500/30' : result && opt !== item.type ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)] border-red-500/30' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-secondary))] border-transparent hover:bg-[hsl(var(--bg))]'}`}>{opt}</button>)}</div>
            {result && (
              <div className="mt-4">
                <p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `这是${item.type}`}</p>
                {result === 'correct' && (
                  <button onClick={() => setSingPhase(true)} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">
                    <Mic className="w-4 h-4 inline mr-1" />唱出根音
                  </button>
                )}
                {result === 'wrong' && <button onClick={handleNext} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>}
              </div>
            )}
          </>
        )}

        {/* Phase 2: Sing the root note */}
        {singPhase && (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">唱出这个和弦的根音 ({nn(item.root)})</p>
            <button onClick={() => playNote(item.root)} className="flex items-center gap-2 mx-auto px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))] mb-4"><Volume2 className="w-4 h-4" />听根音</button>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && (
              <div>
                <p className="text-xl font-bold">{check.pitch.pitchData.note} <span className="text-sm text-[hsl(var(--text-tertiary))]">({solf(check.pitch.pitchData.note)})</span></p>
                <p className={`text-sm ${check.isGreen ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                  {check.pitch.pitchData.cents > 0 ? '+' : ''}{check.pitch.pitchData.cents}¢ {check.isGreen ? '✓' : ''}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={check.startSinging} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">开始唱</button>
              <button onClick={() => { check.cancelSinging(); setSingPhase(false); }} className="px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))]">返回</button>
            </div>
            {check.phase === 'result' && check.result === 'correct' && (
              <div className="mt-3">
                <p className="text-green-600 text-sm font-medium">根音正确!</p>
                <button onClick={handleNext} className="mt-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>
              </div>
            )}
          </>
        )}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 6. KEY (Listen + Sing Tonic) ============
function KeyExercise() {
  const { item, result, score, total, next, guess } = useQuizExercise(KEY_DATA, (item, ans) => ans === item.type);
  const [singPhase, setSingPhase] = useState(false);
  const check = useAccumulatedCheck(item.root, 25, 500);

  useEffect(() => { setSingPhase(false); }, [item]);

  useEffect(() => {
    if (check.phase === 'result' && singPhase) {
      setSingPhase(false);
    }
  }, [check.phase, singPhase]);

  const handleNext = () => {
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setSingPhase(false);
    next();
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {!singPhase && (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听旋律，判断是大调还是小调</p>
            <button onClick={() => playMelody(item.notes)} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Volume2 className="w-5 h-5" />播放旋律</button>
            {!result && <div className="bg-[hsl(var(--bg-deep))] rounded-lg p-3 mb-4"><p className="text-xs text-[hsl(var(--text-tertiary))]">仔细听旋律的色彩，选择你的判断</p></div>}
            <div className="flex gap-3 justify-center">{item.opts.map((opt: string) => <button key={opt} onClick={() => guess(opt)} className={`px-10 py-3 rounded-lg text-sm font-medium transition-colors ${result && opt === item.type ? 'bg-[hsla(150,60%,45%,0.12)] text-[hsl(150,55%,40%)] border border-green-500/30' : result && opt !== item.type ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)] border border-red-500/30' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]'}`}>{opt}</button>)}</div>
            {result && (
              <div className="mt-4">
                <p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `错误，这是${item.type}`}</p>
                {result === 'correct' && <button onClick={() => setSingPhase(true)} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600"><Mic className="w-4 h-4 inline mr-1" />唱出主音</button>}
                {result === 'wrong' && <button onClick={handleNext} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>}
                <p className="text-xs text-[hsl(var(--text-tertiary))] mt-2">{item.hint}</p>
              </div>
            )}
          </>
        )}
        {singPhase && (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">唱出这段旋律的主音 ({nn(item.root)})</p>
            <button onClick={() => playNote(item.root)} className="flex items-center gap-2 mx-auto px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))] mb-4"><Volume2 className="w-4 h-4" />听主音</button>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && (
              <div>
                <p className="text-xl font-bold">{check.pitch.pitchData.note} <span className="text-sm text-[hsl(var(--text-tertiary))]">({solf(check.pitch.pitchData.note)})</span></p>
                <p className={`text-sm ${check.isGreen ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                  {check.pitch.pitchData.cents > 0 ? '+' : ''}{check.pitch.pitchData.cents}¢ {check.isGreen ? '✓' : ''}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={check.startSinging} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">开始唱</button>
              <button onClick={() => { check.cancelSinging(); setSingPhase(false); }} className="px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))]">返回</button>
            </div>
            {check.phase === 'result' && check.result === 'correct' && (
              <div className="mt-3">
                <p className="text-green-600 text-sm font-medium">主音正确!</p>
                <button onClick={handleNext} className="mt-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>
              </div>
            )}
          </>
        )}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 7. RHYTHM ============
function RhythmExercise() {
  const { item, result, score, total, next, guess } = useQuizExercise(RHYTHM_DATA, (item, ans) => ans === item.name);
  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听节奏型，选择对应的节奏</p>
        <button onClick={() => playRhythm(item.pattern)} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Volume2 className="w-5 h-5" />播放节奏</button>
        <div className="space-y-2">
          {item.opts.map((opt: string) => {
            const optPattern = RHYTHM_DATA.find(r => r.name === opt)?.pattern || [];
            return <button key={opt} onClick={() => guess(opt)} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${result && opt === item.name ? 'bg-green-500/10 border-green-500/30' : result && opt !== item.name ? 'bg-red-500/10 border-red-500/30' : 'bg-[hsl(var(--bg-deep))] border-transparent hover:bg-[hsl(var(--bg))]'}`}><div className="flex-1 text-left"><span className={`text-sm ${result && opt === item.name ? 'text-green-600' : result && opt !== item.name ? 'text-red-500' : 'text-[hsl(var(--text-secondary))]'}`}>{opt}</span></div><div className="w-32"><RhythmVisual pattern={optPattern} /></div></button>;
          })}
        </div>
        {result && <div className="mt-4"><p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `这是${item.name}`}</p><button onClick={next} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
      </div>
    </div>
  );
}

// ============ 8. RHYTHM IMITATE ============
function RhythmImitate() {
  const [order, setOrder] = useState<number[]>(() => shuffleArray(RHYTHM_DATA.map((_, i) => i)));
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0); const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'listen' | 'tap' | 'result'>('idle');
  const [taps, setTaps] = useState<number[]>([]);
  const tapStartRef = useRef(0);

  const idx = order[current % order.length];
  const ex = RHYTHM_DATA[idx];

  const next = () => {
    const nextPos = current + 1;
    if (nextPos >= order.length) {
      setOrder(shuffleArray(RHYTHM_DATA.map((_, i) => i)));
      setCurrent(0);
    } else {
      setCurrent(nextPos);
    }
    setResult(null);
    setPhase('idle');
    setTaps([]);
  };

  const generate = () => { setResult(null); setPhase('listen'); setTaps([]); };
  const play = () => playRhythm(ex.pattern);
  const startTap = () => { setPhase('tap'); tapStartRef.current = Date.now(); setTaps([]); };
  const recordTap = () => { if (phase !== 'tap') return; setTaps(prev => [...prev, Date.now() - tapStartRef.current]); };
  const checkTap = () => {
    if (taps.length < 2) return;
    setTotal(t => t + 1);
    const expectedBeats = ex.pattern.length;
    const ok = Math.abs(taps.length - expectedBeats) <= 1;
    setResult(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
    setPhase('result');
  };

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {phase === 'idle' && <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>}
        {phase === 'listen' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听节奏，然后用"哒"模仿出来</p>
            <button onClick={play} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-4"><Volume2 className="w-5 h-5" />播放节奏</button>
            <button onClick={startTap} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始模仿</button>
          </div>
        )}
        {phase === 'tap' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">用哒模仿刚才的节奏（{ex.name}）</p>
            <button onMouseDown={recordTap} onTouchStart={recordTap}
              className="w-32 h-32 rounded-full bg-accent/15 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4 active:bg-accent/30 select-none touch-none">
              <span className="text-lg font-bold text-amber-600">哒</span>
            </button>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-2">点击次数: {taps.length}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={checkTap} className="px-4 py-2 bg-green-500/15 text-green-600 rounded-lg text-sm">提交</button>
              <button onClick={startTap} className="px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))]">重录</button>
            </div>
          </div>
        )}
        {phase === 'result' && (
          <div>
            {result === 'correct' ? <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-2" />}
            <p className={`text-lg font-bold ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '节奏准确!' : '节奏有偏差'}</p>
            <p className="text-sm text-[hsl(var(--text-tertiary))]">目标: {ex.name} · 你的点击: {taps.length}次</p>
            <button onClick={next} className="mt-4 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 9. TEMPO ============
function TempoExercise() {
  const [actualBpm, setActualBpm] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0); const [total, setTotal] = useState(0);

  const generate = () => {
    setResult(null);
    const bpm = [60, 72, 88, 100, 120][Math.floor(Math.random() * 5)];
    setActualBpm(bpm);
  };
  const play = () => playMetronome(actualBpm, 8);

  const guess = (bpm: number) => {
    if (result) return;
    setTotal(t => t + 1);
    const ok = Math.abs(bpm - actualBpm) <= 12;
    setResult(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
  };

  const bpmOptions = [60, 72, 88, 100, 120];

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {!actualBpm ? (
          <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>
        ) : (
          <>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听节拍器，判断BPM（每分钟拍数）</p>
            <button onClick={play} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Volume2 className="w-5 h-5" />播放节拍器</button>
            <div className="grid grid-cols-5 gap-2">
              {bpmOptions.map(bpm => (
                <button key={bpm} onClick={() => guess(bpm)} className={`py-3 rounded-lg text-sm font-medium transition-colors ${result && Math.abs(bpm - actualBpm) <= 12 ? 'bg-[hsla(150,60%,45%,0.12)] text-[hsl(150,55%,40%)] border border-green-500/30' : result && Math.abs(bpm - actualBpm) > 12 ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)] border border-red-500/30' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]'}`}>{bpm}</button>
              ))}
            </div>
            <p className="text-xs text-[hsl(var(--text-secondary))] mt-2">单位: 拍/分钟(BPM)</p>
            {result && <div className="mt-4"><p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `实际是${actualBpm}BPM`}</p><button onClick={() => { setResult(null); setActualBpm(0); }} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
          </>
        )}
      </div>
    </div>
  );
}

// ============ 10. SIGHT SING ============
function SightSingExercise() {
  const [order, setOrder] = useState<number[]>(() => shuffleArray(SIGHT_SING_DATA.map((_, i) => i)));
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'show' | 'sing' | 'result'>('idle');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const idx = order[current % order.length];
  const ex = SIGHT_SING_DATA[idx];

  const check = useAccumulatedCheck(ex.notes[0], 25, 500);

  const next = () => {
    const nextPos = current + 1;
    if (nextPos >= order.length) {
      setOrder(shuffleArray(SIGHT_SING_DATA.map((_, i) => i)));
      setCurrent(0);
    } else {
      setCurrent(nextPos);
    }
    setResult(null);
    check.setResult(null);
    check.setDetectedNote('');
    check.setPhase('idle');
    setPhase('idle');
  };

  const generate = () => { setResult(null); setPhase('show'); check.setPhase('idle'); };
  const play = () => playMelody(ex.notes, 0.5);
  const startSinging = () => { setPhase('sing'); check.startSinging(); };

  // Watch for accumulated check completion
  useEffect(() => {
    if (check.phase === 'result' && phase === 'sing') {
      setTotal(t => t + 1);
      if (check.result === 'correct') setScore(s => s + 1);
      setResult(check.result);
      setPhase('result');
    }
  }, [check.phase, check.result, phase]);

  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {phase === 'idle' && <button onClick={generate} className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">开始练习</button>}
        {phase === 'show' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">看简谱，唱出第一个音（先听标准音）</p>
            <div className="bg-[hsl(var(--bg-deep))] rounded-lg p-4 mb-4 inline-block">
              <div className="flex items-center gap-3 mb-2">
                {ex.jianpu.map((jp: string, i: number) => (
                  <div key={i} className="text-center">
                    <span className="text-2xl font-bold text-amber-600 font-mono">{jp}</span>
                    {i < ex.jianpu.length - 1 && <span className="text-[hsl(var(--text-secondary))] mx-1">-</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">{ex.name} · C大调</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={play} className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--bg-deep))] rounded-lg text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg))]"><Volume2 className="w-4 h-4" />播放参考</button>
              <button onClick={startSinging} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600"><Mic className="w-4 h-4" />开始视唱</button>
            </div>
          </div>
        )}
        {phase === 'sing' && (
          <div>
            <p className="text-sm text-[hsl(var(--text-tertiary))] mb-3">看着简谱唱出第一个音 ({nn(ex.notes[0])})...</p>
            <div className="bg-[hsl(var(--bg-deep))] rounded-lg p-3 mb-3 inline-block">
              <div className="flex items-center gap-2">
                {ex.jianpu.map((jp: string, i: number) => (
                  <div key={i} className="text-center">
                    <span className={`text-xl font-mono ${i === 0 ? 'text-amber-600 font-bold' : 'text-[hsl(var(--text-tertiary))]'}`}>{jp}</span>
                    {i < ex.jianpu.length - 1 && <span className="text-[hsl(var(--text-secondary))] mx-1">-</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${check.isGreen ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/10 border-red-500/30'}`}>
              <Mic className={`w-10 h-10 ${check.isGreen ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <GreenProgressBar percent={check.greenPercent} />
            {check.pitch.pitchData && <p className="text-xl font-bold">{check.pitch.pitchData.note}</p>}
            <button onClick={() => { check.cancelSinging(); setPhase('show'); }} className="mt-3 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">取消</button>
          </div>
        )}
        {phase === 'result' && <div>{result === 'correct' ? <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-2" />}<p className={`text-lg font-bold ${result === 'correct' ? 'text-green-600' : 'text-yellow-600'}`}>{result === 'correct' ? '很好!' : '继续努力'}</p><p className="text-sm text-[hsl(var(--text-tertiary))] mt-1">简谱: {ex.jianpu.join('-')}</p><button onClick={next} className="mt-4 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
      </div>
      {check.pitch.error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-2 mt-3 text-center">{check.pitch.error}</div>}
    </div>
  );
}

// ============ 11. TIME SIGNATURE ============
function TimeSignatureExercise() {
  const TIME_SIG_DATA = [
    { pattern: ['4n', '4n', '4n', '4n'], type: '4/4拍', opts: ['4/4拍', '3/4拍', '2/4拍', '6/8拍'] },
    { pattern: ['4n', '4n', '4n'], type: '3/4拍', opts: ['3/4拍', '4/4拍', '2/4拍', '6/8拍'] },
    { pattern: ['4n', '4n'], type: '2/4拍', opts: ['2/4拍', '3/4拍', '4/4拍', '6/8拍'] },
    { pattern: ['8n', '8n', '8n', '8n', '8n', '8n'], type: '6/8拍', opts: ['6/8拍', '3/4拍', '4/4拍', '2/4拍'] },
  ];
  const { item, result, score, total, next, guess } = useQuizExercise(TIME_SIG_DATA, (item, ans) => ans === item.type);
  return (
    <div className="max-w-xl mx-auto">
      <ScoreBar score={score} total={total} />
      <div className="neu rounded-2xl p-6 text-center" style={{ minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p className="text-sm text-[hsl(var(--text-tertiary))] mb-4">听节拍重音，判断是几几拍</p>
        <button onClick={() => playRhythm(item.pattern)} className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent/15 text-amber-600 rounded-lg hover:bg-accent/25 mb-6"><Volume2 className="w-5 h-5" />播放节奏</button>
        <div className="grid grid-cols-2 gap-2">
          {item.opts.map((opt: string) => (
            <button key={opt} onClick={() => guess(opt)} className={`py-3 rounded-lg text-sm font-medium transition-colors ${result && opt === item.type ? 'bg-[hsla(150,60%,45%,0.12)] text-[hsl(150,55%,40%)] border border-green-500/30' : result && opt !== item.type ? 'bg-[hsla(0,70%,55%,0.12)] text-[hsl(0,65%,50%)] border border-red-500/30' : 'bg-[hsl(var(--bg-deep))] text-[hsl(var(--text-secondary))] border-transparent hover:bg-[hsl(var(--bg))]'}`}>{opt}</button>
          ))}
        </div>
        {result && <div className="mt-4"><p className={`text-sm font-medium ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>{result === 'correct' ? '正确!' : `这是${item.type}`}</p><button onClick={next} className="mt-3 px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-amber-600">下一题</button></div>}
      </div>
    </div>
  );
}
