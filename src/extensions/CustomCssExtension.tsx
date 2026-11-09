import React, { useState, useEffect } from 'react';
import { ExtensionProps } from './types';
import { Code, Check, Sparkles, Copy, Bot } from 'lucide-react';
import { AI_CSS_PROMPT_GUIDE, AI_CSS_PROMPT_GUIDE_ES } from '../utils/i18n';

export const CustomCssExtension: React.FC<ExtensionProps> = ({ language }) => {
  const [currentLang, setCurrentLang] = useState(() =>
    language || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es')
  );

  useEffect(() => {
    if (language) setCurrentLang(language);
  }, [language]);

  useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const [cssCode, setCssCode] = useState(() => {
    return document.getElementById('custom-user-css')?.innerHTML || '';
  });
  const [applied, setApplied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleApplyCss = () => {
    let el = document.getElementById('custom-user-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'custom-user-css';
      document.head.appendChild(el);
    }
    el.innerHTML = cssCode;
    setApplied(true);
    setTimeout(() => setApplied(false), 1200);
  };

  const handleCopyPrompt = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(isEnglish ? AI_CSS_PROMPT_GUIDE : AI_CSS_PROMPT_GUIDE_ES);
    }
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1800);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <Code size={13} style={{ color: 'var(--accent)' }} />
          <span>{isEnglish ? 'Live CSS Editor' : 'Editor de CSS en Vivo'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border flex items-center gap-1"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
            title={isEnglish ? "Copy AI prompt for custom CSS" : "Copiar prompt de IA para CSS personalizado"}
          >
            {copiedPrompt ? <Check size={10} className="text-emerald-500" /> : <Bot size={10} style={{ color: 'var(--accent)' }} />}
            <span>{copiedPrompt ? (isEnglish ? 'Copied' : 'Copiado') : (isEnglish ? 'AI Prompt' : 'Prompt IA')}</span>
          </button>
          <button
            type="button"
            onClick={handleApplyCss}
            className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            {applied ? <Check size={10} /> : <Sparkles size={10} />}
            <span>{applied ? (isEnglish ? 'Applied' : 'Aplicado') : (isEnglish ? 'Inject' : 'Inyectar')}</span>
          </button>
        </div>
      </div>

      <textarea
        value={cssCode}
        onChange={(e) => setCssCode(e.target.value)}
        placeholder={isEnglish ? "/* Write custom CSS here */\n:root {\n  --accent: #FF2E00;\n}" : "/* Escribe CSS personalizado aquí */\n:root {\n  --accent: #FF2E00;\n}"}
        rows={8}
        className="w-full p-2.5 rounded-xl border text-[10px] font-mono leading-relaxed focus:outline-none resize-none"
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
      />
    </div>
  );
};
