import { useState, useRef, useEffect } from 'react';
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
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是你的合唱AI助手。在任何页面都可以问我问题，比如"这个计划合理吗"、"帮我调整训练计划"等。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useAuth(); // provides user context if needed later

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        '我理解你的想法。让我帮你分析一下当前的训练计划...',
        '根据你声部的情况，我建议可以适当增加音准练习的时间。',
        '好的，我可以帮你调整这个计划。你希望在哪些方面做出改变？',
        '这是一个很好的想法！让我为你生成一个新的训练方案。',
      ];
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get current page context for AI
  const pageContext = (() => {
    const path = window.location.hash.replace('#/', '/') || '/';
    if (path === '/') return '首页';
    if (path.includes('scores')) return '谱子库';
    if (path.includes('practice')) return '练习室';
    if (path.includes('hall')) return '排练厅';
    if (path.includes('voice')) return '声部管理';
    if (path.includes('plans')) return '训练计划';
    if (path.includes('warmup')) return '开声练习';
    if (path.includes('settings')) return '设置';
    return '当前页面';
  })();

  return (
    <>
      {/* Bookmark Tab - peeking from right edge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 ai-bookmark
                     w-10 h-24 rounded-l-2xl rounded-r-none
                     flex items-center justify-center
                     transition-all duration-300 ease-out
                     hover:w-12 hover:shadow-accent
                     animate-pulse-glow"
          style={{ animationDuration: '3s' }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <Bot className="w-5 h-5 text-accent" />
            <div className="w-0.5 h-6 rounded-full bg-gradient-to-b from-transparent via-[var(--accent-color)] to-transparent opacity-60" />
          </div>
          {/* Subtle edge glow */}
          <div
            className="absolute inset-y-0 left-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--accent-color), transparent)',
              opacity: 0.3,
            }}
          />
        </button>
      )}

      {/* Backdrop overlay with subtle distortion effect */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 animate-fade-in"
          onClick={() => setIsOpen(false)}
          style={{
            background: 'hsla(0,0%,0%,0.3)',
            backdropFilter: 'blur(2px) brightness(0.95)',
            WebkitBackdropFilter: 'blur(2px) brightness(0.95)',
          }}
        />
      )}

      {/* AI Panel */}
      {isOpen && (
        <div
          className="fixed right-0 top-0 bottom-0 z-50 w-[340px] max-w-[85vw]
                     liquid-glass-strong flex flex-col
                     animate-slide-in-right"
          style={{
            borderLeft: '1px solid hsla(0,0%,100%,0.08)',
            borderRadius: '24px 0 0 24px',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI 助手</h3>
                <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  在线 · {pageContext}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-neutral-500 hover:text-neutral-300 hover:bg-white/5
                         transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'assistant'
                      ? 'bg-accent-soft'
                      : 'bg-neutral-700/50'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Bot className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-neutral-800/60 text-neutral-200 rounded-tl-sm'
                      : 'bg-accent-soft text-neutral-100 rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-accent-soft">
                  <Bot className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="bg-neutral-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            {messages.length <= 2 && !isTyping && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] text-neutral-600 px-1">快速操作</p>
                {[
                  '帮我制定训练计划',
                  '分析我最近的练习',
                  '这个计划合理吗？',
                ].map((text) => (
                  <button
                    key={text}
                    onClick={() => { setInput(text); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs
                               bg-neutral-800/40 text-neutral-400
                               hover:bg-accent-soft hover:text-accent
                               transition-colors flex items-center justify-between"
                  >
                    {text}
                    <ChevronRight className="w-3 h-3 opacity-40" />
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-2 bg-neutral-800/60 rounded-2xl px-4 py-2.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="问我任何问题..."
                className="flex-1 bg-transparent text-sm placeholder:text-neutral-600
                           focus:outline-none text-neutral-200"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl flex items-center justify-center
                           bg-accent text-black
                           disabled:opacity-30 disabled:cursor-not-allowed
                           hover:brightness-110 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-neutral-700 text-center mt-2">
              AI 助手可以查看当前页面内容并提供建议
            </p>
          </div>
        </div>
      )}
    </>
  );
}
