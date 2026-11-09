import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  FileText,
  Folder,
  RotateCcw,
  CalendarClock,
  Laptop2,
  Smartphone,
  Pin,
  Bell,
  Palette,
} from 'lucide-react';
import {
  Note,
  FolderGroup,
  TabColor,
  ResourceShare,
  NoteResetMode,
  PinnedNotificationItem,
} from '../types/diary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeTextToClipboardSafe } from '../extensions/ClipboardExtension';
import { ColorPickerPopover } from './ColorPickerPopover';

interface ShareAndSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'sheet' | 'folder';
  note?: Note | null;
  group?: FolderGroup | null;
  groups?: FolderGroup[];
  allNotes?: Note[];
  notesInGroup?: Note[];
  shares: ResourceShare[];
  onUpdateShares: (updatedShares: ResourceShare[]) => void;
  onUpdateNote?: (patch: Partial<Note>) => void;
  onUpdateGroup?: (groupId: string, patch: Partial<FolderGroup>) => void;
  onResetNote?: (note: Note) => void;
  pinnedItems?: PinnedNotificationItem[];
  onUpdatePinnedItems?: (items: PinnedNotificationItem[]) => void;
  language?: string;
}

const R2_CONFIG = {
  accountId: '1de2c446943ed08e0c9ddf857b2d4ab2',
  bucketName: 'crosdiari',
  accessKeyId: 'af0216991a930efce80f0a866cb47fde',
  secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
};

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export const ShareAndSettingsModal: React.FC<ShareAndSettingsModalProps> = ({
  isOpen,
  onClose,
  targetType,
  note,
  group,
  groups = [],
  allNotes = [],
  notesInGroup = [],
  shares = [],
  onUpdateShares,
  onUpdateNote,
  onUpdateGroup,
  onResetNote,
  pinnedItems = [],
  onUpdatePinnedItems,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'reset'>('share');
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'read_write'>('read');
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(group?.id || groups[0]?.id || '');

  const isEnglish = (language === 'en') || (typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en');

  useEffect(() => {
    if (group?.id) {
      setSelectedFolderId(group.id);
    } else if (groups[0]?.id && !selectedFolderId) {
      setSelectedFolderId(groups[0].id);
    }
  }, [group?.id, groups, isOpen]);

  if (!isOpen) return null;

  const effectiveGroup =
    targetType === 'folder'
      ? groups.find((g) => g.id === selectedFolderId) || group || groups[0] || null
      : group;

  const effectiveNotesInGroup =
    targetType === 'folder' && effectiveGroup
      ? allNotes.length > 0
        ? allNotes.filter((n) => n.groupId === effectiveGroup.id)
        : notesInGroup
      : notesInGroup;

  const targetId = targetType === 'sheet' ? note?.id : effectiveGroup?.id;
  const targetTitle =
    targetType === 'sheet'
      ? note?.title || 'Hoja sin título'
      : effectiveGroup?.name || 'Carpeta';

  // Filter shares specifically belonging to this resource
  const relevantShares = shares.filter((s) => s.targetId === targetId);

  // Check if this sheet or folder is pinned in Quick Access Notification (max 3)
  const isCurrentlyPinned = Boolean(
    targetId && pinnedItems.some((item) => item.type === targetType && item.id === targetId)
  );

  const handleTogglePin = () => {
    if (!targetId || !onUpdatePinnedItems) return;
    if (isCurrentlyPinned) {
      onUpdatePinnedItems(
        pinnedItems.filter((item) => !(item.type === targetType && item.id === targetId))
      );
    } else {
      const next: PinnedNotificationItem[] = [
        ...pinnedItems.filter((item) => !(item.type === targetType && item.id === targetId)),
        { type: targetType, id: targetId },
      ].slice(-3); // Keep up to 3 pinned items
      onUpdatePinnedItems(next);
    }
  };

  const handleRemovePinnedItem = (itemToRemove: PinnedNotificationItem) => {
    if (!onUpdatePinnedItems) return;
    onUpdatePinnedItems(
      pinnedItems.filter(
        (item) => !(item.type === itemToRemove.type && item.id === itemToRemove.id)
      )
    );
  };

  const getPinnedItemLabel = (item: PinnedNotificationItem): string => {
    if (item.type === 'sheet') {
      const foundNote = allNotes.find((n) => n.id === item.id) || (note?.id === item.id ? note : null);
      return `📄 ${foundNote?.title || 'Hoja'}`;
    } else {
      const foundGrp = groups.find((g) => g.id === item.id) || (effectiveGroup?.id === item.id ? effectiveGroup : null);
      return `📁 ${foundGrp?.name || 'Carpeta'}`;
    }
  };

  const handleCreateShare = async () => {
    if (!targetId) return;

    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let randomCode = '';
    for (let i = 0; i < 6; i++) {
      randomCode += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    const code = `SH-${randomCode}`;
    const shareId = `sh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const accessibleSheetIds =
      targetType === 'sheet'
        ? [targetId]
        : effectiveNotesInGroup.map((n) => n.id);

    const newShare: ResourceShare = {
      id: shareId,
      code,
      targetType,
      targetId,
      targetName: targetTitle,
      permission: selectedPermission,
      createdAt: new Date().toISOString(),
      revoked: false,
      accessibleSheetIds,
      connectedDevices: [],
    };

    const nextShares = [newShare, ...shares];
    onUpdateShares(nextShares);

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: `shares/${code}.json`,
          Body: JSON.stringify(newShare),
          ContentType: 'application/json',
        })
      );
    } catch (e) {
      console.warn('Could not upload share descriptor to R2:', e);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    const updated = shares.map((s) => {
      if (s.id === shareId) {
        return { ...s, revoked: true };
      }
      return s;
    });
    onUpdateShares(updated);

    const revokedItem = updated.find((s) => s.id === shareId);
    if (revokedItem) {
      try {
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: `shares/${revokedItem.code}.json`,
            Body: JSON.stringify(revokedItem),
            ContentType: 'application/json',
          })
        );
      } catch {}
    }
  };

  const handleCopyLink = (share: ResourceShare) => {
    const shareUrl = `crossdiary://share/${share.code}`;
    writeTextToClipboardSafe(shareUrl);
    setCopiedShareId(share.id);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  const handleResetModeChange = (mode: NoteResetMode) => {
    if (!note || !onUpdateNote) return;
    onUpdateNote({
      resetMode: mode,
      lastResetDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleManualReset = () => {
    if (!note || !onResetNote) return;
    onResetNote(note);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-sm select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden max-h-[88vh] animate-scale-up"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold"
              style={{
                backgroundColor:
                  targetType === 'folder' && effectiveGroup?.color
                    ? effectiveGroup.color
                    : 'var(--bg-pill)',
                color:
                  targetType === 'folder' && effectiveGroup?.color
                    ? '#FFFFFF'
                    : 'var(--accent-fg)',
              }}
            >
              {targetType === 'sheet' ? <FileText size={16} /> : <Folder size={16} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black uppercase tracking-wider truncate">
                {targetType === 'sheet'
                  ? (isEnglish ? 'Sheet Settings' : 'Ajustes de Hoja')
                  : (isEnglish ? 'Folder Settings' : 'Ajustes de Carpeta')}
              </h2>
              <p className="text-[10px] opacity-75 font-mono truncate">
                {targetType === 'sheet' ? (isEnglish ? 'Sheet' : 'Hoja') : (isEnglish ? 'Folder' : 'Carpeta')}: {targetTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 transition-transform active:scale-90"
            title={isEnglish ? "Close window" : "Cerrar ventana"}
          >
            <X size={16} />
          </button>
        </div>

        {/* Folder Selector (When targetType === 'folder' and multiple folders exist) */}
        {targetType === 'folder' && groups.length > 0 && (
          <div
            className="px-4 py-2.5 border-b shrink-0 space-y-1.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-[9px] font-black uppercase tracking-wider opacity-70">
              {isEnglish ? 'Select the folder to configure or share:' : 'Selecciona la carpeta a configurar o compartir:'}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {groups.map((grp) => {
                const isSel = grp.id === effectiveGroup?.id;
                const count = allNotes.filter((n) => n.groupId === grp.id).length;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setSelectedFolderId(grp.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap border-2 flex items-center gap-1.5 transition-all shrink-0 ${
                      isSel ? 'scale-105 shadow-sm' : 'opacity-65 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isSel ? grp.color : 'var(--bg-surface)',
                      color: isSel ? '#FFFFFF' : 'var(--text-main)',
                      borderColor: grp.color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSel ? '#FFFFFF' : grp.color }}
                    />
                    <span>{grp.name}</span>
                    <span className="text-[8px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Switcher (Visible if target is sheet) */}
        {targetType === 'sheet' && (
          <div
            className="px-4 py-1.5 border-b flex items-center gap-2 shrink-0 text-xs font-bold uppercase"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'share' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'share' ? 'var(--bg-pill)' : 'transparent',
                color: activeTab === 'share' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <Share2 size={12} />
              <span>{isEnglish ? 'Share & Pin' : 'Compartir & Fijar'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reset')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'reset' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'reset' ? 'var(--bg-pill)' : 'transparent',
                color: activeTab === 'reset' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <CalendarClock size={12} />
              <span>{isEnglish ? 'Sheet Reset' : 'Reinicio de Hoja'}</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* PIN TO QUICK ACCESS NOTIFICATION (Available in both Sheet Settings and Folder Settings!) */}
          {onUpdatePinnedItems && (
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isCurrentlyPinned ? 'var(--accent)' : 'var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isCurrentlyPinned ? 'var(--bg-pill)' : 'var(--bg-card)',
                      color: isCurrentlyPinned ? 'var(--accent-fg)' : 'var(--accent)',
                    }}
                  >
                    <Bell size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase truncate">
                      {isEnglish ? `Quick Access in Notifications (${pinnedItems.length}/3)` : `Acceso Rápido en Notificaciones (${pinnedItems.length}/3)`}
                    </div>
                    <div className="text-[9px] opacity-70">
                      {isEnglish ? 'Pin up to 3 sheets or folders to open directly from your notification drawer' : 'Fija hasta 3 hojas o carpetas para abrirlas directo desde tu barra de notificaciones'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-sm border"
                  style={{
                    backgroundColor: isCurrentlyPinned ? '#10B981' : 'var(--bg-pill)',
                    color: isCurrentlyPinned ? '#FFFFFF' : 'var(--accent-fg)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <Pin size={11} />
                  <span>{isCurrentlyPinned ? (isEnglish ? 'Pinned ✓' : 'Fijado ✓') : (isEnglish ? 'Pin' : 'Fijar')}</span>
                </button>
              </div>

              {pinnedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-black/5">
                  {pinnedItems.map((item, idx) => (
                    <span
                      key={`${item.type}-${item.id}-${idx}`}
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <span className="truncate max-w-[130px]">{getPinnedItemLabel(item)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePinnedItem(item)}
                        className="opacity-60 hover:opacity-100 hover:text-red-500"
                        title={isEnglish ? "Unpin" : "Desfijar"}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COLOR CUSTOMIZATION (Available for both Sheet and Folder) */}
          <div
            className="p-3.5 rounded-2xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-sm"
                  style={{
                    backgroundColor:
                      targetType === 'sheet'
                        ? (note?.color || '#FF2E00')
                        : (effectiveGroup?.color || '#FF2E00'),
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Palette size={14} className="text-white drop-shadow" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase truncate">
                    {targetType === 'sheet'
                      ? (isEnglish ? 'Sheet Color' : 'Color de la Hoja')
                      : (isEnglish ? 'Folder Color' : 'Color de la Carpeta')}
                  </div>
                  <div className="text-[9px] opacity-70">
                    {targetType === 'sheet'
                      ? (isEnglish ? 'Select or customize the hue for this sheet' : 'Elige o personaliza el tono para esta hoja')
                      : (isEnglish ? 'Select or customize the color for this folder' : 'Elige o personaliza el color para esta carpeta')}
                  </div>
                </div>
              </div>

              <ColorPickerPopover
                color={
                  targetType === 'sheet'
                    ? (note?.color || '#FF2E00')
                    : (effectiveGroup?.color || '#FF2E00')
                }
                onChange={(hex) => {
                  if (targetType === 'sheet') {
                    if (onUpdateNote) onUpdateNote({ color: hex });
                  } else {
                    if (effectiveGroup && onUpdateGroup) {
                      onUpdateGroup(effectiveGroup.id, { color: hex as TabColor });
                    }
                  }
                }}
                mode="button-only"
                align="right"
              />
            </div>
          </div>

          {activeTab === 'reset' && targetType === 'sheet' && note ? (
            /* TAB: AUTO-RESET SETTINGS */
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1">
                  {isEnglish ? 'How often this sheet resets' : 'Cada cuánto se reinicia esta hoja'}
                </label>
                <p className="text-[10px] opacity-75 mb-3 leading-relaxed">
                  {isEnglish
                    ? 'Configure the interval to automatically uncheck todo checklists (- [ ]) and reset timers back to start.'
                    : 'Configura la periodicidad con la que se desmarcan automáticamente los checklists (- [ ]) y se reinician los temporizadores y cronómetros a su estado inicial.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: isEnglish ? 'No Reset' : 'Sin Reinicio', desc: isEnglish ? 'Always remains as is' : 'Permanece siempre como está' },
                    { id: 'daily', label: isEnglish ? 'Daily' : 'Diario', desc: isEnglish ? 'Resets every 24h at midnight' : 'Se reinicia cada 24h a medianoche' },
                    { id: 'weekly', label: isEnglish ? 'Weekly' : 'Semanal', desc: isEnglish ? 'Resets every Monday' : 'Se reinicia cada lunes' },
                    { id: 'monthly', label: isEnglish ? 'Monthly' : 'Mensual', desc: isEnglish ? 'Resets 1st of each month' : 'Se reinicia el 1° de cada mes' },
                    { id: 'manual', label: isEnglish ? 'Manual Only' : 'Solo Manual', desc: isEnglish ? 'Only resets on button click' : 'Se reinicia solo al pulsar el botón' },
                  ].map((opt) => {
                    const isSelected = (note.resetMode || 'manual') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleResetModeChange(opt.id as NoteResetMode)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${
                          isSelected ? 'shadow-md scale-[1.01]' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black uppercase">{opt.label}</span>
                          {isSelected && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--accent)' }}
                            />
                          )}
                        </div>
                        <p className="text-[9px] opacity-60 leading-tight">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instant Reset Action */}
              <div
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div>
                  <div className="text-[11px] font-black uppercase">{isEnglish ? 'Reset sheet now' : 'Reiniciar hoja ahora'}</div>
                  <div className="text-[9px] opacity-65">
                    {isEnglish ? 'Last recorded reset:' : 'Último reinicio registrado:'} {note.lastResetDate || (isEnglish ? 'Never' : 'Nunca')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualReset}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: resetSuccess ? '#10B981' : 'var(--bg-pill)',
                    color: '#FFFFFF',
                  }}
                >
                  <RotateCcw size={12} className={resetSuccess ? '' : 'transition-transform hover:rotate-180'} />
                  <span>{resetSuccess ? (isEnglish ? 'RESET!' : '¡REINICIADA!') : (isEnglish ? 'RESET NOW' : 'REINICIAR YA')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* TAB: SHARE SETTINGS */
            <div className="space-y-4">
              {/* Creator Box */}
              <div
                className="p-3.5 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                  <span>
                    {isEnglish
                      ? `Share ${targetType === 'sheet' ? 'this sheet' : `folder "${targetTitle}"`}`
                      : `Compartir ${targetType === 'sheet' ? 'esta hoja' : `carpeta "${targetTitle}"`}`}
                  </span>
                  <span className="text-[9px] opacity-60 font-mono">{isEnglish ? 'DIRECT + CLOUD' : 'LOCAL + NUBE'}</span>
                </div>

                {/* Permission selector */}
                <div>
                  <label className="text-[10px] font-bold opacity-75 uppercase block mb-1.5">
                    {isEnglish ? 'Guest Permissions' : 'Permisos de los invitados'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPermission('read')}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                        selectedPermission === 'read' ? 'border-[var(--accent)] font-black' : 'opacity-65'
                      }`}
                      style={{
                        backgroundColor: selectedPermission === 'read' ? 'var(--bg-card)' : 'transparent',
                        borderColor: selectedPermission === 'read' ? 'var(--accent)' : 'var(--border-color)',
                      }}
                    >
                      <Shield size={14} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div className="text-[10px] uppercase">{isEnglish ? 'Read Only' : 'Solo Lectura'}</div>
                        <div className="text-[8px] opacity-60">{isEnglish ? 'View only' : 'Solo pueden ver'}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPermission('read_write')}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                        selectedPermission === 'read_write' ? 'border-[var(--accent)] font-black' : 'opacity-65'
                      }`}
                      style={{
                        backgroundColor: selectedPermission === 'read_write' ? 'var(--bg-card)' : 'transparent',
                        borderColor: selectedPermission === 'read_write' ? 'var(--accent)' : 'var(--border-color)',
                      }}
                    >
                      <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div className="text-[10px] uppercase">{isEnglish ? 'Read & Write' : 'Lectura & Escritura'}</div>
                        <div className="text-[8px] opacity-60">{isEnglish ? 'Live collaboration' : 'Edición en vivo'}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Accessible sheets summary */}
                <div className="p-2 rounded-xl bg-black/5 text-[9px] font-mono flex items-center gap-1.5">
                  <span className="opacity-60">{isEnglish ? 'Accessible sheets:' : 'Hojas con acceso:'}</span>
                  <span className="font-bold">
                    {targetType === 'sheet'
                      ? (isEnglish ? `1 Sheet (${targetTitle})` : `1 Hoja (${targetTitle})`)
                      : (isEnglish
                          ? `${effectiveNotesInGroup.length} Sheets in folder ${targetTitle}`
                          : `${effectiveNotesInGroup.length} Hojas de la carpeta ${targetTitle}`)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCreateShare}
                  className="w-full py-2 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] shadow-md"
                  style={{ backgroundColor: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  <Share2 size={13} />
                  <span>{isEnglish ? 'Generate Share Link & Code' : 'Generar Enlace & Código Compartido'}</span>
                </button>
              </div>

              {/* Shares List */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-75">
                  {isEnglish ? `Created Links (${relevantShares.length})` : `Enlaces creados (${relevantShares.length})`}
                </div>

                {relevantShares.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed text-center text-xs opacity-50 font-bold uppercase">
                    {isEnglish ? 'You have not shared this resource with anyone yet' : 'Aún no has compartido este recurso con nadie'}
                  </div>
                ) : (
                  relevantShares.map((share) => {
                    const isCopied = copiedShareId === share.id;
                    return (
                      <div
                        key={share.id}
                        className={`p-3 rounded-2xl border-2 space-y-2.5 transition-all ${
                          share.revoked ? 'opacity-40 grayscale' : 'shadow-sm'
                        }`}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: share.revoked ? 'var(--border-color)' : 'var(--border-strong)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black"
                              style={{
                                backgroundColor: 'var(--bg-pill)',
                                color: 'var(--accent-fg)',
                              }}
                            >
                              {share.code}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border"
                              style={{
                                borderColor: 'var(--border-color)',
                                color: share.permission === 'read_write' ? '#10B981' : 'var(--text-main)',
                              }}
                            >
                              {share.permission === 'read_write'
                                ? (isEnglish ? 'Read & Write' : 'Lectura & Escritura')
                                : (isEnglish ? 'Read Only' : 'Solo Lectura')}
                            </span>
                            {share.revoked && (
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-red-500/20 text-red-500">
                                {isEnglish ? 'REVOKED' : 'REVOCADO'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {!share.revoked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(share)}
                                  className="px-2 py-1 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 transition-transform active:scale-95"
                                  style={{
                                    backgroundColor: isCopied ? '#10B981' : 'var(--bg-surface)',
                                    color: isCopied ? '#FFFFFF' : 'var(--text-main)',
                                    border: '1px solid var(--border-color)',
                                  }}
                                  title={isEnglish ? "Copy link" : "Copiar enlace"}
                                >
                                  {isCopied ? <Check size={10} /> : <Copy size={10} />}
                                  <span>{isCopied ? (isEnglish ? 'COPIED!' : '¡COPIADO!') : (isEnglish ? 'COPY' : 'COPIAR')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRevokeShare(share.id)}
                                  className="px-2 py-1 rounded-xl text-[9px] font-black uppercase text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
                                  title={isEnglish ? "Revoke access immediately" : "Revocar acceso inmediatamente"}
                                >
                                  {isEnglish ? 'REVOKE' : 'REVOCAR'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Accessible Sheets List */}
                        <div className="text-[9px] opacity-75">
                          <span className="font-bold">{isEnglish ? 'Accessible sheets: ' : 'Hojas accesibles: '}</span>
                          <span>
                            {targetType === 'sheet'
                              ? targetTitle
                              : `${share.accessibleSheetIds.length} ${isEnglish ? 'sheets in folder' : 'hojas de la carpeta'}`}
                          </span>
                        </div>

                        {/* Connected Devices */}
                        <div className="pt-2 border-t border-black/5 text-[9px] space-y-1">
                          <span className="font-bold opacity-65 uppercase tracking-wide block">
                            {isEnglish ? `Connected Devices (${share.connectedDevices?.length || 0})` : `Dispositivos conectados (${share.connectedDevices?.length || 0})`}
                          </span>

                          {!share.connectedDevices || share.connectedDevices.length === 0 ? (
                            <div className="opacity-50 italic">
                              {isEnglish ? 'No devices connected with this link yet.' : 'Ningún dispositivo se ha conectado todavía con este enlace.'}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {share.connectedDevices.map((dev) => (
                                <div
                                  key={dev.deviceId}
                                  className="flex items-center justify-between p-1.5 rounded-lg bg-black/5"
                                >
                                  <div className="flex items-center gap-1.5">
                                    {dev.platform === 'android' ? (
                                      <Smartphone size={11} />
                                    ) : (
                                      <Laptop2 size={11} />
                                    )}
                                    <span className="font-bold font-mono">
                                      {dev.deviceName || dev.deviceId}
                                    </span>
                                    {dev.ip && (
                                      <span className="opacity-50 font-mono text-[8px]">
                                        ({dev.ip})
                                      </span>
                                    )}
                                  </div>
                                  <span className="opacity-50 text-[8px]">
                                    {new Date(dev.connectedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
