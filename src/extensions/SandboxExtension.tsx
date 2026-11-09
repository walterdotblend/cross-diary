import React, { useState, useRef, useEffect } from 'react';
import { ExtensionProps } from './types';
import { Bot, Copy, Check, ShieldCheck } from 'lucide-react';

import { AI_EXTENSION_PROMPT_GUIDE } from '../utils/i18n';

export const AI_PROMPT_GUIDE = AI_EXTENSION_PROMPT_GUIDE;

export const SandboxExtension: React.FC<ExtensionProps> = ({
  currentNote,
  onUpdateNote,
  allExtensions,
  language,
}) => {
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

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeSandboxExt = allExtensions.find(
    (e) => e.type === 'custom' && e.code
  );

  const handleCopyPrompt = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(AI_PROMPT_GUIDE);
    }
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeSandboxExt?.code) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 4px; font-family: sans-serif; background: transparent; color: #fff; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            const api = {
              insertText: (t) => window.parent.postMessage({ type: 'CD_INSERT_TEXT', text: t }, '*'),
              getStorage: (k) => localStorage.getItem('cd_ext_' + k),
              setStorage: (k, v) => localStorage.setItem('cd_ext_' + k, String(v))
            };
            const container = document.getElementById('root');
            try {
              ${activeSandboxExt.code}
            } catch (err) {
              container.innerHTML = '<div style="color:red;font-size:10px;">Error: ' + err.message + '</div>';
            }
          </script>
        </body>
      </html>
    `);
    doc.close();
  }, [activeSandboxExt?.code]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
          <span>{isEnglish ? 'Secure Sandbox' : 'Sandbox Seguro'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1"
          style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
        >
          {copiedPrompt ? <Check size={10} /> : <Copy size={10} />}
          <span>{copiedPrompt ? (isEnglish ? 'Copied' : 'Copiado') : (isEnglish ? 'Copy AI Prompt' : 'Copiar Prompt IA')}</span>
        </button>
      </div>

      {activeSandboxExt?.code ? (
        <iframe
          ref={iframeRef}
          title="Sandbox Extension"
          sandbox="allow-scripts"
          className="w-full h-48 rounded-xl border border-[var(--border-color)] bg-black/20"
        />
      ) : (
        <div className="p-3 rounded-xl border text-center space-y-1.5" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
          <Bot size={20} className="mx-auto" style={{ color: 'var(--accent)' }} />
          <div className="text-xs font-bold uppercase">
            {isEnglish ? 'Build Your Own Extension' : 'Crea tu propia Extensión'}
          </div>
          <p className="text-[10px] opacity-70">
            {isEnglish
              ? 'Copy the AI prompt above, ask any AI to write the custom widget code you want, and paste it in Extension Settings.'
              : 'Copia el prompt de arriba, pídele a una IA la extensión que desees y pégala en Ajustes de Extensiones.'}
          </p>
        </div>
      )}
    </div>
  );
};
