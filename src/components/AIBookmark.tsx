import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Bot, User, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIBookmark() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: '你好！我是你的合唱AI助手。根据你当前的页面，我可以给出针对性的建议和指导。', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ y: 50 });
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const startPosY = useRef(0);
  const bookmarkRef = useRef<HTMLButtonElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useAuth();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Drag handlers
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

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const responses = [
        '根据当前进度图分析，建议增加女高音周三的练习量，目前只有10%的进度。',
        '周六的汇报准备需要提前安排，建议周四周五加强排练。',
        '从数据看，男低音的进度最稳定，可以让他们协助带动其他声部。',
        '已为你生成新的训练方案，重点加强女中音的音准练习。',
      ];
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responses[Math.floor(Math.random() * responses.length)], timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <>
      {/* Draggable Bookmark */}
      {!isOpen && (
        <button
          ref={bookmarkRef}
          onClick={() => setIsOpen(true)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`fixed right-0 z-50 flex flex-col items-center justify-center gap-2 rounded-l-2xl rounded-r-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            top: `${pos.y}%`,
            transform: 'translateY(-50%)',
            width: '48px',
            height: '140px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRight: 'none',
            boxShadow: '-6px 0 28px var(--accent-glow), inset 2px 0 8px rgba(255,255,255,0.15)',
            touchAction: 'none',
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow), 0 0 20px var(--accent-soft)' }} />
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
          <div className="w-0.5 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)', opacity: 0.6 }} />
          <span className="text-[8px] font-black tracking-widest" style={{ color: 'var(--accent)', writingMode: 'vertical-rl' }}>AI</span>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 anim-fade" onClick={() => setIsOpen(false)}
          style={{ background: 'hsla(0,0%,0%,0.2)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[360px] max-w-[90vw] flex flex-col anim-slide-in"
          style={{
            background: 'rgba(255,255,255,0.78)',
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
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />在线 · 可针对当前页面提供建议
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5">
              <X className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: msg.role === 'assistant' ? 'var(--accent-soft)' : 'hsl(var(--border))' }}>
                  {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-accent" /> : <User className="w-3.5 h-3.5" style={{ color: 'hsl(var(--text-tertiary))' }} />}
                </div>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'assistant' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                  style={{ background: msg.role === 'assistant' ? 'hsl(var(--bg-deep))' : 'var(--accent-soft)', color: 'hsl(var(--text))' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}><Bot className="w-3.5 h-3.5 text-accent" /></div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'hsl(var(--bg-deep))' }}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'hsl(var(--text-tertiary))', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {messages.length <= 2 && !isTyping && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold px-1" style={{ color: 'hsl(var(--text-tertiary))' }}>快速操作</p>
                {['分析当前进度', '生成训练方案', '周六汇报建议'].map(text => (
                  <button key={text} onClick={() => setInput(text)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all hover:bg-black/5 flex items-center justify-between"
                    style={{ background: 'hsl(var(--bg-deep))', color: 'hsl(var(--text-secondary))' }}>
                    {text}<ChevronRight className="w-3 h-3 opacity-40" />
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: 'hsl(var(--bg-deep))' }}>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="问我任何问题..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-neutral-400" style={{ color: 'hsl(var(--text))' }} />
              <button onClick={handleSend} disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
