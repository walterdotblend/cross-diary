import React, { useState } from 'react';
import {
  DiarySettings,
  ExtensionConfigMap,
  ThemeId,
  UserExtension,
} from '../types/diary';
import { QRCodeSVG } from 'qrcode.react';
import { AI_PROMPT_GUIDE } from '../extensions/SandboxExtension';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Palette,
  Sliders,
  Puzzle,
  Smartphone,
  Copy,
  Check,
  Download,
  Upload,
  Plus,
  Trash2,
  Bot,
  ShieldCheck,
  Code,
  Sparkles,
  MousePointer,
  Hand,
  Maximize2,
  Type,
  Layout,
  Sun,
  Cloud,
  RefreshCw,
  Shield,
  Camera,
  Laptop,
  Globe,
  Gamepad2,
  Smile,
  Folder,
  Wifi,
  Monitor,
} from 'lucide-react';
import { checkForAppUpdates, CURRENT_APP_VERSION, UpdateInfo } from '../utils/updater';
import { isTelemetryEnabled, setTelemetryEnabled } from '../utils/telemetry';
import { LANGUAGES, SupportedLang, AI_EXTENSION_PROMPT_GUIDE, AI_CSS_PROMPT_GUIDE, AI_CSS_PROMPT_GUIDE_ES } from '../utils/i18n';
import { PairingCodeInput } from './PairingCodeInput';
import { QRScannerModal } from './QRScannerModal';
import { LinkedDevice, getLinkedDevices, registerDeviceNetwork } from '../utils/deviceNetwork';
import { UninstallDiaryModal } from './UninstallDiaryModal';

interface IslandSettingsViewProps {
  onClose: () => void;
  pairingCode: string;
  diaryId?: string;
  settings: DiarySettings;
  onUpdateSettings: (newSettings: Partial<DiarySettings>) => void;
  onUpdateExtensionConfig: <K extends keyof ExtensionConfigMap>(
    key: K,
    newConfig: Partial<ExtensionConfigMap[K]>
  ) => void;
  onLinkRemoteCode: (code: string) => boolean | Promise<boolean>;
  extensions: UserExtension[];
  onToggleExtension: (id: string) => void;
  onSaveExtension: (ext: UserExtension) => void;
  onDeleteExtension: (id: string) => void;
  onReorderExtensions: (fromIndex: number, toIndex: number) => void;
  onResetDiary?: () => void;
}

const THEMES: {
  id: ThemeId;
  name: string;
  tag: string;
  colors: [string, string, string];
}[] = [
  {
    id: 'solar-flare',
    name: 'Vermilion Pulse // 01',
    tag: 'ALTO CONTRASTE',
    colors: ['#FFFFFF', '#FF2E00', '#0A0A0A'],
  },
  {
    id: 'milk-sakura',
    name: 'Mochi Cream & Berry',
    tag: 'KAWAII PASTEL',
    colors: ['#FFF5F9', '#FF5C93', '#4A152B'],
  },
  {
    id: 'velvet-nebula',
    name: 'Amethyst Horizon',
    tag: 'DARK DOT-MATRIX',
    colors: ['#11111B', '#CBA6F7', '#FAB387'],
  },
  {
    id: 'amber-oxide',
    name: 'Phosphor Oxide 84',
    tag: 'RETRO TERMINAL',
    colors: ['#1D2021', '#FE8019', '#FABD2F'],
  },
  {
    id: 'cyber-mirage',
    name: 'Acid Mirage',
    tag: 'NEÓN ELÉCTRICO',
    colors: ['#07090F', '#FF0055', '#00F0FF'],
  },
];

