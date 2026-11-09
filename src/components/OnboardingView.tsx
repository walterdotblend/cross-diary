import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  KeyRound,
  ChevronLeft,
  Flame,
  Globe,
  Camera,
  Upload,
  Clock,
} from 'lucide-react';
import { ThemeId } from '../types/diary';
import { LANGUAGES, SupportedLang } from '../utils/i18n';
import { PairingCodeInput } from './PairingCodeInput';
import { QRScannerModal } from './QRScannerModal';

interface OnboardingViewProps {
  onCompleteNewDiary: (name: string, theme: ThemeId, icon: string, language?: SupportedLang) => void;
  onLinkExistingDiary: (code: string) => boolean | Promise<boolean>;
}

export const CREATIVE_THEMES: Array<{
  id: ThemeId;
  name: string;
  tag: string;
  bg: string;
  accent: string;
  text: string;
  desc: string;
}> = [
  {
    id: 'solar-flare',
    name: 'VERMILION PULSE // 01',
    tag: 'ALTO CONTRASTE',
    bg: '#FFFFFF',
    accent: '#FF2E00',
    text: '#0A0A0A',
    desc: 'Porcelana blanca, bermellón eléctrico #FF2E00 y tinta negra',
  },
  {
    id: 'milk-sakura',
    name: 'MOCHI CREAM & BERRY',
    tag: 'PASTEL KAWAII',
    bg: '#FFF5F9',
    accent: '#FF5C93',
    text: '#4A152B',
    desc: 'Crema de fresa suave, rosa cereza y bordes redondeados dulces',
  },
  {
    id: 'velvet-nebula',
    name: 'AMETHYST HORIZON',
    tag: 'OBSIDIANA',
    bg: '#11111B',
    accent: '#CBA6F7',
    text: '#CDD6F4',
    desc: 'Noche obsidiana profunda con acentos orquídea luminosos',
  },
  {
    id: 'amber-oxide',
    name: 'PHOSPHOR OXIDE 84',
    tag: 'RETRO LAB',
    bg: '#1D2021',
    accent: '#FE8019',
    text: '#EBDBB2',
    desc: 'Carbón cálido, ámbar fundido y sombras sólidas geométricas',
  },
  {
    id: 'cyber-mirage',
    name: 'ACID MIRAGE',
    tag: 'VOLT NEON',
    bg: '#07090F',
    accent: '#FF0055',
    text: '#00F0FF',
    desc: 'Carmesí láser y cian voltio sobre fondo abisal',
  },
];

