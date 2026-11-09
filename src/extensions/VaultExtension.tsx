import React, { useState, useEffect } from 'react';
import { ExtensionProps } from './types';
import { Note } from '../types/diary';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Settings,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

export const VaultExtension: React.FC<ExtensionProps> = ({
  vaultNotes,
  decoyNotes,
  vaultMode,
  vaultSecondsLeft,
  onUnlockVault,
  onAddVaultNote,
  onSelectVaultNote,
  onDeleteVaultNote,
  onPanicLock,
  extensionConfigs,
  onUpdateExtensionConfig,
}) => {
  const [currentLang, setCurrentLang] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es'
  );

  useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const [pinInput, setPinInput] = useState('');
  const [vaultError, setVaultError] = useState(false);
  const [showVaultSettings, setShowVaultSettings] = useState(false);

  // First-time setup inputs
  const [setupPrimary, setSetupPrimary] = useState('');
  const [setupDecoy, setSetupDecoy] = useState('');

  // Settings verification inputs
  const [verifyCurrentPin, setVerifyCurrentPin] = useState('');
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [newPrimaryPin, setNewPrimaryPin] = useState('');
  const [newDecoyPin, setNewDecoyPin] = useState('');
  const [newAutoLockMin, setNewAutoLockMin] = useState(
    extensionConfigs.vault.autoLockMinutes || 3
  );

  const isConfigured =
    extensionConfigs.vault.isConfigured && !!extensionConfigs.vault.primaryPin;

  // Handle first-time setup
  const handleSaveInitialSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrimary = setupPrimary.replace(/\D/g, '');
    const cleanDecoy = setupDecoy.replace(/\D/g, '');
    if (cleanPrimary.length < 3) return;

    onUpdateExtensionConfig('vault', {
      isConfigured: true,
      primaryPin: cleanPrimary,
      alternativePin: cleanDecoy || '0000',
    });
    setSetupPrimary('');
    setSetupDecoy('');
    onUnlockVault('primary');
  };

  // Handle PIN digit press
  const handlePinDigit = (digit: string) => {
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setVaultError(false);

    const primaryKey = extensionConfigs.vault.primaryPin;
    const altKey = extensionConfigs.vault.alternativePin;

    if (primaryKey && nextPin === primaryKey) {
      onUnlockVault('primary');
      setPinInput('');
    } else if (altKey && nextPin === altKey) {
      onUnlockVault('decoy');
      setPinInput('');
    } else if (
      primaryKey &&
      nextPin.length >= Math.max(primaryKey.length, altKey?.length || 0) &&
      !primaryKey.startsWith(nextPin) &&
      (!altKey || !altKey.startsWith(nextPin))
    ) {
      setVaultError(true);
      setTimeout(() => setPinInput(''), 420);
    }
  };

  const handleVerifySettingsPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCurrentPin === extensionConfigs.vault.primaryPin) {
      setIsSettingsUnlocked(true);
      setNewPrimaryPin(extensionConfigs.vault.primaryPin);
      setNewDecoyPin(extensionConfigs.vault.alternativePin || '');
      setNewAutoLockMin(extensionConfigs.vault.autoLockMinutes || 3);
    } else {
      setVaultError(true);
    }
  };

  const handleSaveVaultSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrimary = newPrimaryPin.replace(/\D/g, '');
    const cleanDecoy = newDecoyPin.replace(/\D/g, '');
    if (cleanPrimary.length < 3) return;

    onUpdateExtensionConfig('vault', {
      primaryPin: cleanPrimary,
      alternativePin: cleanDecoy,
      autoLockMinutes: Number(newAutoLockMin) || 3,
    });
    setShowVaultSettings(false);
    setIsSettingsUnlocked(false);
    setVerifyCurrentPin('');
  };

  // 1. FIRST TIME SETUP VIEW
  if (!isConfigured) {
    return (
      <form onSubmit={handleSaveInitialSetup} className="space-y-3 p-1">
        <div className="flex items-center gap-2">
          <KeyRound size={16} style={{ color: 'var(--accent)' }} />
          <div className="text-xs font-black uppercase">
            {isEnglish ? 'Set Up Secret Vault' : 'Configurar Bóveda Secreta'}
          </div>
        </div>
        <p className="text-[10px] opacity-75">
          {isEnglish
            ? 'Choose a numeric PIN to protect your private notes. This PIN never leaves your PC.'
            : 'Elige una clave numérica para proteger tus notas privadas. Esta clave nunca sale de tu PC.'}
        </p>

        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase opacity-70">
            {isEnglish ? 'Primary PIN (Real Vault):' : 'Clave Principal (Acceso Real):'}
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={setupPrimary}
            onChange={(e) => setSetupPrimary(e.target.value.replace(/\D/g, ''))}
            placeholder={isEnglish ? "e.g. 123456" : "Ej: 123456"}
            maxLength={10}
            required
            className="w-full px-3 py-1.5 rounded-xl border text-sm font-mono tracking-widest focus:outline-none"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-strong)' }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase opacity-70">
            {isEnglish ? 'Alternative PIN (Optional Decoy):' : 'Clave Alternativa (Señuelo Opcional):'}
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={setupDecoy}
            onChange={(e) => setSetupDecoy(e.target.value.replace(/\D/g, ''))}
            placeholder={isEnglish ? "e.g. 9999 (shows fake notes)" : "Ej: 9999 (muestra notas falsas)"}
            maxLength={10}
            className="w-full px-3 py-1.5 rounded-xl border text-sm font-mono tracking-widest focus:outline-none"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
          />
        </div>

        <button
          type="submit"
          disabled={setupPrimary.length < 3}
          className="w-full py-2 rounded-xl text-xs font-black uppercase shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          style={{
            background: 'var(--bg-pill)',
            color: 'var(--accent-fg)',
            border: '1.5px solid var(--border-strong)',
          }}
        >
          {isEnglish ? 'Save & Lock Vault' : 'Guardar y Bloquear Bóveda'}
        </button>
      </form>
    );
  }

  // 2. INTERNAL SETTINGS MODAL (Requires Current Key!)
  if (showVaultSettings) {
    return (
      <div className="space-y-3 p-1">
        <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase">
            <Settings size={14} style={{ color: 'var(--accent)' }} />
            <span>{isEnglish ? 'Vault Settings' : 'Ajustes de Bóveda'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowVaultSettings(false);
              setIsSettingsUnlocked(false);
              setVerifyCurrentPin('');
            }}
            className="text-[10px] font-bold opacity-60 hover:opacity-100 uppercase"
          >
            {isEnglish ? 'Back' : 'Volver'}
          </button>
        </div>

        {!isSettingsUnlocked ? (
          <form onSubmit={handleVerifySettingsPin} className="space-y-2">
            <p className="text-[10px] opacity-75">
              {isEnglish
                ? 'Enter your current PIN to modify security settings:'
                : 'Introduce tu clave actual para modificar la configuración de seguridad:'}
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={verifyCurrentPin}
              onChange={(e) => {
                setVerifyCurrentPin(e.target.value.replace(/\D/g, ''));
                setVaultError(false);
              }}
              placeholder={isEnglish ? "Current PIN..." : "Clave actual..."}
              className="w-full px-3 py-1.5 rounded-xl border text-sm font-mono tracking-widest focus:outline-none"
              style={{
                background: 'var(--bg-main)',
                borderColor: vaultError ? '#FF0033' : 'var(--border-strong)',
              }}
            />
            {vaultError && (
              <div className="text-[9px] text-red-500 font-bold">
                {isEnglish ? 'Incorrect PIN' : 'Clave incorrecta'}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-1.5 rounded-xl text-xs font-black uppercase"
              style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
            >
              {isEnglish ? 'Verify' : 'Verificar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSaveVaultSettings} className="space-y-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase opacity-70">
                {isEnglish ? 'New Real PIN:' : 'Nueva Clave Real:'}
              </label>
              <input
                type="password"
                value={newPrimaryPin}
                onChange={(e) => setNewPrimaryPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-1 rounded-xl border text-sm font-mono focus:outline-none"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase opacity-70">
                {isEnglish ? 'New Decoy PIN:' : 'Nueva Clave Señuelo:'}
              </label>
              <input
                type="password"
                value={newDecoyPin}
                onChange={(e) => setNewDecoyPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-1 rounded-xl border text-sm font-mono focus:outline-none"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase opacity-70">
                {isEnglish ? 'Auto-lock (minutes):' : 'Autobloqueo (minutos):'}
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={newAutoLockMin}
                onChange={(e) => setNewAutoLockMin(Number(e.target.value))}
                className="w-full px-3 py-1 rounded-xl border text-sm font-mono focus:outline-none"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl text-xs font-black uppercase mt-2"
              style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
            >
              {isEnglish ? 'Save Changes' : 'Guardar Cambios'}
            </button>
          </form>
        )}
      </div>
    );
  }

  // 3. UNLOCKED VIEW
  if (vaultMode !== 'locked') {
    const isDecoy = vaultMode === 'decoy';
    const list = isDecoy ? decoyNotes : vaultNotes;
    const minsLeft = Math.floor(vaultSecondsLeft / 60);
    const secsLeft = vaultSecondsLeft % 60;

    return (
      <div className="space-y-3">
        {/* Unlocked status + Panic Button */}
        <div
          className="p-3 rounded-2xl border flex items-center justify-between gap-2"
          style={{
            background: isDecoy ? 'rgba(255,165,0,0.1)' : 'rgba(16,185,129,0.1)',
            borderColor: isDecoy ? '#FFA500' : '#10B981',
          }}
        >
          <div className="flex items-center gap-2">
            <Unlock size={16} className={isDecoy ? 'text-amber-500' : 'text-emerald-500'} />
            <div>
              <div className="text-[10px] font-dot-matrix font-extrabold uppercase">
                {isDecoy
                  ? (isEnglish ? 'DECOY VAULT' : 'BÓVEDA SEÑUELO')
                  : (isEnglish ? 'REAL VAULT // UNLOCKED' : 'BÓVEDA REAL // DESBLOQUEADA')}
              </div>
              <div className="text-[9px] opacity-75 font-mono">
                {isEnglish ? 'Locks in:' : 'Cierra en:'} {minsLeft}:{String(secsLeft).padStart(2, '0')} min
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowVaultSettings(true)}
              className="p-1.5 rounded-full border hover:bg-black/10"
              style={{ borderColor: 'var(--border-color)' }}
              title={isEnglish ? "Vault settings" : "Ajustes de Bóveda"}
            >
              <Settings size={12} />
            </button>
            <button
              type="button"
              onClick={onPanicLock}
              className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-600 text-white flex items-center gap-1 shadow-md hover:scale-105 active:scale-95"
              title={isEnglish ? "Panic Lock (Instant Hide)" : "Bloquear y ocultar inmediatamente"}
            >
              <ShieldAlert size={10} />
              <span>{isEnglish ? 'Lock' : 'Bloquear'}</span>
            </button>
          </div>
        </div>

        {/* Note List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between text-[9px] font-bold opacity-75 uppercase">
            <span>{isEnglish ? `Private Notes (${list.length})` : `Notas Privadas (${list.length})`}</span>
            <button
              type="button"
              onClick={() => onAddVaultNote(isDecoy)}
              className="flex items-center gap-1 font-extrabold text-[var(--accent)] hover:underline"
            >
              <Plus size={10} />
              <span>{isEnglish ? 'New Note' : 'Nueva Nota'}</span>
            </button>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-4 text-[10px] opacity-50 italic">
              {isEnglish ? 'No notes in this vault yet.' : 'No hay notas en esta bóveda todavía.'}
            </div>
          ) : (
            list.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectVaultNote(note)}
                className="flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer hover:border-[var(--accent)] transition-all"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <span>{note.icon || '🔐'}</span>
                  <span className="text-xs font-bold truncate">{note.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVaultNote(note.id, isDecoy);
                  }}
                  className="opacity-40 hover:opacity-100 text-red-500 p-1"
                  title={isEnglish ? "Delete" : "Eliminar"}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 4. LOCKED KEYPAD VIEW
  return (
    <div className="space-y-3">
      {/* Status Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <Lock size={13} style={{ color: 'var(--accent)' }} />
          <span>{isEnglish ? 'Vault Locked' : 'Bóveda Bloqueada'}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowVaultSettings(true)}
          className="text-[9px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1"
        >
          <Settings size={10} />
          <span>{isEnglish ? 'Settings' : 'Ajustes'}</span>
        </button>
      </div>

      {/* PIN Display */}
      <div
        className={`h-11 rounded-2xl border flex items-center justify-center gap-2 transition-all ${
          vaultError ? 'border-red-500 bg-red-500/10' : ''
        }`}
        style={{
          background: vaultError ? undefined : 'var(--bg-main)',
          borderColor: vaultError ? '#FF0033' : 'var(--border-strong)',
        }}
      >
        {pinInput.length === 0 ? (
          <span className="text-[10px] font-mono tracking-widest opacity-40 uppercase">
            {isEnglish ? 'Enter PIN...' : 'Introduce clave...'}
          </span>
        ) : (
          pinInput.split('').map((_, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          ))
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              if (k === 'C') setPinInput('');
              else if (k === '⌫') setPinInput((p) => p.slice(0, -1));
              else handlePinDigit(k);
            }}
            className={`h-10 rounded-xl font-mono text-sm font-bold border transition-transform active:scale-95 ${
              k === 'C' || k === '⌫'
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--accent)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};
