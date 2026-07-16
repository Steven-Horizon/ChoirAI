import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Bot, User, ChevronRight, Wand2, Paperclip } from 'lucide-react';
import { aiEvents } from '@/lib/ai-events';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

export default function AIBookmark() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState<'deepseek' | 'kimi'>('kimi');
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([]);
  const [error, setError] = useState('');

  // Drag state
  const [pos, setPos] = useState({ y: 50 });
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const startPosY = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('choirai_token') || '';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);
  useEffect(() => { const unsub = aiEvents.subscribe(() => setIsOpen(true)); return () => { unsub(); }; }, []);
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Load chat history when opening
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 ChoirAI 助手，已接入 DeepSeek 和 Kimi 大模型。我可以帮你分析排练数据、制定训练计划、解答音乐理论问题。试试问我吧！',
      timestamp: new Date(),
      model: 'system'
    }]);
  }, [isOpen]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isOpen) return;
    setDragging(true);
    dragStartY.current = e.clientY;
    startPosY.current = pos.y;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isOpen, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientY - dragStartY.current;
    const vhDelta = (delta / window.innerHeight) * 100;
    setPos({ y: Math.max(15, Math.min(85, startPosY.current + vhDelta)) });
  }, [dragging]);

  const onPointerUp = useCallback(() => { setDragging(false); }, []);

  const handleSend = async (msgText?: string) => {
    const text = (msgText || input).trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!msgText) setInput('');
    setIsTyping(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ message: text, forceModel: model }),
      });

      if (!res.ok) {
        if (res.status === 401) { setError('请先登录'); setIsTyping(false); return; }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || '抱歉，我暂时无法回答。请检查API配置或稍后重试。',
        timestamp: new Date(),
        model: data.model || model,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setAttachments([]);
    } catch (err: any) {
      setError(err.message || '请求失败，请检查网络');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { text: '分析当前进度', prompt: '请分析当前合唱团的排练进度数据，给出改进建议。' },
    { text: '生成训练方案', prompt: '请根据我的声部和水平，生成今日训练方案。' },
    { text: '周六汇报建议', prompt: '周六有汇报演出，请给出准备建议。' },
  ];

  return (
    <>
      {/* Bookmark - narrow, expand on hover/click */}
      {!isOpen && (
        <button
          onClick={() => { if (isExpanded) setIsOpen(true); else setIsExpanded(true); }}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`ai-bookmark fixed right-0 z-50 flex flex-col items-center justify-center gap-1.5 rounded-l-xl rounded-r-none transition-all duration-200 ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
          style={{
            top: `${pos.y}%`,
            transform: `translateY(-50%) scale(${isExpanded ? 1.25 : 1})`,
            width: isExpanded ? '40px' : '28px',
            height: isExpanded ? '60px' : '44px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 100%)',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRight: 'none',
            boxShadow: isExpanded ? '-6px 0 24px var(--accent-glow), inset 2px 0 6px rgba(255,255,255,0.5)' : '-3px 0 10px var(--accent-glow), inset 1px 0 3px rgba(255,255,255,0.4)',
            touchAction: 'none',
          }}
        >
          <Wand2 className={isExpanded ? "w-5 h-5" : "w-3.5 h-3.5"} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 4px var(--accent-glow))', transition: 'all 0.2s' }} />
          {isExpanded && <span className="text-[7px] font-black tracking-widest" style={{ color: 'var(--accent)', writingMode: 'vertical-rl' }}>AI</span>}
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 anim-fade" onClick={() => setIsOpen(false)}
          style={{ background: 'hsla(0,0%,0%,0.2)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-[90vw] flex flex-col anim-slide-in"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(40px) saturate(165%)',
            WebkitBackdropFilter: 'blur(40px) saturate(165%)',
            borderLeft: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '-12px 0 40px rgba(0,0,0,0.08), inset 2px 0 4px rgba(255,255,255,0.95)',
            borderRadius: '24px 0 0 24px',
          }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                <Sparkles className="w-4.5 h-4.5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--text))' }}>AI 助手</h3>
                <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'hsl(var(--text-tertiary))' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />已接入 DeepSeek + Kimi
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="neu w-8 h-8 rounded-lg flex items-center justify-center neu-hover">
              <X className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
            </button>
          </div>

          {/* Model Selector */}
          <div className="px-4 pt-3">
            <div className="flex gap-1 p-1" style={{ borderRadius: '12px', background: 'hsl(var(--bg-deep))' }}>
              <button onClick={() => setModel('deepseek')}
                className={`flex-1 text-center py-2 rounded-[10px] text-[11px] font-bold transition-all ${model === 'deepseek' ? 'text-white shadow-md' : 'text-[hsl(var(--text-tertiary))]'}`}
                style={model === 'deepseek' ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' } : {}}>
                DeepSeek
              </button>
              <button onClick={() => setModel('kimi')}
                className={`flex-1 text-center py-2 rounded-[10px] text-[11px] font-bold transition-all ${model === 'kimi' ? 'text-white shadow-md' : 'text-[hsl(var(--text-tertiary))]'}`}
                style={model === 'kimi' ? { background: 'linear-gradient(135deg, #4b5563, #374151)', color: '#fff', boxShadow: '0 2px 8px rgba(75,85,99,0.3)' } : {}}>
                Kimi
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-2 p-2.5 rounded-xl text-[11px] font-medium text-center" style={{ background: 'hsla(0,70%,55%,0.1)', color: 'hsl(0,65%,45%)' }}>
              {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center neu-sm"
                  style={{ background: msg.role === 'assistant' ? 'var(--accent-soft)' : 'hsl(var(--border))' }}>
                  {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5" style={{ color: 'hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) * 0.45))' }} /> : <User className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-tertiary))' }} />}
                </div>
                <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'assistant' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                  style={{ background: msg.role === 'assistant' ? 'hsl(var(--bg-deep))' : 'var(--accent-soft)', color: 'hsl(var(--text))' }}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.model && msg.model !== 'system' && (
                    <div className="text-[9px] mt-1 opacity-50" style={{ color: 'hsl(var(--text-tertiary))' }}>
                      {msg.model === 'deepseek' ? 'DeepSeek' : 'Kimi'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center neu-sm" style={{ background: 'var(--accent-soft)' }}>
                  <Bot className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) * 0.5))" }} />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'hsl(var(--bg-deep))' }}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {messages.length <= 1 && !isTyping && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold px-1" style={{ color: 'hsl(var(--text-tertiary))' }}>快速操作</p>
                {quickActions.map(item => (
                  <button key={item.text} onClick={() => handleSend(item.prompt)}
                    className="w-full text-left neu-sm p-3 flex items-center justify-between neu-sm-hover">
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{item.text}</span>
                    <ChevronRight className="w-3 h-3 opacity-40" style={{ color: 'hsl(var(--text-tertiary))' }} />
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - pb-20 on mobile to avoid bottom tab bar */}
          <div className="p-3 pb-28 md:pb-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-1.5 rounded-2xl px-3 py-2 neu-inset">
              <input type="file" id="ai-file-input" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setAttachments([{ name: f.name, type: f.type }]); setInput(prev => prev + (prev ? ' ' : '') + `[附件: ${f.name}]`); }
              }} />
              <button title="附件" onClick={() => document.getElementById('ai-file-input')?.click()} className="w-7 h-7 rounded-lg flex items-center justify-center neu-sm-hover shrink-0" style={{ color: 'hsl(var(--text-tertiary))' }}>
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              {attachments.length > 0 && (
                <button onClick={() => setAttachments([])} className="text-[9px] font-bold px-1.5 py-0.5 rounded neu-sm" style={{ color: 'var(--accent)' }}>
                  {attachments[0].name.slice(0, 8)}... <X className="w-2.5 h-2.5 inline" />
                </button>
              )}
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={`问 ${model === 'deepseek' ? 'DeepSeek' : 'Kimi'}...`}
                className="flex-1 bg-transparent text-sm md:text-sm focus:outline-none placeholder:text-neutral-400 py-1" style={{ color: 'hsl(var(--text))', fontSize: '16px' }} />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, var(--accent), hsla(var(--accent-h),var(--accent-s),calc(var(--accent-l) - 8%),1))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                <Send className="w-4 h-4" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
