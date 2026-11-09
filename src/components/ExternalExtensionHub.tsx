import React, { useRef } from 'react';
import { UserExtension } from '../types/diary';
import { ExtensionProps } from '../extensions/types';
import { renderExtensionWidget, getExtensionIcon } from '../extensions/registry';
import { ErrorBoundary } from './ErrorBoundary';

export type VaultUnlockState = 'locked' | 'primary_unlocked' | 'decoy_unlocked';

export interface ExternalExtensionHubProps extends Omit<ExtensionProps, 'vaultMode' | 'onUnlockVault'> {
  activeExtension: UserExtension;
  vaultMode: VaultUnlockState;
  onUnlockVault: (mode: VaultUnlockState) => void;
}

export const ExternalExtensionHub: React.FC<ExternalExtensionHubProps> = (props) => {
  const { activeExtension, allExtensions, onSelectExtension } = props;
  const extMenuRef = useRef<HTMLDivElement>(null);
  const extBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const wheelCooldownRef = useRef<number>(0);

  const enabledExtensions = allExtensions.filter((e) => e.enabled && e.installed);

  const [currentLang, setCurrentLang] = React.useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es'
  );

  React.useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const getExtensionDisplayName = (ext: UserExtension) => {
    if (isEnglish) {
      if (ext.id === 'ext-vault') return 'Vault';
      if (ext.id === 'ext-note-widgets') return 'NoteBlocks';
      if (ext.id === 'ext-music') return 'PulseAudio';
      if (ext.id === 'ext-clipboard') return 'ClipBoard';
      if (ext.id === 'ext-chrono') return 'ChronoTimer';
      if (ext.id === 'ext-calculator') return 'CalcPro';
      if (ext.id === 'ext-stickers') return 'StickerCanvas';
    }
    return ext.name.split('//')[0].trim();
  };

  // Keep active extension tab smoothly scrolled into view inside its ribbon
  React.useEffect(() => {
    const el = activeExtension ? extBtnRefs.current[activeExtension.id] : null;
    const container = extMenuRef.current;
    if (el && container) {
      const targetLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [activeExtension?.id]);

  const handleWholeExtensionWheel = (e: React.WheelEvent) => {
    const rawTarget = e.target as Node | null;
    const target = (rawTarget?.nodeType === Node.ELEMENT_NODE ? rawTarget : rawTarget?.parentElement) as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return;
    if (target.closest('textarea, input, select')) return;

    // Check if user is scrolling inside an internal scrollable list with room to scroll
    const scrollable = target.closest('.overflow-y-auto, .overflow-auto') as HTMLElement | null;
    if (scrollable) {
      const isDown = e.deltaY > 0;
      const isUp = e.deltaY < 0;
      const canDown = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 2;
      const canUp = scrollable.scrollTop > 2;
      if ((isDown && canDown) || (isUp && canUp)) {
        return; // Allow list scrolling
      }
    }

    const rawDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (rawDelta === 0) return;

    const now = Date.now();
    if (now - wheelCooldownRef.current < 110) return;
    wheelCooldownRef.current = now;

    const currentIndex = enabledExtensions.findIndex((ext) => ext.id === activeExtension.id);
    if (currentIndex === -1) return;

    const direction = rawDelta > 0 ? 1 : -1;
    const nextIndex = (currentIndex + direction + enabledExtensions.length) % enabledExtensions.length;
    onSelectExtension(enabledExtensions[nextIndex].id);
  };

  // Convert vaultMode to internal extension format
  const normalizedVaultMode =
    props.vaultMode === 'primary_unlocked'
      ? ('primary' as const)
      : props.vaultMode === 'decoy_unlocked'
      ? ('decoy' as const)
      : ('locked' as const);

  const handleUnlockVault = (m: 'locked' | 'primary' | 'decoy') => {
    if (m === 'primary') props.onUnlockVault('primary_unlocked');
    else if (m === 'decoy') props.onUnlockVault('decoy_unlocked');
    else props.onUnlockVault('locked');
  };

  const extensionProps: ExtensionProps = {
    ...props,
    vaultMode: normalizedVaultMode,
    onUnlockVault: handleUnlockVault,
    language: currentLang,
  };

  return (
    <div
      data-interactive="true"
      onWheel={handleWholeExtensionWheel}
      className="w-full rounded-[24px] p-3.5 transition-all duration-200 relative overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '2.5px solid var(--border-strong)',
        boxShadow: 'var(--pill-shadow)',
      }}
    >
      {/* Top Extension Tabs (Wheel navigable) */}
      <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-[var(--border-color)]">
        <div
          ref={extMenuRef}
          onWheel={(e) => {
            e.stopPropagation();
            handleWholeExtensionWheel(e);
          }}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 scroll-smooth cursor-pointer"
        >
          {enabledExtensions.map((ext) => {
            const isSelected = ext.id === activeExtension.id;
            return (
              <button
                key={ext.id}
                type="button"
                ref={(el) => {
                  extBtnRefs.current[ext.id] = el;
                }}
                onClick={() => onSelectExtension(ext.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected ? 'scale-105 shadow-sm' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--bg-pill)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--accent-fg)' : 'var(--text-main)',
                }}
              >
                {getExtensionIcon(ext.type)}
                <span>{getExtensionDisplayName(ext)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render modular extension component with ErrorBoundary shield */}
      <div className="pt-0.5">
        <ErrorBoundary
          key={activeExtension?.id}
          language={currentLang}
          fallbackTitle={activeExtension ? getExtensionDisplayName(activeExtension) : (isEnglish ? 'Extension' : 'Extensión')}
        >
          {renderExtensionWidget(activeExtension, extensionProps)}
        </ErrorBoundary>
      </div>
    </div>
  );
};
