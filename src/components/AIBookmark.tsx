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
    { id: 'welcome', role: 'assistant', content: '你好！我是你的合唱AI助手。在任何页面都可以问我问题，比如"帮我调整训练计划"、"分析声部进度"等。', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ y: 50 }); // percentage from top
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const startPosY = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useAuth();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOpen) return;
    setDragging(true);
    dragStartY.current = e.clientY;
    startPosY.current = pos.y;
  }, [isOpen, pos.y]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isOpen) return;
    setDragging(true);
    dragStartY.current = e.touches[0].clientY;
    startPosY.current = pos.y;
  }, [isOpen, pos.y]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = clientY - dragStartY.current;
      const vhDelta = (delta / window.innerHeight) * 100;
      setPos({ y: Math.max(10, Math.min(85, startPosY.current + vhDelta)) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const responses = [
        '我来帮你分析一下...根据当前数据，建议增加女高音的周末练习量。',
        '这个计划看起来合理！不过周三女中的进度偏低，可能需要调整。',
        '已为你生成新的训练方案，可以在计划页面查看。',
        '从进度图看，周六的汇报准备需要加强，建议提前排练。',
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
          onClick={() => setIsOpen(true)}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className={`fixed right-0 z-50 w-12 h-32 rounded-l-2xl rounded-r-none flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:w-14 hover:scale-105 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            top: `${pos.y}%`,
            transform: 'translateY(-50%)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRight: 'none',
            boxShadow: '-6px 0 28px var(--accent-glow), inset 2px 0 8px rgba(255,255,255,0.15)',
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow), 0 0 20px var(--accent-soft)' }} />
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
          <div className="w-0.5 h-6 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)', opacity: 0.6 }} />
          <span className="text-[8px] font-black tracking-widest" style={{ color: 'var(--accent)', writingMode: 'vertical-rl' }}>AI</span>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 anim-fade" onClick={() => setIsOpen(false)}
          style={{ background: 'hsla(0,0%,0%,0.25)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[340px] max-w-[85vw] flex flex-col anim-slide-in"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(40px) saturate(160%)',
            WebkitBackdropFilter: 'blur(40px) saturate(160%)',
            borderLeft: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.08), inset 1px 0 2px rgba(255,255,255,0.9)',
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
                <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'hsl(var(--text-tertiary))' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />在线
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
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? '' : ''}`} style={{ background: msg.role === 'assistant' ? 'var(--accent-soft)' : 'hsl(var(--border))' }}>
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
                <p className="text-[10px] font-medium px-1" style={{ color: 'hsl(var(--text-tertiary))' }}>快速操作</p>
                {['帮我制定训练计划', '分析我最近的练习', '这个计划合理吗？'].map(text => (
                  <button key={text} onClick={() => setInput(text)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between"
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
