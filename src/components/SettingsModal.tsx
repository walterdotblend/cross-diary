import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Cloud,
  Power,
  Palette,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { DiarySettings, ExtensionConfigMap, ThemeId } from '../types/diary';
import { CREATIVE_THEMES } from './OnboardingView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingCode: string;
  settings: DiarySettings;
  onUpdateSettings: (newSettings: Partial<DiarySettings>) => void;
  onUpdateExtensionConfig: <K extends keyof ExtensionConfigMap>(
    key: K,
    newConfig: Partial<ExtensionConfigMap[K]>
  ) => void;
  onOpenCssCustomizer: () => void;
  onLinkRemoteCode: (code: string) => boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  pairingCode,
  settings,
  onUpdateSettings,
  onUpdateExtensionConfig,
  onOpenCssCustomizer,
  onLinkRemoteCode,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'vault' | 'devices' | 'system'>('themes');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectRemote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    const ok = onLinkRemoteCode(linkInput.trim().toUpperCase());
    if (ok) {
      setFeedbackMsg('¡Dispositivo vinculado! Extensiones y hojas sincronizadas.');
      setLinkInput('');
    } else {
      setFeedbackMsg('Código no válido');
    }
  };

  return (
    <div
      data-interactive="true"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
    >
      <div
        className="w-full max-w-[410px] max-h-[85vh] flex flex-col overflow-hidden animate-folder-unfold"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          borderRadius: 'var(--card-radius)',
          border: '3px solid var(--border-strong)',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.45), var(--pill-shadow)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b-2"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span
            className="text-xs font-display-brutal uppercase tracking-wider"
            style={{ color: 'var(--accent)' }}
          >
            AJUSTES // {settings.diaryName || 'DIARIO'}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation Pills */}
        <div
          className="px-3 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          {[
            { id: 'themes', label: 'Diseños' },
            { id: 'vault', label: 'Bóveda' },
            { id: 'devices', label: 'Vincular QR' },
            { id: 'system', label: 'Sistema & Drive' },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 transition-all"
                style={{
                  background: active ? 'var(--bg-pill)' : 'var(--bg-card)',
                  color: active ? 'var(--accent-fg)' : 'var(--text-main)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4 text-xs">
          {activeTab === 'themes' && (
            <div className="space-y-3">
              <div className="text-[10px] font-dot-matrix font-bold uppercase tracking-wider opacity-75">
                DISEÑOS ESTÉTICOS PREINSTALADOS:
              </div>

              <div className="space-y-2">
                {CREATIVE_THEMES.map((th) => {
                  const isSelected = settings.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => onUpdateSettings({ theme: th.id })}
                      className={`w-full p-3 rounded-2xl text-left flex items-center justify-between transition-all ${
                        isSelected ? 'scale-[1.01]' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        background: 'var(--bg-surface)',
                        border: `2.5px solid ${isSelected ? th.accent : 'var(--border-color)'}`,
                      }}
                    >
                      <div>
                        <div className="font-extrabold text-xs uppercase">{th.name}</div>
                        <div className="text-[10px] opacity-75">{th.desc}</div>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border-2 border-black/20"
                        style={{ backgroundColor: th.accent }}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onOpenCssCustomizer}
                className="w-full py-2.5 px-4 rounded-full font-extrabold text-xs uppercase flex items-center justify-center gap-2"
                style={{
                  background: 'var(--bg-pill)',
                  color: 'var(--accent-fg)',
                  boxShadow: 'var(--pill-shadow)',
                }}
              >
                <Palette size={14} />
                <span>EDITOR DE CSS PERSONALIZADO</span>
              </button>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-3">
              <div
                className="p-3.5 rounded-2xl space-y-3"
                style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-strong)' }}
              >
                <div
                  className="font-display-brutal text-xs uppercase flex items-center gap-1.5"
                  style={{ color: 'var(--accent)' }}
                >
                  <Lock size={13} />
                  <span>AJUSTES DE LA BÓVEDA</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">
                      Clave Principal (libre):
                    </label>
                    <input
                      type="text"
                      value={settings.extensionConfigs.vault.primaryPin}
                      onChange={(e) =>
                        onUpdateExtensionConfig('vault', {
                          primaryPin: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl font-dot-matrix font-extrabold text-center tracking-widest"
                      style={{ background: 'var(--bg-card)', border: '2px solid var(--border-strong)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">
                      Clave Alternativa (Señuelo):
                    </label>
                    <input
                      type="text"
                      value={settings.extensionConfigs.vault.alternativePin}
                      onChange={(e) =>
                        onUpdateExtensionConfig('vault', {
                          alternativePin: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl font-dot-matrix font-extrabold text-center tracking-widest"
                      style={{ background: 'var(--bg-card)', border: '2px solid var(--border-color)' }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-[11px]">Bloquear después de:</span>
                  <select
                    value={settings.extensionConfigs.vault.autoLockMinutes}
                    onChange={(e) =>
                      onUpdateExtensionConfig('vault', { autoLockMinutes: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-xl font-bold text-xs"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  >
                    <option value={1}>1 minuto</option>
                    <option value={3}>3 minutos</option>
                    <option value={5}>5 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-[11px]">Botón de Pánico en esquina:</span>
                  <input
                    type="checkbox"
                    checked={settings.extensionConfigs.vault.showPanicButton}
                    onChange={(e) =>
                      onUpdateExtensionConfig('vault', { showPanicButton: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#FF2E00]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-3">
              <div
                className="p-4 rounded-2xl flex flex-col items-center space-y-3"
                style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-color)' }}
              >
                <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-black">
                  <QRCodeSVG value={`crossdiary://pair?code=${pairingCode}`} size={130} level="M" />
                </div>

                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-full"
                  style={{ background: 'var(--bg-card)', border: '2px solid var(--border-strong)' }}
                >
                  <span className="font-dot-matrix font-extrabold tracking-widest text-sm">
                    {showCode ? pairingCode : '••••-••••'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="p-1 rounded-full hover:scale-110"
                      title="Mostrar / Ocultar código"
                    >
                      {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded-full hover:scale-110"
                      title="Copiar código"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleConnectRemote} className="space-y-2">
                <label className="text-[10px] font-dot-matrix font-bold uppercase block">
                  VINCULAR OTRO DISPOSITIVO:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="XK79-2B9A"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-full font-dot-matrix font-bold uppercase text-xs"
                    style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-strong)' }}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full font-extrabold text-xs uppercase"
                    style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                  >
                    VINCULAR
                  </button>
                </div>
                {feedbackMsg && <p className="text-[10px] font-bold text-emerald-500">{feedbackMsg}</p>}
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3">
              <div
                className="p-3.5 rounded-2xl flex items-center justify-between"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                <div>
                  <div className="font-extrabold uppercase text-xs flex items-center gap-1.5">
                    <Power size={13} style={{ color: 'var(--accent)' }} />
                    <span>Iniciar al encender la PC</span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    Mantiene la isla en el lateral al arrancar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autostart}
                  onChange={(e) => onUpdateSettings({ autostart: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
              </div>

              <div
                className="p-3.5 rounded-2xl flex items-center justify-between"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                <span className="font-extrabold uppercase text-xs">Lado en escritorio:</span>
                <select
                  value={settings.dockPosition}
                  onChange={(e) => onUpdateSettings({ dockPosition: e.target.value as any })}
                  className="px-3 py-1 rounded-full font-bold text-xs"
                  style={{ background: 'var(--bg-card)', border: '2px solid var(--border-strong)' }}
                >
                  <option value="top">Borde Superior (Isla / Notch)</option>
                  <option value="bottom">Borde Inferior (Dock)</option>
                  <option value="right">Borde Derecho (Lateral)</option>
                  <option value="left">Borde Izquierdo (Lateral)</option>
                </select>
              </div>

              <div
                className="p-3.5 rounded-2xl flex items-center justify-between gap-2"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                <div>
                  <div className="font-extrabold uppercase text-xs flex items-center gap-1.5">
                    <Cloud size={14} style={{ color: 'var(--accent)' }} />
                    <span>Google Drive</span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {settings.googleDriveLinked
                      ? `Conectado (${settings.googleDriveEmail})`
                      : 'Para respaldar imágenes y archivos'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      googleDriveLinked: !settings.googleDriveLinked,
                      googleDriveEmail: settings.googleDriveLinked ? undefined : 'usuario@gmail.com',
                    })
                  }
                  className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase shrink-0"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  {settings.googleDriveLinked ? 'DESCONECTAR' : 'CONECTAR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
