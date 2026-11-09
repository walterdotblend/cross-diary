import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  BookMarked, 
  QrCode, 
  KeyRound, 
  ArrowRight, 
  Check, 
  Smartphone, 
  Monitor, 
  Copy,
  Sparkles
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  pairingCode: string;
  onCreateNewDiary: () => void;
  onLinkExistingDiary: (code: string) => boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  pairingCode,
  onCreateNewDiary,
  onLinkExistingDiary,
}) => {
  const [mode, setMode] = useState<'welcome' | 'link_input' | 'show_qr'>('welcome');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Ingresa un código válido');
      return;
    }
    const success = onLinkExistingDiary(clean);
    if (!success) {
      setErrorMsg('Código no reconocido o expirado');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

        {/* Welcome Screen */}
        {mode === 'welcome' && (
          <div className="text-center space-y-6 py-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-accent shadow-sm">
              <BookMarked size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-text">
                Bienvenido a Cross-Diary
              </h2>
              <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                Tu libreta de notas ligera, sincronizada en tiempo real entre tu ordenador, móvil y tablet.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={onCreateNewDiary}
                className="w-full py-3 px-4 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-95 transition-all shadow-lg shadow-accent/25 flex items-center justify-center space-x-2"
              >
                <span>Crear nuevo diario</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => setMode('link_input')}
                className="w-full py-3 px-4 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-text border border-border text-xs font-medium transition-all flex items-center justify-center space-x-2"
              >
                <KeyRound size={14} className="text-text-muted" />
                <span>Vincular diario existente</span>
              </button>
            </div>

            <p className="text-[11px] text-text-muted/60">
              Cifrado local · Sincronización en la Nube & Multi-dispositivo
            </p>
          </div>
        )}

        {/* Link Diary Input Screen */}
        {mode === 'link_input' && (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">Vincular Diario</h3>
              <button
                onClick={() => setMode('welcome')}
                className="text-xs text-text-muted hover:text-text"
              >
                Volver
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Introduce el código de 8 caracteres alfanuméricos que aparece en tu otro dispositivo (ejemplo: en Ajustes &gt; Vincular).
            </p>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Ej: XK79-2B9A"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  className="w-full py-3 px-4 text-center tracking-widest font-mono text-lg uppercase bg-background border border-border rounded-xl text-text focus:outline-none focus:border-accent"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-[11px] text-red-400 mt-1.5 text-center">{errorMsg}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-medium hover:opacity-90 transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Sincronizar y Comenzar</span>
                <Check size={14} />
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-[10px] text-text-muted uppercase">o bien</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <button
              onClick={() => setMode('show_qr')}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-hover text-text border border-border text-xs flex items-center justify-center space-x-2 hover:bg-surface-hover/80"
            >
              <QrCode size={14} className="text-text-muted" />
              <span>Ver mi código QR para escanearlo</span>
            </button>
          </div>
        )}

        {/* Show QR / Code Screen */}
        {mode === 'show_qr' && (
          <div className="space-y-5 py-2 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">Escanear o Compartir</h3>
              <button
                onClick={() => setMode('link_input')}
                className="text-xs text-text-muted hover:text-text"
              >
                Volver
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
              <QRCodeSVG 
                value={`crossdiary://link?code=${pairingCode}`} 
                size={160}
                level="M"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-text-muted">Tu código de 8 caracteres:</span>
              <div 
                onClick={copyCode}
                className="flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-background border border-border cursor-pointer hover:border-accent group"
              >
                <span className="font-mono text-base font-bold tracking-widest text-text">
                  {pairingCode}
                </span>
                <span className="text-text-muted group-hover:text-accent">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </span>
              </div>
            </div>

            <button
              onClick={onCreateNewDiary}
              className="w-full py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-medium hover:opacity-90 transition-all"
            >
              Entrar al diario
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
