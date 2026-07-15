import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initTheme } from '@/lib/theme';

// Light theme wrapper for all sub-pages
export default function PageWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className={`page relative z-10 ${className}`}>
      {children}
    </div>
  );
}

// Simple header for sub-pages
export function PageHeader({ title, backTo = '/' }: { title: string; backTo?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={() => navigate(backTo)}
        className="vtab-btn neu flex items-center justify-center"
        style={{ width: '36px', height: '36px', borderRadius: '12px' }}>
        <svg className="w-4 h-4" style={{ color: 'hsl(var(--text-secondary))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--text))' }}>{title}</h1>
    </div>
  );
}