const AVATAR_STAMPS = ['⚡', '🍓', '🔥', '🌸', '👾', '🐱', '💿', '✨'];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onCompleteNewDiary,
  onLinkExistingDiary,
}) => {
  const [lang, setLang] = useState<SupportedLang>('es');
  const [step, setStep] = useState<'welcome' | 'customize' | 'link'>('welcome');
  const [diaryName, setDiaryName] = useState('MI DIARIO');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('solar-flare');
  const [selectedIcon, setSelectedIcon] = useState('⚡');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const t = LANGUAGES[lang];

  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteNewDiary(diaryName.trim() || t.nameDefault, selectedTheme, selectedIcon, lang);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert(lang === 'es' ? 'La imagen debe ser menor a 1MB' : 'Image must be under 1MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedIcon(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLink = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = customCode || inputCode;
    const clean = targetCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.replace(/[^A-Z0-9]/g, '').length < 6) {
      setErrorMsg(lang === 'es' ? 'Introduce los 8 caracteres del código' : 'Enter the 8-character pairing code');
      return;
    }
    const ok = await onLinkExistingDiary(clean);
    if (!ok) {
      setErrorMsg(lang === 'es' ? 'No se encontró el diario o error de sincronización' : 'Diary not found or sync error');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-6 overflow-y-auto no-scrollbar dot-matrix-bg">
      {step === 'welcome' && (
        <div className="space-y-5 text-center animate-folder-unfold">
          {/* Language Selector Banner */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-full border mx-auto max-w-fit shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <span className="pl-1.5 pr-0.5 opacity-60"><Globe size={11} /></span>
            {(Object.keys(LANGUAGES) as SupportedLang[]).map((lKey) => {
              const item = LANGUAGES[lKey];
              const isSel = lang === lKey;
              return (
                <button
                  key={lKey}
                  type="button"
                  onClick={() => {
                    setLang(lKey);
                    setDiaryName(item.nameDefault);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all ${
                    isSel ? 'scale-105 shadow-sm' : 'opacity-65 hover:opacity-100'
                  }`}
                  style={{
                    background: isSel ? 'var(--bg-pill)' : 'transparent',
                    color: isSel ? 'var(--accent-fg)' : 'var(--text-main)',
                  }}
                >
                  <span>{item.flag}</span>
                  <span className="text-[9px]">{item.id.toUpperCase()}</span>
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-dot-matrix font-bold uppercase"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            <Flame size={13} />
            <span>CROSS-DIARY // 0.2</span>
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-3xl font-display-brutal uppercase tracking-tight leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {t.welcomeHeading}
            </h1>
            <p className="text-xs font-semibold opacity-75 max-w-xs mx-auto leading-relaxed pt-1">
              {t.welcomeSub}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => setStep('customize')}
              className="w-full py-3.5 px-5 rounded-full font-display-brutal text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
              style={{
                backgroundColor: 'var(--bg-pill)',
                color: 'var(--accent-fg)',
                boxShadow: 'var(--pill-shadow)',
              }}
            >
              <span>{t.btnCreate}</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={() => setStep('link')}
              className="w-full py-3.5 px-5 rounded-full font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                border: '2px solid var(--border-strong)',
              }}
            >
              <KeyRound size={14} />
              <span>{t.btnLink}</span>
            </button>
          </div>
        </div>
      )}

      {step === 'customize' && (
        <form onSubmit={handleCreate} className="space-y-4 animate-folder-unfold">
          <div
            className="flex items-center justify-between border-b-2 pb-2.5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              type="button"
              onClick={() => setStep('welcome')}
              className="text-xs font-extrabold uppercase flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>{lang === 'es' ? 'ATRÁS' : 'BACK'}</span>
            </button>
            <span className="text-xs font-display-brutal uppercase" style={{ color: 'var(--accent)' }}>
              {t.customizeTitle}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-dot-matrix font-bold uppercase tracking-wider opacity-75">
              {t.namePrompt}
            </label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 font-bold overflow-hidden"
                style={{
                  background: 'var(--bg-pill)',
                  color: 'var(--accent-fg)',
                }}
              >
                {selectedIcon.startsWith('data:image/') || selectedIcon.startsWith('http') ? (
                  <img src={selectedIcon} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedIcon}</span>
                )}
              </div>
              <input
                type="text"
                value={diaryName}
                onChange={(e) => setDiaryName(e.target.value)}
                placeholder={t.nameDefault}
                className="flex-1 px-3.5 py-2 rounded-2xl text-xs font-extrabold uppercase focus:outline-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--border-strong)',
                }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {AVATAR_STAMPS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setSelectedIcon(ic)}
                  className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-transform ${
                    selectedIcon === ic ? 'scale-125 ring-2 ring-[var(--accent)]' : 'opacity-65 hover:opacity-100'
                  }`}
                  style={{ background: 'var(--bg-surface)' }}
                >
                  {ic}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between">
              <label
                className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase border cursor-pointer hover:opacity-90 flex items-center gap-1.5 transition-all"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
              >
                <Upload size={10} style={{ color: 'var(--accent)' }} />
                <span>{t.uploadPng}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
              <span className="text-[8px] opacity-60">PNG / JPG &lt; 1MB</span>
            </div>
          </div>

          {/* Theme Carousel */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-dot-matrix font-bold uppercase tracking-wider opacity-75">
              {t.themePrompt}
            </label>
            <div className="p-1 space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {CREATIVE_THEMES.map((th) => {
                const active = selectedTheme === th.id;
                const loc = t.themes[th.id] || { name: th.name, desc: th.desc, tag: th.tag };
                return (
                  <div
                    key={th.id}
                    onClick={() => setSelectedTheme(th.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all border-2 flex items-center justify-between ${
                      active
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-1 shadow-md'
                        : 'border-[var(--border-color)] opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      background: th.bg,
                      color: th.text,
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-display-brutal uppercase leading-tight truncate">
                        {loc.name}
                      </div>
                      <div className="text-[9px] opacity-80 mt-0.5 leading-snug line-clamp-2">
                        {loc.desc}
                      </div>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full shrink-0 border shadow-sm"
                      style={{ background: th.accent, borderColor: th.text }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 30-DAY INACTIVITY NOTICE / AVISO DE EXPIRACIÓN POR INACTIVIDAD */}
          <div
            className="p-3 rounded-2xl border text-[10px] space-y-1 text-left"
            style={{
              background: 'rgba(255, 46, 0, 0.05)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              <Clock size={12} />
              <span>{lang === 'es' ? 'Aviso sobre tu diario' : 'Notice about your diary'}</span>
            </div>
            <p className="opacity-80 leading-relaxed">
              {lang === 'es'
                ? 'Si no utilizas este diario durante 30 días seguidos, se borrará automáticamente de la nube. Puedes mantenerlo activo o recuperarlo en cualquier momento con tu código de vinculación de 8 dígitos o entrando desde un dispositivo vinculado.'
                : 'If this diary has no activity for 30 consecutive days, it will be automatically deleted from the cloud. You can keep it active or restore it anytime using your 8-digit pairing code or by opening it on a linked device.'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-full font-display-brutal text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-pill)',
              color: 'var(--accent-fg)',
              boxShadow: 'var(--pill-shadow)',
            }}
          >
            <span>{t.btnStart}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      )}

      {step === 'link' && (
        <form onSubmit={(e) => handleLink(e)} className="space-y-4 animate-folder-unfold">
          <div
            className="flex items-center justify-between border-b-2 pb-2.5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              type="button"
              onClick={() => setStep('welcome')}
              className="text-xs font-extrabold uppercase flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>{lang === 'es' ? 'ATRÁS' : 'BACK'}</span>
            </button>
            <span className="text-xs font-display-brutal uppercase" style={{ color: 'var(--accent)' }}>
              {t.linkTitle}
            </span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed text-center">
            {t.linkPrompt}
          </p>

          <div className="space-y-3 pt-1">
            <PairingCodeInput
              value={inputCode}
              onChange={(val) => {
                setInputCode(val);
                setErrorMsg('');
              }}
              onComplete={(completedCode) => {
                handleLink(undefined, completedCode);
              }}
            />

            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            >
              <Camera size={14} style={{ color: 'var(--accent)' }} />
              <span>{isEnglish ? 'Scan QR Code with camera' : 'Escanear Código QR con la cámara'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="text-[10px] text-red-500 font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* 30-DAY INACTIVITY NOTICE / AVISO DE EXPIRACIÓN POR INACTIVIDAD */}
          <div
            className="p-3 rounded-2xl border text-[10px] space-y-1 text-left"
            style={{
              background: 'rgba(255, 46, 0, 0.05)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              <Clock size={12} />
              <span>{lang === 'es' ? 'Aviso sobre tu diario' : 'Notice about your diary'}</span>
            </div>
            <p className="opacity-80 leading-relaxed">
              {lang === 'es'
                ? 'Si no utilizas este diario durante 30 días seguidos, se borrará automáticamente de la nube. Puedes mantenerlo activo o recuperarlo en cualquier momento con tu código de vinculación de 8 dígitos o entrando desde un dispositivo vinculado.'
                : 'If this diary has no activity for 30 consecutive days, it will be automatically deleted from the cloud. You can keep it active or restore it anytime using your 8-digit pairing code or by opening it on a linked device.'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-full font-display-brutal text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
            style={{
              backgroundColor: 'var(--bg-pill)',
              color: 'var(--accent-fg)',
              boxShadow: 'var(--pill-shadow)',
            }}
          >
            <span>{t.linkBtn}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      )}

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={(scannedCode) => {
          setInputCode(scannedCode);
          handleLink(undefined, scannedCode);
        }}
      />
    </div>
  );
};
