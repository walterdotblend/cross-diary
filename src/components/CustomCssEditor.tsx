import React, { useState } from 'react';
import { X, Code2, Sparkles, Check, Bot, Copy } from 'lucide-react';
import { AI_CSS_PROMPT_GUIDE, AI_CSS_PROMPT_GUIDE_ES } from '../utils/i18n';

interface CustomCssEditorProps {
  isOpen: boolean;
  onClose: () => void;
  css: string;
  onSaveCss: (newCss: string) => void;
}

const UNIXPORN_CSS_SNIPPETS = [
  {
    name: 'REBECCA BRUTALIST SHADOWS',
    code: `/* Sombras duras estilo Akira / Edgerunners */
:root {
  --pill-shadow: 5px 5px 0px #0A0A0A !important;
  --card-radius: 16px !important;
}`,
  },
  {
    name: 'KAWAII BUBBLY GLOW',
    code: `/* Brillo pastel suave y bordes ultra redondeados */
:root {
  --card-radius: 34px !important;
  --pill-shadow: 0 10px 25px rgba(255, 92, 147, 0.45) !important;
}`,
  },
  {
    name: 'BSPWM TILING ZERO-RADIUS',
    code: `/* Bordes cuadrados puros estilo ventana tiling r/unixporn */
* {
  border-radius: 0px !important;
}`,
  },
];

export const CustomCssEditor: React.FC<CustomCssEditorProps> = ({
  isOpen,
  onClose,
  css,
  onSaveCss,
}) => {
  const [code, setCode] = useState(css);
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const applyCode = (c: string) => {
    setCode(c);
    onSaveCss(c);
    const el = document.getElementById('custom-user-css');
    if (el) el.innerHTML = c;
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div
        className="w-full max-w-[430px] max-h-[85vh] flex flex-col overflow-hidden animate-folder-unfold"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          borderRadius: 'var(--card-radius)',
          border: '3px solid var(--border-strong)',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.4), var(--pill-shadow)',
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between border-b-2"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span
            className="text-xs font-display-brutal uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: 'var(--accent)' }}
          >
            <Code2 size={14} />
            <span>DOTFILES // EDITOR CSS EN VIVO</span>
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-dot-matrix font-bold uppercase opacity-75">
              GENERADOR DE CSS CON IA:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(AI_CSS_PROMPT_GUIDE_ES);
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 1800);
                  }
                }}
                className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1.5 transition-all shadow-sm"
                style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)', borderColor: 'var(--border-strong)' }}
              >
                <Bot size={11} />
                <span>Prompt IA (ES)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(AI_CSS_PROMPT_GUIDE);
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 1800);
                  }
                }}
                className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1 transition-all shadow-sm"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <span>Prompt EN</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-dot-matrix font-bold uppercase opacity-75">
              SNIPPETS RÁPIDOS DE R/UNIXPORN:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {UNIXPORN_CSS_SNIPPETS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => applyCode(s.code)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1"
                  style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-strong)' }}
                >
                  <Sparkles size={10} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={11}
            placeholder="/* Escribe tus reglas CSS personalizadas aquí */"
            className="w-full p-3 rounded-2xl font-mono text-xs focus:outline-none resize-none"
            style={{
              background: 'var(--bg-surface)',
              border: '2px solid var(--border-strong)',
              color: 'var(--text-main)',
            }}
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => applyCode('')}
              className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase border"
              style={{ borderColor: 'var(--border-color)' }}
            >
              LIMPIAR CSS
            </button>

            <button
              onClick={() => applyCode(code)}
              className="px-4 py-1.5 rounded-full text-xs font-display-brutal uppercase flex items-center gap-1.5"
              style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
            >
              {savedToast ? <Check size={13} /> : null}
              <span>{savedToast ? 'APLICADO' : 'APLICAR CSS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