export const IslandSettingsView: React.FC<IslandSettingsViewProps> = ({
  onClose,
  pairingCode,
  diaryId = '',
  settings,
  onUpdateSettings,
  onLinkRemoteCode,
  extensions,
  onToggleExtension,
  onSaveExtension,
  onDeleteExtension,
  onReorderExtensions,
  onResetDiary,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'behavior' | 'extensions' | 'sync'>('themes');
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [copiedCssToast, setCopiedCssToast] = useState(false);
  const [copiedCssEnToast, setCopiedCssEnToast] = useState(false);
  const currentLang = settings.language || 'es';
  const t = LANGUAGES[currentLang] || LANGUAGES.es;
  const isEnglish = currentLang === 'en';
  const [availableDisplays, setAvailableDisplays] = useState<Array<{ id: string; index: number; label: string; isPrimary: boolean }>>([]);

  React.useEffect(() => {
    if (window.crossDiaryNative?.getDisplays) {
      window.crossDiaryNative.getDisplays().then((list: any[]) => {
        if (Array.isArray(list)) setAvailableDisplays(list);
      }).catch(() => {});
    }
  }, []);
  const tabs: Array<'themes' | 'behavior' | 'extensions' | 'sync'> = [
    'themes',
    'behavior',
    'extensions',
    'sync',
  ];
  const tabsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  // Auto-scroll the top tab ribbon inside its container whenever activeTab changes
  React.useEffect(() => {
    const el = tabButtonRefs.current[activeTab];
    const container = tabsContainerRef.current;
    if (el && container) {
      const targetLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [activeTab]);

  // Sync / Pairing states
  const [revealCode, setRevealCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remoteInput, setRemoteInput] = useState('');
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  // Updates & Telemetry states
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [telemetryActive, setTelemetryActive] = useState(isTelemetryEnabled());

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    const info = await checkForAppUpdates();
    setCheckingUpdate(false);
    setUpdateInfo(info);
  };

  const handleToggleTelemetry = (val: boolean) => {
    setTelemetryActive(val);
    setTelemetryEnabled(val);
  };

  // New Extension creator modal
  const [showNewExtModal, setShowNewExtModal] = useState(false);
  const [newExtName, setNewExtName] = useState('');
  const [newExtDesc, setNewExtDesc] = useState('');
  const [newExtCode, setNewExtCode] = useState('');
  const [copiedPromptGuide, setCopiedPromptGuide] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [deviceList, setDeviceList] = useState<LinkedDevice[]>([]);
  const [refreshingNet, setRefreshingNet] = useState(false);

  const loadDevices = async () => {
    if (!pairingCode) return;
    setRefreshingNet(true);
    try {
      const res = await registerDeviceNetwork(pairingCode);
      setDeviceList(res.allDevices);
    } catch {
      const dev = await getLinkedDevices(pairingCode);
      setDeviceList(dev);
    } finally {
      setRefreshingNet(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'sync') {
      loadDevices();
    }
  }, [activeTab, pairingCode]);

  const islandScale = settings.islandScale || 1.0;
  const deploymentTrigger = settings.deploymentTrigger || 'hover';

  const handleCopyCode = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pairingCode);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteInput.trim()) return;
    const ok = onLinkRemoteCode(remoteInput.trim());
    if (ok) {
      setLinkMsg('✓ ¡Diario vinculado correctamente!');
      setRemoteInput('');
    } else {
      setLinkMsg('Código incorrecto. Verifica los 8 caracteres.');
    }
  };

  const handleExportExtension = (ext: UserExtension) => {
    const jsonStr = JSON.stringify(ext, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ext.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.cross-ext.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportExtension = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.id && parsed.name) {
          parsed.id = 'ext-usr-' + Date.now();
          parsed.installed = true;
          parsed.enabled = true;
          onSaveExtension(parsed);
        }
      } catch {
        alert('Archivo de extensión no válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateCustomExt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtName.trim()) return;
    const custom: UserExtension = {
      id: 'ext-usr-' + Date.now(),
      name: newExtName.trim(),
      description: newExtDesc.trim() || 'Extensión creada por el usuario',
      version: '1.0.0',
      author: 'Usuario',
      icon: 'Sparkles',
      type: 'custom',
      target: 'external_dock',
      enabled: true,
      installed: true,
      code: newExtCode || 'container.innerHTML = "<div>Extensión lista</div>";',
    };
    onSaveExtension(custom);
    setShowNewExtModal(false);
    setNewExtName('');
    setNewExtDesc('');
    setNewExtCode('');
  };

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative z-10"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full border hover:scale-105 active:scale-95 transition-transform"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <ArrowLeft size={13} />
          </button>
          <span className="text-xs font-display-brutal uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            {t.generalSettings}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        ref={tabsContainerRef}
        onWheel={(e) => {
          if (tabsContainerRef.current) {
            tabsContainerRef.current.scrollLeft += (e.deltaY || e.deltaX);
          }
        }}
        className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border-color)] overflow-x-auto no-scrollbar shrink-0 cursor-pointer"
      >
        {[
          { id: 'themes' as const, label: t.tabThemes, icon: <Palette size={11} /> },
          { id: 'behavior' as const, label: t.tabBehavior, icon: <Sliders size={11} /> },
          { id: 'extensions' as const, label: t.tabExtensions, icon: <Puzzle size={11} /> },
          { id: 'sync' as const, label: t.tabSync, icon: <Smartphone size={11} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabButtonRefs.current[tab.id] = el;
            }}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === tab.id ? 'scale-105 shadow-sm' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-pill)' : 'var(--bg-card)',
              color: activeTab === tab.id ? 'var(--accent-fg)' : 'var(--text-main)',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {/* ================= TAB 1: ASPECTO, PROPORCIONES & PERSONALIZACIÓN ================= */}
        {activeTab === 'themes' && (
          <div className="space-y-4">
            {/* 1. ESCALA DE LA ISLA MANTENIENDO PROPORCIÓN */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Maximize2 size={13} style={{ color: 'var(--accent)' }} />
                  <span>{t.scaleTitle}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  {Math.round(islandScale * 100)}%
                </span>
              </div>
              <p className="text-[10px] opacity-70 leading-relaxed">
                {t.scaleDesc}
              </p>

              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={islandScale}
                onChange={(e) => onUpdateSettings({ islandScale: parseFloat(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: '85%', val: 0.85 },
                  { label: '100%', val: 1.0 },
                  { label: '115%', val: 1.15 },
                  { label: '130%', val: 1.3 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => onUpdateSettings({ islandScale: p.val })}
                    className={`py-1 rounded-xl text-[9px] font-bold border transition-transform ${
                      Math.abs(islandScale - p.val) < 0.02
                        ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 0. SELECTOR DE IDIOMA */}
            <div
              className="p-3.5 rounded-2xl border space-y-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Globe size={13} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'Language' : 'Idioma'}</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase opacity-75">
                  {currentLang.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {(Object.keys(LANGUAGES) as SupportedLang[]).map((lKey) => {
                  const item = LANGUAGES[lKey];
                  const isSel = currentLang === lKey;
                  return (
                    <button
                      key={lKey}
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem('cross_diary_language', lKey);
                          window.dispatchEvent(new CustomEvent('cross-diary-language-change', { detail: lKey }));
                        } catch {}
                        onUpdateSettings({ language: lKey });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        isSel
                          ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span>{item.flag}</span>
                      <span className="text-[10px] font-mono uppercase">{lKey}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 0.1 AVATAR O ICONO DEL DIARIO */}
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                <Smile size={13} style={{ color: 'var(--accent)' }} />
                <span>{t.avatarTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold overflow-hidden shadow-sm border-2"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)', borderColor: 'var(--border-strong)' }}
                >
                  {settings.userAvatar?.startsWith('data:image/') || settings.userAvatar?.startsWith('http') ? (
                    <img src={settings.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{settings.userAvatar || '⚡'}</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {['⚡', '🍓', '🔥', '🌸', '👾', '🐱', '💿', '✨'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onUpdateSettings({ userAvatar: emoji })}
                        className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center border transition-transform ${
                          settings.userAvatar === emoji ? 'scale-110 ring-2 ring-[var(--accent)]' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label
                      className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase border cursor-pointer hover:opacity-90 inline-flex items-center gap-1.5 transition-all shadow-sm"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
                    >
                      <Upload size={10} style={{ color: 'var(--accent)' }} />
                      <span>{t.uploadPng}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 1024 * 1024) {
                            alert(currentLang === 'es' ? 'La imagen debe ser menor a 1MB' : 'Image must be under 1MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              onUpdateSettings({ userAvatar: reader.result });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[8px] opacity-60">PNG &lt; 1MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 0.2 CSS PERSONALIZADO Y PROMPT IA */}
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Code size={13} style={{ color: 'var(--accent)' }} />
                  <span>{t.customCssTitle}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(isEnglish ? AI_CSS_PROMPT_GUIDE : AI_CSS_PROMPT_GUIDE_ES);
                      setCopiedCssToast(true);
                      setTimeout(() => setCopiedCssToast(false), 1800);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase border flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                    style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                    title={isEnglish ? "Copy AI prompt for custom CSS" : "Copiar prompt de IA para CSS personalizado"}
                  >
                    <Bot size={11} />
                    <span>{copiedCssToast ? t.copiedToast : (isEnglish ? 'AI Prompt' : 'Prompt IA')}</span>
                  </button>
                  {!isEnglish && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(AI_CSS_PROMPT_GUIDE);
                        setCopiedCssEnToast(true);
                        setTimeout(() => setCopiedCssEnToast(false), 1800);
                      }}
                      className="px-2 py-1 rounded-xl text-[9px] font-extrabold uppercase border flex items-center gap-1 transition-transform active:scale-95"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                      title="Copiar prompt en inglés para modelos de IA"
                    >
                      <span>{copiedCssEnToast ? '✓ EN' : 'Prompt EN'}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] opacity-75 leading-relaxed">{t.customCssDesc}</p>

              {/* Fragmentos Rápidos de CSS */}
              <div className="space-y-1">
                <div className="text-[9px] font-dot-matrix font-bold uppercase opacity-70">
                  {isEnglish ? 'Quick CSS Snippets:' : 'Fragmentos Rápidos de CSS:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: isEnglish ? 'Neon Rainbow' : 'Arcoíris Neón',
                      snippet: `/* ${isEnglish ? 'Custom Rainbow Sequence' : 'Secuencia Arcoíris Personalizada'} */\n[data-rainbow-index="0"] { --item-color: #FF0055 !important; }\n[data-rainbow-index="1"] { --item-color: #FF9900 !important; }\n[data-rainbow-index="2"] { --item-color: #00FFCC !important; }\n[data-rainbow-index="3"] { --item-color: #7928CA !important; }`,
                    },
                    {
                      label: isEnglish ? 'Brutalist Hard Shadow' : 'Sombras Brutalistas',
                      snippet: `/* ${isEnglish ? 'Brutalist Shadows' : 'Sombras Brutalistas'} */\n:root {\n  --pill-shadow: 4px 4px 0px #0A0A0A !important;\n  --card-radius: 14px !important;\n}`,
                    },
                    {
                      label: isEnglish ? 'Kawaii Soft Glow' : 'Brillo Kawaii',
                      snippet: `/* ${isEnglish ? 'Soft Pastel Glow' : 'Brillo Pastel y Bordes Redondeados'} */\n:root {\n  --card-radius: 28px !important;\n  --pill-shadow: 0 10px 25px rgba(255, 92, 147, 0.4) !important;\n}`,
                    },
                    {
                      label: isEnglish ? 'Tiling Zero Radius' : 'Bordes Tiling 0px',
                      snippet: `/* ${isEnglish ? 'Tiling Window Style' : 'Bordes Rectos Estilo Tiling'} */\n* {\n  border-radius: 0px !important;\n}`,
                    },
                  ].map((snip) => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() => {
                        const current = settings.customCss || '';
                        const next = current ? current + '\n\n' + snip.snippet : snip.snippet;
                        onUpdateSettings({ customCss: next });
                      }}
                      className="px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
                    >
                      <Sparkles size={9} style={{ color: 'var(--accent)' }} />
                      <span>{snip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={settings.customCss || ''}
                onChange={(e) => onUpdateSettings({ customCss: e.target.value })}
                placeholder={isEnglish ? "/* Custom CSS */\n:root {\n  --accent: #FF2E00;\n}" : "/* CSS personalizado */\n:root {\n  --accent: #FF2E00;\n}"}
                rows={4}
                className="w-full p-2.5 rounded-xl border text-[10px] font-mono leading-relaxed focus:outline-none resize-none"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              />
            </div>

            {/* 2. ESTÉTICAS Y TEMAS DE ALTO CONTRASTE & KAWAII */}
            <div className="space-y-2">
              <div className="text-[11px] font-dot-matrix font-extrabold uppercase tracking-wider opacity-75">
                Estéticas de Alto Contraste & Temas:
              </div>
              <div className="p-1 space-y-2.5">
                {THEMES.map((theme) => {
                  const isSelected = settings.theme === theme.id;
                  const loc = LANGUAGES[currentLang]?.themes[theme.id] || { name: theme.name, tag: theme.tag, desc: '' };
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdateSettings({ theme: theme.id })}
                      className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-main)] shadow-md'
                          : 'border-[var(--border-color)] opacity-70 hover:opacity-100 hover:border-[var(--accent)]'
                      }`}
                      style={{
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-display-brutal uppercase truncate">{loc.name}</div>
                        <div className="text-[9px] font-mono opacity-80 mt-0.5">{loc.tag}</div>
                        <div className="text-[9px] opacity-60 mt-0.5 leading-snug line-clamp-2">{loc.desc}</div>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/10 shrink-0">
                        {theme.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TIPOGRAFÍAS DE PERSONALIZACIÓN */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                <Type size={13} style={{ color: 'var(--accent)' }} />
                <span>Tipografía del Sistema</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'default', label: 'Estándar', sample: 'Aa' },
                  { id: 'brutalist', label: 'Brutal Display', sample: 'BRUTAL' },
                  { id: 'dot-matrix', label: 'Dot Matrix', sample: '1984' },
                  { id: 'serif', label: 'Editorial Serif', sample: 'Libro' },
                  { id: 'cyber-mono', label: 'Cyber Mono', sample: '0101' },
                  { id: 'kawaii-hand', label: 'Kawaii Hand', sample: '✿ cute' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: f.id as any })}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (settings.fontFamily || 'default') === f.id
                        ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)]'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{f.sample}</div>
                    <div className="text-[8px] opacity-70 uppercase truncate">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: COMPORTAMIENTO DE LA ISLA ================= */}
        {activeTab === 'behavior' && (
          <div className="space-y-4">
            {/* 1. MODO DE DESPLIEGUE (Hover en guía vs Clic en guía) */}
            <div
              className="p-3.5 rounded-2xl border space-y-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs font-black uppercase flex items-center gap-1.5">
                <MousePointer size={13} style={{ color: 'var(--accent)' }} />
                <span>{t.deploymentTitle}</span>
              </div>
              <p className="text-[10px] opacity-70 leading-relaxed">
                {t.deploymentDesc}
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ deploymentTrigger: 'hover' })}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    deploymentTrigger === 'hover'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                  }`}
                >
                  <MousePointer size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold uppercase">
                      {t.deploymentHover}
                    </div>
                    <div className="text-[9px] opacity-80 mt-0.5">
                      {t.deploymentHoverDesc}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ deploymentTrigger: 'click' })}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    deploymentTrigger === 'click'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                  }`}
                >
                  <Hand size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold uppercase">
                      {t.deploymentClick}
                    </div>
                    <div className="text-[9px] opacity-80 mt-0.5">
                      {t.deploymentClickDesc}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. BORDE DE LA PANTALLA */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs font-black uppercase flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layout size={13} style={{ color: 'var(--accent)' }} />
                  <span>{t.dockPositionTitle}</span>
                </div>
                <span className="text-[10px] font-bold opacity-60 uppercase font-mono">
                  {settings.dockPosition || 'right'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ dockPosition: 'top' })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    settings.dockPosition === 'top'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span>⬆️</span>
                  <span>{t.dockTop}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ dockPosition: 'bottom' })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    settings.dockPosition === 'bottom'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span>⬇️</span>
                  <span>{t.dockBottom}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ dockPosition: 'right' })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    (settings.dockPosition || 'right') === 'right'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span>➡️</span>
                  <span>{t.dockRight}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ dockPosition: 'left' })}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    settings.dockPosition === 'left'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]'
                  }`}
                >
                  <span>⬅️</span>
                  <span>{t.dockLeft}</span>
                </button>
              </div>
            </div>

            {/* 3. INICIAR AL ARRANCAR LA PC */}
            <div
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <div className="text-xs font-bold uppercase">{t.autostartTitle}</div>
                <div className="text-[9px] opacity-65">{t.autostartDesc}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autostart !== false}
                onChange={(e) => {
                  const val = e.target.checked;
                  onUpdateSettings({ autostart: val });
                  window.crossDiaryNative?.setAutostart?.(val);
                }}
                className="w-4 h-4 accent-[var(--accent)]"
              />
            </div>

            {/* 3.1 MONITOR DE VISUALIZACIÓN // MULTI-MONITOR DISPLAY TARGET */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Monitor size={14} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'Display Monitor' : 'Monitor de Visualización'}</span>
                </div>
                <span className="text-[9px] font-mono opacity-70">
                  {availableDisplays.length > 0 ? `${availableDisplays.length} ${isEnglish ? 'detected' : 'detectado(s)'}` : (isEnglish ? 'Default' : 'Principal')}
                </span>
              </div>

              <p className="text-[10px] opacity-75 leading-relaxed">
                {isEnglish
                  ? 'Choose on which monitor the Dynamic Island should appear, or display it across all monitors simultaneously.'
                  : 'Elige en qué pantalla debe situarse la Isla Dinámica, o muéstrala en todos los monitores a la vez si tienes múltiples pantallas.'}
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ targetMonitor: 'primary' });
                    window.crossDiaryNative?.setTargetMonitor?.('primary');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border transition-all text-left truncate ${
                    (!settings.targetMonitor || settings.targetMonitor === 'primary')
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-xs'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                  }`}
                >
                  🖥️ {isEnglish ? 'Primary Monitor' : 'Monitor Principal'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ targetMonitor: 'all' });
                    window.crossDiaryNative?.setTargetMonitor?.('all');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border transition-all text-left truncate ${
                    settings.targetMonitor === 'all'
                      ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-xs'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                  }`}
                >
                  🌐 {isEnglish ? 'All Monitors at Once' : 'En Todos a la Vez'}
                </button>
              </div>

              {availableDisplays.length > 1 && (
                <div className="pt-1.5 border-t border-[var(--border-color)] space-y-1">
                  <div className="text-[9px] font-bold uppercase opacity-65">
                    {isEnglish ? 'Select Specific Display:' : 'Elegir Pantalla Específica:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {availableDisplays.map((disp) => {
                      const isSelected = settings.targetMonitor === disp.id;
                      return (
                        <button
                          key={disp.id}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ targetMonitor: disp.id });
                            window.crossDiaryNative?.setTargetMonitor?.(disp.id);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between gap-1 ${
                            isSelected
                              ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)] shadow-xs'
                              : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className="truncate">{disp.label}</span>
                          {disp.isPrimary && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-black/10 font-mono">
                              PRI
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. MODO JUEGOS Y CONTROL FLOTANTE */}
            <div
              className="p-3.5 rounded-2xl border space-y-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                <Gamepad2 size={13} style={{ color: 'var(--accent)' }} />
                <span>{t.gameModeTitle}</span>
              </div>
              <p className="text-[10px] opacity-75 leading-relaxed">
                {t.gameModeDesc}
              </p>
              <div className="pt-1 flex items-center justify-between text-[9px] font-mono opacity-80 border-t border-[var(--border-color)]">
                <span>{t.gameModeShortcut}</span>
                <span className="px-2 py-0.5 rounded-md font-bold" style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}>
                  Ctrl + Alt + H
                </span>
              </div>
            </div>

            {/* 5. UBICACIÓN DE DATOS & BORRAR DIARIO */}
            <div
              className="p-3.5 rounded-2xl border space-y-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-red-500">
                <Trash2 size={13} />
                <span>{isEnglish ? 'Data Storage & Diary Deletion' : 'Ubicación de Datos y Borrado de Diario'}</span>
              </div>
              <div className="text-[10px] space-y-1 opacity-75 font-mono leading-relaxed bg-black/5 p-2 rounded-xl">
                <div>• <span className="font-bold">Windows PC:</span> %APPDATA%\cross-diary</div>
                <div>• <span className="font-bold">Android:</span> {isEnglish ? 'Settings > Apps > Cross-Diary > Clear data' : 'Ajustes > Aplicaciones > Cross-Diary > Borrar datos'}</div>
                <div>• <span className="font-bold">{isEnglish ? 'Cloud:' : 'Nube:'}</span> {isEnglish ? `Cloud backup & sync (code ${pairingCode})` : `Copia de seguridad en la nube (código ${pairingCode})`}</div>
              </div>

              {onResetDiary && (
                <div className="pt-1 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-red-500">{t.resetDiaryTitle}</div>
                    <div className="text-[9px] opacity-65">{t.resetDiaryDesc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUninstallModal(true)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-sm text-red-500 border-red-500/30 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>{isEnglish ? 'Delete Diary...' : 'Borrar Diario...'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* In-App Reset & 30-Day Cloud Deletion Modal */}
            <UninstallDiaryModal
              isOpen={showUninstallModal}
              onClose={() => setShowUninstallModal(false)}
              state={{
                isInitialized: true,
                diaryId: diaryId || 'local-diary',
                pairingCode,
                settings,
                groups: [],
                notes: [],
                vaultNotes: [],
                decoyNotes: [],
                globalStickers: [],
                clipboardHistory: [],
                selectedNoteId: null,
                selectedGroupId: '',
                activeExternalExtensionId: null,
                extensions,
              }}
              onResetComplete={() => {
                setShowUninstallModal(false);
                onResetDiary?.();
              }}
            />
          </div>
        )}

        {/* ================= TAB 3: GESTOR MODULAR DE EXTENSIONES ================= */}
        {activeTab === 'extensions' && (
          <div className="space-y-3">
            {/* AI Extension Prompt Guide Button */}
            <div className="p-3 rounded-2xl border flex items-center justify-between gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div>
                <div className="text-xs font-bold uppercase">{t.copyExtPrompt}</div>
                <div className="text-[9px] opacity-65">
                  {isEnglish
                    ? 'English prompt for ChatGPT, Claude or Gemini to program any widget'
                    : 'Prompt en inglés para que ChatGPT, Claude o Gemini programen cualquier widget'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(AI_EXTENSION_PROMPT_GUIDE);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 1800);
                }}
                className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase border flex items-center gap-1.5 shadow-sm"
                style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
              >
                <Bot size={11} />
                <span>{copiedToast ? t.copiedToast : (isEnglish ? 'AI Prompt' : 'Prompt IA')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase">{t.extensionsTitle} ({extensions.length})</div>
              <div className="flex items-center gap-1">
                <label
                  className="px-2 py-1 rounded-xl text-[9px] font-extrabold uppercase border cursor-pointer hover:bg-black/5 flex items-center gap-1"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  title={isEnglish ? "Import extension (.json)" : "Importar extensión (.json)"}
                >
                  <Upload size={10} />
                  <span>{t.importExt}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportExtension}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewExtModal(true)}
                  className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  <Plus size={10} />
                  <span>{isEnglish ? 'Create Extension' : 'Crear Extensión'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {extensions.map((ext, idx) => {
                const localizedName = isEnglish
                  ? ext.id === 'ext-music' ? 'PulseAudio // Equalizer & Audio Detect'
                  : ext.id === 'ext-clipboard' ? 'ClipBoard // Multi-device History'
                  : ext.id === 'ext-note-widgets' ? 'NoteBlocks // In-Sheet Widgets'
                  : ext.id === 'ext-chrono' ? 'ChronoTimer // Focus Stopwatch'
                  : ext.id === 'ext-calculator' ? 'CalcPro // Calculator'
                  : ext.id === 'ext-stickers' ? 'StickerCanvas // Free Stickers'
                  : ext.id === 'ext-vault' ? 'Vault // Passcode & Decoy'
                  : ext.name
                  : ext.name;

                const localizedDesc = isEnglish
                  ? ext.id === 'ext-music' ? 'Real-time audio visualizer with Windows audio session detection.'
                  : ext.id === 'ext-clipboard' ? 'Live cross-device clipboard sync with device name tagging.'
                  : ext.id === 'ext-note-widgets' ? 'Interactive clocks, timers, sketches, and checklists in your note.'
                  : ext.id === 'ext-chrono' ? 'Independent pomodoro focus timer with alarms and presets.'
                  : ext.id === 'ext-calculator' ? 'Scientific calculator with calculation history and in-sheet insertion.'
                  : ext.id === 'ext-stickers' ? 'Place stickers with 360° rotation, opacity, and position locking.'
                  : ext.id === 'ext-vault' ? 'Private notes protected by PIN with persistent timer and decoy mode.'
                  : ext.description
                  : ext.description;

                return (
                  <div
                    key={ext.id}
                    className="p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={ext.enabled}
                        onChange={() => onToggleExtension(ext.id)}
                        className="w-3.5 h-3.5 accent-[var(--accent)] shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold uppercase truncate">{localizedName}</div>
                        <div className="text-[9px] opacity-60 truncate">{localizedDesc}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onReorderExtensions(idx, idx - 1)}
                        className="p-1 rounded-lg border hover:bg-black/5 disabled:opacity-20"
                        style={{ borderColor: 'var(--border-color)' }}
                        title={isEnglish ? "Move up" : "Mover arriba"}
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === extensions.length - 1}
                        onClick={() => onReorderExtensions(idx, idx + 1)}
                        className="p-1 rounded-lg border hover:bg-black/5 disabled:opacity-20"
                        style={{ borderColor: 'var(--border-color)' }}
                        title={isEnglish ? "Move down" : "Mover abajo"}
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportExtension(ext)}
                        className="p-1 rounded-lg border hover:bg-black/5"
                        style={{ borderColor: 'var(--border-color)' }}
                        title={isEnglish ? "Export extension file (.json)" : "Exportar archivo de extensión (.json)"}
                      >
                        <Download size={11} />
                      </button>
                      {ext.type === 'custom' && (
                        <button
                          type="button"
                          onClick={() => onDeleteExtension(ext.id)}
                          className="p-1 rounded-lg opacity-40 hover:opacity-100 text-red-500"
                          title={isEnglish ? "Delete" : "Eliminar"}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 4: SINCRONIZACIÓN Y DISPOSITIVOS ================= */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border text-center space-y-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs font-black uppercase">{t.pairingTitle}</div>
              <p className="text-[10px] opacity-70">
                {t.pairingDesc}
              </p>

              <div className="flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto shadow-sm">
                <QRCodeSVG value={`crossdiary://${pairingCode}`} size={120} />
              </div>

              <div className="flex items-center justify-center gap-2">
                <div
                  className="px-4 py-2 rounded-xl border text-sm font-mono font-extrabold tracking-widest select-all"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-strong)' }}
                >
                  {revealCode ? pairingCode : '••••-••••'}
                </div>
                <button
                  type="button"
                  onClick={() => setRevealCode(!revealCode)}
                  className="px-2.5 py-2 rounded-xl border text-[9px] font-bold uppercase"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  {revealCode ? (isEnglish ? 'Hide' : 'Ocultar') : (isEnglish ? 'Reveal' : 'Revelar')}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl border hover:scale-105"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                  title={t.copyCode}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Link another diary form */}
            <form onSubmit={handleLinkSubmit} className="space-y-2.5">
              <label className="text-xs font-bold uppercase block text-center">{t.linkOtherTitle}</label>
              
              <PairingCodeInput
                value={remoteInput}
                onChange={setRemoteInput}
                onComplete={(code) => {
                  const ok = onLinkRemoteCode(code);
                  if (ok) {
                    setLinkMsg(isEnglish ? '✓ Diary linked successfully!' : '✓ ¡Diario vinculado correctamente!');
                    setRemoteInput('');
                  } else {
                    setLinkMsg(isEnglish ? 'Invalid or not found code.' : 'Código incorrecto o no encontrado.');
                  }
                }}
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <Camera size={13} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'Scan QR' : 'Escanear QR'}</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase transition-transform active:scale-95"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  {t.linkBtn}
                </button>
              </div>

              {linkMsg && (
                <div className="text-[10px] font-bold text-emerald-500 text-center">{linkMsg}</div>
              )}
            </form>

            {/* DISPOSITIVOS VINCULADOS A ESTE DIARIO */}
            <div
              className="p-3.5 rounded-2xl border space-y-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Wifi size={13} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'Linked Devices & Sync' : 'Dispositivos Vinculados & Sincronización'}</span>
                </div>
                <button
                  type="button"
                  onClick={loadDevices}
                  disabled={refreshingNet}
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase border flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                  title={isEnglish ? 'Check if your IP or linked device IPs changed' : 'Comprobar si cambió tu IP o la de tus dispositivos vinculados'}
                >
                  <RefreshCw size={9} className={refreshingNet ? 'animate-spin' : ''} />
                  <span>{refreshingNet ? (isEnglish ? 'Checking...' : 'Comprobando...') : (isEnglish ? 'Check IP' : 'Comprobar IP')}</span>
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {deviceList.length > 0 ? (
                  deviceList.map((dev) => (
                    <div
                      key={dev.deviceId}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                          style={{
                            background: dev.isThisDevice ? 'var(--bg-pill)' : 'var(--bg-surface)',
                            color: dev.isThisDevice ? 'var(--accent-fg)' : 'var(--text-main)',
                          }}
                        >
                          {dev.platform === 'windows' ? <Laptop size={14} /> : <Smartphone size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight truncate">
                            {dev.deviceName} {dev.isThisDevice && (isEnglish ? '(This device)' : '(Este equipo)')}
                          </div>
                          <div className="text-[9px] font-mono opacity-65 truncate">
                            LAN: {dev.localIp || '—'} | IP: {dev.publicIp || '—'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          dev.isThisDevice
                            ? 'text-emerald-500 bg-emerald-500/10'
                            : 'text-[var(--accent)] bg-black/5'
                        }`}
                      >
                        {dev.isThisDevice ? (isEnglish ? 'Online' : 'En Línea') : (isEnglish ? 'Connected' : 'Sincronizado')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl border text-center text-[10px] opacity-65 font-mono">
                    {isEnglish ? 'Detecting IPs and searching for linked devices...' : 'Detectando IPs y buscando dispositivos vinculados...'}
                  </div>
                )}
              </div>
            </div>

            {/* GESTIÓN DE DATOS & BORRAR DIARIO / DATOS LOCALES Y DE LA NUBE */}
            <div
              className="p-3.5 rounded-2xl border space-y-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-red-500">
                <Trash2 size={13} />
                <span>{isEnglish ? 'Delete Diary / Local & Cloud Data' : 'Borrar Diario / Datos Locales y de la Nube'}</span>
              </div>
              <p className="text-[10px] opacity-75 leading-relaxed">
                {isEnglish
                  ? 'Manage your local data files and cloud sync. You can reset local data or permanently delete your diary from the cloud.'
                  : 'Administra tus archivos locales y la sincronización. Puedes restablecer los datos locales o solicitar el borrado permanente de tu diario en la nube.'}
              </p>

              <div className="text-[10px] space-y-1 opacity-75 font-mono leading-relaxed bg-black/5 p-2 rounded-xl">
                <div>• <span className="font-bold">Windows PC:</span> %APPDATA%\cross-diary</div>
                <div>• <span className="font-bold">Android:</span> {isEnglish ? 'Settings > Apps > Cross-Diary > Clear data' : 'Ajustes > Aplicaciones > Cross-Diary > Borrar datos'}</div>
                <div>• <span className="font-bold">{isEnglish ? 'Cloud:' : 'Nube:'}</span> {isEnglish ? `Cloud backup (code ${pairingCode})` : `Copia en la nube (código ${pairingCode})`}</div>
              </div>

              {onResetDiary && (
                <div className="pt-1 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-red-500">
                      {isEnglish ? 'Erase Local or Cloud Diary' : 'Borrar Datos Locales o Nube'}
                    </div>
                    <div className="text-[9px] opacity-65">
                      {isEnglish
                        ? 'Select whether to clear local data only or schedule 30-day cloud deletion'
                        : 'Elige si deseas borrar solo los datos locales o programar el borrado en la nube'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUninstallModal(true)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-sm text-red-500 border-red-500/30 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>{isEnglish ? 'Delete Diary...' : 'Borrar Diario...'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera QR Scanner Modal */}
            <QRScannerModal
              isOpen={showQRScanner}
              onClose={() => setShowQRScanner(false)}
              onScanSuccess={(scannedCode) => {
                setRemoteInput(scannedCode);
                const ok = onLinkRemoteCode(scannedCode);
                if (ok) {
                  setLinkMsg(isEnglish ? '✓ Diary linked successfully with QR!' : '✓ ¡Diario vinculado correctamente con QR!');
                  setRemoteInput('');
                }
              }}
            />

            {/* Automatic Updates Section */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <RefreshCw size={13} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'System Updates' : 'Actualizaciones del Sistema'}</span>
                </div>
                <span className="text-[10px] font-mono font-bold opacity-75">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={checkingUpdate}
                className="w-full py-2 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all hover:opacity-85"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <RefreshCw size={12} className={checkingUpdate ? 'animate-spin' : ''} />
                <span>{checkingUpdate ? 'Buscando novedades...' : 'Buscar actualizaciones ahora'}</span>
              </button>

              {updateInfo && (
                <div
                  className="p-2.5 rounded-xl text-[10px] font-medium leading-relaxed"
                  style={{
                    background: updateInfo.hasUpdate ? 'var(--bg-pill)' : 'var(--bg-card)',
                    color: updateInfo.hasUpdate ? 'var(--accent-fg)' : 'var(--text-main)',
                  }}
                >
                  {updateInfo.hasUpdate ? (
                    <div className="space-y-1">
                      <div className="font-extrabold uppercase">¡Nueva versión {updateInfo.latestVersion} lista!</div>
                      <p>{updateInfo.releaseNotes}</p>
                      <button
                        type="button"
                        onClick={() => window.open(updateInfo.downloadUrl, '_blank')}
                        className="mt-1 px-3 py-1 rounded-lg bg-black text-white font-bold uppercase text-[9px]"
                      >
                        Descargar actualización
                      </button>
                    </div>
                  ) : (
                    <div>✓ Tienes instalada la versión más reciente (v{CURRENT_APP_VERSION}).</div>
                  )}
                </div>
              )}
            </div>

            {/* Anonymous Telemetry & Metrics Toggle */}
            <div
              className="p-3.5 rounded-2xl border space-y-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Shield size={13} style={{ color: 'var(--accent)' }} />
                  <span>Privacidad & Métricas Anónimas</span>
                </div>
                <input
                  type="checkbox"
                  checked={telemetryActive}
                  onChange={(e) => handleToggleTelemetry(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>
              <p className="text-[10px] opacity-75 leading-relaxed">
                Recopila datos anónimos de rendimiento (tiempo de inicio, plataforma y errores) sin almacenar ningún contenido de tus notas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva Extensión con Prompt para IA */}
      {showNewExtModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div
            className="w-full max-w-sm rounded-[24px] p-4 border space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <div className="text-xs font-black uppercase flex items-center gap-1.5">
                <Bot size={14} style={{ color: 'var(--accent)' }} />
                <span>Crear Nueva Extensión</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewExtModal(false)}
                className="text-xs font-bold opacity-60 hover:opacity-100"
              >
                Cerrar
              </button>
            </div>

            {/* AI Developer Prompt Copy Box */}
            <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase opacity-75">Guía para pedirle a una IA:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(AI_PROMPT_GUIDE);
                    setCopiedPromptGuide(true);
                    setTimeout(() => setCopiedPromptGuide(false), 1500);
                  }}
                  className="text-[9px] font-extrabold uppercase underline text-[var(--accent)]"
                >
                  {copiedPromptGuide ? '✓ Copiado' : 'Copiar Prompt'}
                </button>
              </div>
              <p className="text-[9px] opacity-60 font-mono leading-relaxed">
                Copia este prompt y pégaselo a ChatGPT, Claude o Gemini para que programe tu widget seguro.
              </p>
            </div>

            <form onSubmit={handleCreateCustomExt} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase opacity-70">Nombre:</label>
                <input
                  type="text"
                  value={newExtName}
                  onChange={(e) => setNewExtName(e.target.value)}
                  placeholder="Ej: Tirador de Dados // Rol"
                  required
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold focus:outline-none"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase opacity-70">Código JavaScript del Sandbox:</label>
                <textarea
                  value={newExtCode}
                  onChange={(e) => setNewExtCode(e.target.value)}
                  placeholder="container.innerHTML = '<div>Mi Widget</div>';"
                  rows={6}
                  className="w-full p-2 rounded-xl border text-[10px] font-mono focus:outline-none resize-none"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl text-xs font-black uppercase mt-1"
                style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
              >
                Instalar Extensión en la Isla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
