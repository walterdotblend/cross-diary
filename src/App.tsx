import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import {
  getInitialState,
  saveDiaryState,
  subscribeToCrossDeviceSync,
  createDefaultWelcomeWidgets,
} from './utils/storage';
import { playTimerAlarm } from './utils/sound';
import {
  scheduleR2Sync,
  r2DownloadDiary,
  r2CheckForRemoteUpdates,
  r2UploadDiary,
  mergeDiaryStates,
  subscribeR2Status,
  R2SyncStatus,
} from './utils/r2Sync';
import {
  startLiveSync,
  stopLiveSync,
  sendLiveNoteUpdate,
  sendLiveFullSync,
  subscribeLiveNoteUpdate,
  subscribeLiveFullSync,
  sendLiveClipboardUpdate,
  subscribeLiveClipboardUpdate,
} from './utils/liveSync';
import { registerDeviceNetwork, initDeviceDisplayName, getDeviceDisplayNameSync } from './utils/deviceNetwork';
import { recordMetric } from './utils/telemetry';
import { LANGUAGES, SupportedLang } from './utils/i18n';
import {
  DiaryState,
  Note,
  NoteSticker,
  FolderGroup,
  TabColor,
  UserExtension,
  DiarySettings,
  ExtensionConfigMap,
  ThemeId,
  ClipboardEntry,
  ResourceShare,
} from './types/diary';
import { DynamicIsland } from './components/DynamicIsland';
import { MobileDiaryApp } from './components/MobileDiaryApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getRainbowFolderColor, getRainbowSheetColor } from './utils/rainbowColors';

const THEME_ORDER: ThemeId[] = [
  'solar-flare',
  'milk-sakura',
  'velvet-nebula',
  'amber-oxide',
  'cyber-mirage',
];

export const App: React.FC = () => {
  const [diary, setDiary] = useState<DiaryState>(getInitialState);
  const [isIslandOpen, setIsIslandOpen] = useState(true);
  const [r2Status, setR2Status] = useState<R2SyncStatus>('idle');
  const [restoredNotification, setRestoredNotification] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth < 640
    );
  });
  const lastCapturedClipboardRef = useRef<string>('');

  useEffect(() => {
    const handleResize = () => {
      const mobile =
        Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.innerWidth < 640;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme, font & custom CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', diary.settings.theme);
    document.documentElement.setAttribute('data-font', diary.settings.fontFamily || 'default');
    let styleEl = document.getElementById('custom-user-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-user-css';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = diary.settings.customCss || '';
  }, [diary.settings.theme, diary.settings.fontFamily, diary.settings.customCss]);

  // Sync monitor target on desktop
  useEffect(() => {
    if (window.crossDiaryNative?.setTargetMonitor) {
      window.crossDiaryNative.setTargetMonitor(diary.settings.targetMonitor || 'primary');
    }
  }, [diary.settings.targetMonitor]);

  // Listen to open-island IPC (e.g. user opens desktop shortcut or tray)
  useEffect(() => {
    if (!window.crossDiaryNative?.onOpenIsland) return;
    return window.crossDiaryNative.onOpenIsland(() => {
      setIsIslandOpen(true);
    });
  }, []);

  const isIncomingRemoteUpdateRef = useRef(false);

  // Save state, broadcast across instances, and schedule Cloudflare R2 backup
  useEffect(() => {
    saveDiaryState(diary, true);
    if (isIncomingRemoteUpdateRef.current) {
      isIncomingRemoteUpdateRef.current = false;
      return;
    }
    if (diary.isInitialized) {
      scheduleR2Sync(diary);
    }
  }, [diary]);

  // Track Cloudflare R2 status and record telemetry
  useEffect(() => {
    recordMetric('session_start');
    initDeviceDisplayName().catch(() => {});
    return subscribeR2Status((status) => {
      setR2Status(status);
    });
  }, []);

  // Listen to cross-device sync
  useEffect(() => {
    return subscribeToCrossDeviceSync((remoteState) => {
      setDiary((prev) => mergeDiaryStates(prev, remoteState));
    });
  }, []);

  // Sync language changes across localStorage and all listening components
  useEffect(() => {
    if (diary.settings?.language) {
      try {
        const stored = localStorage.getItem('cross_diary_language');
        if (stored !== diary.settings.language) {
          localStorage.setItem('cross_diary_language', diary.settings.language);
          window.dispatchEvent(
            new CustomEvent('cross-diary-language-change', { detail: diary.settings.language })
          );
        }
      } catch {}
    }
  }, [diary.settings?.language]);

  // Listen for diary restoration from pending deletion
  useEffect(() => {
    const handleRestored = () => {
      const isEn = diary.settings?.language === 'en';
      setRestoredNotification(
        isEn
          ? '🎉 Welcome back! Your diary deletion request has been canceled and your data is safe.'
          : '🎉 ¡Bienvenido de vuelta! La solicitud de borrado de tu diario ha sido cancelada y tus datos están seguros.'
      );
      setTimeout(() => {
        setRestoredNotification(null);
      }, 7000);
    };
    window.addEventListener('diary-restored-from-deletion', handleRestored);
    return () => window.removeEventListener('diary-restored-from-deletion', handleRestored);
  }, [diary.settings?.language]);

  // Real-time Live P2P + WebSocket Sync + Cloudflare R2 Backup
  const diaryRef = useRef(diary);
  useEffect(() => {
    diaryRef.current = diary;
  }, [diary]);

  useEffect(() => {
    if (!diary.isInitialized || !diary.pairingCode) return;

    // 1. Register device network (IPs, port, platform)
    registerDeviceNetwork(diary.pairingCode).then(({ currentDevice, allDevices }) => {
      startLiveSync(diary.pairingCode, currentDevice, allDevices);
    }).catch(() => {
      startLiveSync(diary.pairingCode);
    });

    const writeIncomingTextToSystemClipboard = (text: string) => {
      if (!text) return;
      lastCapturedClipboardRef.current = text;
      if (window.crossDiaryNative?.writeSystemClipboard) {
        window.crossDiaryNative.writeSystemClipboard(text);
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    };

    // 2. Real-time note edits (<25ms latency over WebSocket / LAN)
    const unsubLiveNote = subscribeLiveNoteUpdate((remoteNote) => {
      if (!remoteNote.id) return;
      setDiary((prev) => {
        isIncomingRemoteUpdateRef.current = true;
        const nowIso = new Date().toISOString();
        return {
          ...prev,
          updatedAt: nowIso,
          notes: prev.notes.map((n) =>
            n.id === remoteNote.id ? { ...n, ...remoteNote, updatedAt: nowIso } : n
          ),
        };
      });
    });

    // 3. Real-time full sync (note additions, deletions, folders, settings, clipboards)
    const unsubLiveFull = subscribeLiveFullSync((remoteDiary) => {
      if (!remoteDiary) return;
      setDiary((prev) => {
        isIncomingRemoteUpdateRef.current = true;
        const merged = mergeDiaryStates(prev, remoteDiary);
        const topText = merged.clipboardHistory?.[0]?.text;
        if (topText && topText !== lastCapturedClipboardRef.current) {
          writeIncomingTextToSystemClipboard(topText);
        }
        return merged;
      });
    });

    // 3b. Real-time live clipboard sync across all linked devices (<25ms)
    const unsubLiveClipboard = subscribeLiveClipboardUpdate((payload) => {
      if (!payload) return;
      if (payload.action === 'add' && payload.entry) {
        const incoming = payload.entry;
        writeIncomingTextToSystemClipboard(incoming.text);
        setDiary((prev) => {
          if (
            prev.clipboardHistory.some(
              (c) =>
                c.id === incoming.id ||
                (c.text === incoming.text &&
                  Math.abs(new Date(c.timestamp).getTime() - new Date(incoming.timestamp).getTime()) < 1500)
            )
          ) {
            return prev;
          }
          isIncomingRemoteUpdateRef.current = true;
          return {
            ...prev,
            clipboardHistory: [incoming, ...prev.clipboardHistory.filter((c) => c.text !== incoming.text)].slice(0, 50),
          };
        });
      } else if (payload.action === 'delete' && payload.entry?.id) {
        setDiary((prev) => {
          isIncomingRemoteUpdateRef.current = true;
          return {
            ...prev,
            clipboardHistory: prev.clipboardHistory.filter((c) => c.id !== payload.entry!.id),
          };
        });
      } else if (payload.action === 'sync_all' && Array.isArray(payload.history)) {
        setDiary((prev) => {
          isIncomingRemoteUpdateRef.current = true;
          return {
            ...prev,
            clipboardHistory: payload.history || [],
          };
        });
      }
    });

    // 4. Local LAN sync from Electron desktop server (when on same Wi-Fi)
    const unsubLan = window.crossDiaryNative?.onLanSyncReceived?.((payload: any) => {
      if (!payload) return;
      if (payload.type === 'NOTE_UPDATE' && payload.note) {
        setDiary((prev) => {
          isIncomingRemoteUpdateRef.current = true;
          const nowIso = new Date().toISOString();
          return {
            ...prev,
            updatedAt: nowIso,
            notes: prev.notes.map((n) =>
              n.id === payload.note.id ? { ...n, ...payload.note, updatedAt: nowIso } : n
            ),
          };
        });
      } else if (payload.type === 'FULL_SYNC' && payload.diary) {
        setDiary((prev) => {
          isIncomingRemoteUpdateRef.current = true;
          const merged = mergeDiaryStates(prev, payload.diary);
          const topText = merged.clipboardHistory?.[0]?.text;
          if (topText && topText !== lastCapturedClipboardRef.current) {
            writeIncomingTextToSystemClipboard(topText);
          }
          return merged;
        });
      } else if (payload.type === 'CLIPBOARD_UPDATE') {
        if (payload.action === 'add' && payload.entry) {
          const incoming = payload.entry;
          writeIncomingTextToSystemClipboard(incoming.text);
          setDiary((prev) => {
            isIncomingRemoteUpdateRef.current = true;
            return {
              ...prev,
              clipboardHistory: [incoming, ...prev.clipboardHistory.filter((c) => c.text !== incoming.text)].slice(0, 50),
            };
          });
        } else if (payload.action === 'delete' && payload.entry?.id) {
          setDiary((prev) => {
            isIncomingRemoteUpdateRef.current = true;
            return {
              ...prev,
              clipboardHistory: prev.clipboardHistory.filter((c) => c.id !== payload.entry.id),
            };
          });
        }
      }
    });

    // 5. Initial startup cloud backup fetch
    r2DownloadDiary(diary.pairingCode)
      .then((res) => {
        if (res.success && res.state && Array.isArray(res.state.notes) && res.state.notes.length > 0) {
          setDiary((prev) => {
            isIncomingRemoteUpdateRef.current = true;
            const merged = mergeDiaryStates(prev, res.state!);
            const topText = merged.clipboardHistory?.[0]?.text;
            if (topText && topText !== lastCapturedClipboardRef.current) {
              writeIncomingTextToSystemClipboard(topText);
            }
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn('Initial sync download skipped:', err);
      });

    // 6. Real-time background sync polling every 3.5 seconds for cloud backup
    const pollSync = async () => {
      const current = diaryRef.current;
      if (!current.isInitialized || !current.pairingCode) return;
      const updateRes = await r2CheckForRemoteUpdates(current);
      if (updateRes.hasUpdate && updateRes.remoteState) {
        setDiary((prev) => {
          isIncomingRemoteUpdateRef.current = true;
          const merged = mergeDiaryStates(prev, updateRes.remoteState!);
          const topText = merged.clipboardHistory?.[0]?.text;
          if (topText && topText !== lastCapturedClipboardRef.current) {
            writeIncomingTextToSystemClipboard(topText);
          }
          return merged;
        });
      }
    };

    const intervalId = setInterval(pollSync, 3500);

    // 7. Sync check immediately when window regains focus or visibility
    const handleFocus = () => {
      pollSync();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 8. Save to cloud on app beforeunload / close
    const handleBeforeUnload = () => {
      if (diaryRef.current.isInitialized && diaryRef.current.pairingCode) {
        r2UploadDiary(diaryRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubLiveNote();
      unsubLiveFull();
      unsubLiveClipboard();
      unsubLan?.();
      stopLiveSync();
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [diary.pairingCode, diary.isInitialized, isMobile]);

  // Desktop Click-Through Management: Send active bounding boxes so Electron handles mouse passthrough without losing events
  useEffect(() => {
    if (!window.crossDiaryNative?.sendInteractiveBounds) return;

    const reportInteractiveBounds = () => {
      const isDragging = document.body.getAttribute('data-dragging-sticker') === 'true';
      if (isDragging) {
        // While dragging, capture entire window
        window.crossDiaryNative?.sendInteractiveBounds?.([
          { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        ]);
        return;
      }

      const elements = document.querySelectorAll('[data-interactive="true"]');
      const bounds = Array.from(elements).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
      window.crossDiaryNative?.sendInteractiveBounds?.(bounds);
    };

    reportInteractiveBounds();
    const interval = setInterval(reportInteractiveBounds, 250);
    window.addEventListener('resize', reportInteractiveBounds);
    const observer = new MutationObserver(reportInteractiveBounds);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', reportInteractiveBounds);
      observer.disconnect();
    };
  }, []);

  // Automatic Live System Clipboard Watcher (Captures Ctrl+C across the PC automatically in real time!)
  useEffect(() => {
    if (diary.settings.extensionConfigs?.clipboard?.autoCaptureSystem === false) return;

    // Seed initial clipboard text so we don't re-add old top entry
    if (diary.clipboardHistory[0]?.text && !lastCapturedClipboardRef.current) {
      lastCapturedClipboardRef.current = diary.clipboardHistory[0].text;
    }

    const handleNewClipboardText = (rawText: string) => {
      const trimmed = (rawText || '').trim();
      if (!trimmed || trimmed.length > 5000) return;

      if (trimmed !== lastCapturedClipboardRef.current) {
        lastCapturedClipboardRef.current = trimmed;
        const nowIso = new Date().toISOString();
        const newEntry: ClipboardEntry = {
          id: 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          text: trimmed,
          deviceName: getDeviceDisplayNameSync(),
          deviceType: isMobile ? 'mobile' : 'desktop',
          timestamp: nowIso,
        };
        setDiary((prev) => {
          if (prev.clipboardHistory[0]?.text === trimmed) return prev;
          const nextState: DiaryState = {
            ...prev,
            clipboardHistory: [newEntry, ...prev.clipboardHistory.filter((c) => c.text !== trimmed)].slice(0, 50),
            updatedAt: nowIso,
          };
          sendLiveClipboardUpdate('add', { entry: newEntry, history: nextState.clipboardHistory });
          sendLiveFullSync(nextState);
          scheduleR2Sync(nextState);
          return nextState;
        });
      }
    };

    // 1. Electron Native IPC push listener
    let unsubIpc: (() => void) | undefined;
    if (window.crossDiaryNative?.onSystemClipboardChanged) {
      unsubIpc = window.crossDiaryNative.onSystemClipboardChanged((text) => {
        handleNewClipboardText(text);
      });
    }

    // 2. Capture native copy/cut events inside the app immediately (Works on both Android & Desktop!)
    const handleDocumentCopyOrCut = (e: ClipboardEvent) => {
      const sel = window.getSelection()?.toString() || e.clipboardData?.getData('text/plain') || '';
      if (sel && sel.trim()) {
        handleNewClipboardText(sel);
      } else {
        setTimeout(pollClipboard, 80);
      }
    };
    document.addEventListener('copy', handleDocumentCopyOrCut);
    document.addEventListener('cut', handleDocumentCopyOrCut);

    // 3. Continuous polling & focus check
    const pollClipboard = async () => {
      try {
        let text = '';
        if (window.crossDiaryNative?.getSystemClipboard) {
          text = await window.crossDiaryNative.getSystemClipboard();
        } else if (document.hasFocus() && navigator.clipboard?.readText) {
          text = await navigator.clipboard.readText();
        }
        if (text) {
          handleNewClipboardText(text);
        }
      } catch {}
    };

    const handleVisOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        pollClipboard();
      }
    };
    window.addEventListener('focus', handleVisOrFocus);
    document.addEventListener('visibilitychange', handleVisOrFocus);

    pollClipboard();
    const id = setInterval(pollClipboard, 600);
    return () => {
      clearInterval(id);
      if (unsubIpc) unsubIpc();
      document.removeEventListener('copy', handleDocumentCopyOrCut);
      document.removeEventListener('cut', handleDocumentCopyOrCut);
      window.removeEventListener('focus', handleVisOrFocus);
      document.removeEventListener('visibilitychange', handleVisOrFocus);
    };
  }, [diary.settings.extensionConfigs?.clipboard?.autoCaptureSystem, isMobile]);

  // Global persistent background countdown for in-note timers across ALL sheets & even when Island is hidden!
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;
      let shouldRing = false;

      const updateNoteWidgets = (notesList: Note[]): Note[] => {
        return notesList.map((n) => {
          if (!n.widgets || n.widgets.length === 0) return n;
          let noteChanged = false;
          const nextWidgets = n.widgets.map((w) => {
            if (w.type === 'timer' && w.timerIsRunning && w.timerTargetEndTime) {
              const remaining = Math.max(0, Math.ceil((w.timerTargetEndTime - now) / 1000));
              if (remaining <= 0) {
                noteChanged = true;
                changed = true;
                shouldRing = true;
                return {
                  ...w,
                  timerIsRunning: false,
                  timerSecondsLeft: 0,
                  timerTargetEndTime: undefined,
                };
              }
              if (w.timerSecondsLeft !== remaining) {
                noteChanged = true;
                changed = true;
                return { ...w, timerSecondsLeft: remaining };
              }
            }
            return w;
          });
          return noteChanged ? { ...n, widgets: nextWidgets } : n;
        });
      };

      const nextNotes = updateNoteWidgets(diary.notes);
      const nextVaultNotes = updateNoteWidgets(diary.vaultNotes);

      if (shouldRing) {
        playTimerAlarm(diary.settings.extensionConfigs.chrono);
      }
      if (changed) {
        setDiary((prev) => ({
          ...prev,
          notes: nextNotes,
          vaultNotes: nextVaultNotes,
        }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [diary.notes, diary.vaultNotes, diary.settings.extensionConfigs.chrono]);

  const handleCycleTheme = () => {
    const idx = THEME_ORDER.indexOf(diary.settings.theme);
    const nextTheme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setDiary((prev) => {
      const nowIso = new Date().toISOString();
      const nextState: DiaryState = {
        ...prev,
        updatedAt: nowIso,
        settings: { ...prev.settings, theme: nextTheme },
      };
      sendLiveFullSync(nextState);
      scheduleR2Sync(nextState);
      return nextState;
    });
  };

  const handleSelectGroup = (groupId: string) => {
    setDiary((prev) => {
      const groupNotes = prev.notes.filter((n) => n.groupId === groupId);
      return {
        ...prev,
        selectedGroupId: groupId,
        selectedNoteId: groupNotes[0]?.id || prev.selectedNoteId,
      };
    });
  };

  const handleSelectNote = (noteId: string) => {
    setDiary((prev) => ({ ...prev, selectedNoteId: noteId }));
  };

  const handleAddNewNote = (groupId?: string): Note => {
    const targetGroup = groupId || diary.selectedGroupId || diary.groups[0]?.id || 'grp-diario';

    const newNote: Note = {
      id: 'note-' + Date.now(),
      groupId: targetGroup,
      title:
        'NUEVA HOJA // ' +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: `# NUEVA HOJA\n\nEscribe aquí o usa '/' para comandos rápidos...`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: '⚡',
      widgets: [],
      resetMode: 'manual',
    };
    setDiary((prev) => {
      const nextState = {
        ...prev,
        notes: [newNote, ...prev.notes],
        selectedGroupId: targetGroup,
        selectedNoteId: newNote.id,
      };
      sendLiveFullSync(nextState);
      return nextState;
    });
    return newNote;
  };

  const handleUpdateNote = (updated: Partial<Note>) => {
    const targetId = updated.id || diary.selectedNoteId;
    if (!targetId) return;
    sendLiveNoteUpdate({ ...updated, id: targetId });
    setDiary((prev) => {
      const activeId = updated.id || prev.selectedNoteId;
      if (!activeId) return prev;
      const inRegular = prev.notes.some((n) => n.id === activeId);
      const inVault = prev.vaultNotes.some((n) => n.id === activeId);
      const inDecoy = prev.decoyNotes.some((n) => n.id === activeId);
      const nowIso = new Date().toISOString();

      if (inRegular) {
        return {
          ...prev,
          updatedAt: nowIso,
          notes: prev.notes.map((n) => (n.id === activeId ? { ...n, ...updated, updatedAt: nowIso } : n)),
        };
      }
      if (inVault) {
        return {
          ...prev,
          updatedAt: nowIso,
          vaultNotes: prev.vaultNotes.map((n) => (n.id === activeId ? { ...n, ...updated, updatedAt: nowIso } : n)),
        };
      }
      if (inDecoy) {
        return {
          ...prev,
          updatedAt: nowIso,
          decoyNotes: prev.decoyNotes.map((n) => (n.id === activeId ? { ...n, ...updated, updatedAt: nowIso } : n)),
        };
      }
      return prev;
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setDiary((prev) => {
      const remaining = prev.notes.filter((n) => n.id !== noteId);
      const nextState = {
        ...prev,
        notes: remaining,
        selectedNoteId: remaining[0]?.id || null,
      };
      sendLiveFullSync(nextState);
      return nextState;
    });
  };

  const handleAddGroup = (name: string, color?: TabColor) => {
    const nextFolderIndex = diary.groups.length;
    const effectiveFolderColor = color || (getRainbowFolderColor(nextFolderIndex) as TabColor);
    const newGroup: FolderGroup = {
      id: 'grp-' + Date.now(),
      name,
      color: effectiveFolderColor,
      collapsed: false,
    };
    setDiary((prev) => {
      const nextState = {
        ...prev,
        groups: [...prev.groups, newGroup],
        selectedGroupId: newGroup.id,
      };
      sendLiveFullSync(nextState);
      return nextState;
    });
    handleAddNewNote(newGroup.id);
  };

  const handleUpdateGroup = (groupId: string, patch: Partial<FolderGroup>) => {
    setDiary((prev) => {
      const nextGroups = prev.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g));
      const nextState = {
        ...prev,
        groups: nextGroups,
        updatedAt: new Date().toISOString(),
      };
      sendLiveFullSync(nextState);
      return nextState;
    });
  };

  const handleUpdateGlobalStickers = (stickers: NoteSticker[]) => {
    setDiary((prev) => ({ ...prev, globalStickers: stickers }));
  };

  const handleAddVaultNote = (isDecoy: boolean) => {
    const newSecret: Note = {
      id: (isDecoy ? 'decoy-' : 'vault-') + Date.now(),
      groupId: 'grp-vault',
      title: isDecoy ? 'NOTA DE RECADOS' : 'REGISTRO PRIVADO',
      content: isDecoy
        ? `# NOTA DE RECADOS\n\n- [ ] Comprar café`
        : `# REGISTRO PRIVADO\n\nContenido confidencial dentro de tu Bóveda.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: isDecoy ? '🛒' : '🔐',
      isVault: !isDecoy,
      isDecoy: isDecoy,
    };

    setDiary((prev) => ({
      ...prev,
      vaultNotes: isDecoy ? prev.vaultNotes : [newSecret, ...prev.vaultNotes],
      decoyNotes: isDecoy ? [newSecret, ...prev.decoyNotes] : prev.decoyNotes,
      selectedNoteId: newSecret.id,
    }));
  };

  const handleSelectVaultNote = (note: Note) => {
    setDiary((prev) => ({ ...prev, selectedNoteId: note.id }));
  };

  const handleDeleteVaultNote = (id: string, isDecoy: boolean) => {
    setDiary((prev) => ({
      ...prev,
      vaultNotes: isDecoy ? prev.vaultNotes : prev.vaultNotes.filter((n) => n.id !== id),
      decoyNotes: isDecoy ? prev.decoyNotes.filter((n) => n.id !== id) : prev.decoyNotes,
      selectedNoteId: prev.notes[0]?.id || null,
    }));
  };

  const handlePanicLock = () => {
    setDiary((prev) => ({
      ...prev,
      selectedNoteId: prev.notes[0]?.id || null,
      activeExternalExtensionId: 'ext-music',
    }));
  };

  const handleAddClipboardEntry = (
    text: string,
    deviceName = getDeviceDisplayNameSync()
  ) => {
    lastCapturedClipboardRef.current = text;
    if (window.crossDiaryNative?.writeSystemClipboard) {
      window.crossDiaryNative.writeSystemClipboard(text);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    const nowIso = new Date().toISOString();
    const newEntry: ClipboardEntry = {
      id: 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text,
      deviceName,
      deviceType: isMobile ? 'mobile' : 'desktop',
      timestamp: nowIso,
    };
    setDiary((prev) => {
      const nextState: DiaryState = {
        ...prev,
        updatedAt: nowIso,
        clipboardHistory: [newEntry, ...prev.clipboardHistory.filter((c) => c.text !== text)].slice(0, 50),
      };
      sendLiveClipboardUpdate('add', { entry: newEntry, history: nextState.clipboardHistory });
      sendLiveFullSync(nextState);
      scheduleR2Sync(nextState);
      return nextState;
    });
  };

  const handleDeleteClipboardEntry = (id: string) => {
    setDiary((prev) => {
      const nowIso = new Date().toISOString();
      const nextState: DiaryState = {
        ...prev,
        updatedAt: nowIso,
        clipboardHistory: prev.clipboardHistory.filter((c) => c.id !== id),
      };
      sendLiveClipboardUpdate('delete', { entry: { id } as any, history: nextState.clipboardHistory });
      sendLiveFullSync(nextState);
      scheduleR2Sync(nextState);
      return nextState;
    });
  };

  const handleUpdateSettings = (newSettings: Partial<DiarySettings>) => {
    if (newSettings.language) {
      try {
        localStorage.setItem('cross_diary_language', newSettings.language);
        window.dispatchEvent(new CustomEvent('cross-diary-language-change', { detail: newSettings.language }));
      } catch {}
    }
    setDiary((prev) => {
      const nowIso = new Date().toISOString();
      const nextState: DiaryState = {
        ...prev,
        updatedAt: nowIso,
        settings: { ...prev.settings, ...newSettings },
      };
      sendLiveFullSync(nextState);
      scheduleR2Sync(nextState);
      return nextState;
    });
  };

  const handleUpdateExtensionConfig = <K extends keyof ExtensionConfigMap>(
    key: K,
    newConfig: Partial<ExtensionConfigMap[K]>
  ) => {
    setDiary((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        extensionConfigs: {
          ...prev.settings.extensionConfigs,
          [key]: {
            ...prev.settings.extensionConfigs[key],
            ...newConfig,
          },
        },
      },
    }));
  };

  const handleToggleExtension = (id: string) => {
    setDiary((prev) => ({
      ...prev,
      extensions: prev.extensions.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    }));
  };

  const handleSaveExtension = (ext: UserExtension) => {
    setDiary((prev) => {
      const exists = prev.extensions.some((e) => e.id === ext.id);
      return {
        ...prev,
        extensions: exists
          ? prev.extensions.map((e) => (e.id === ext.id ? ext : e))
          : [...prev.extensions, ext],
        activeExternalExtensionId: ext.id,
      };
    });
  };

  const handleDeleteExtension = (id: string) => {
    setDiary((prev) => ({
      ...prev,
      extensions: prev.extensions.filter((e) => e.id !== id),
    }));
  };

  const handleReorderExtensions = (fromIndex: number, toIndex: number) => {
    setDiary((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.extensions.length ||
        toIndex >= prev.extensions.length
      ) {
        return prev;
      }
      const next = [...prev.extensions];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        ...prev,
        extensions: next,
      };
    });
  };

  const handleCompleteNewDiary = (
    name: string,
    theme: ThemeId,
    icon: string,
    language?: SupportedLang
  ) => {
    const langKey = language || 'es';
    const langConfig = LANGUAGES[langKey] || LANGUAGES.es;

    try {
      localStorage.setItem('cross_diary_language', langKey);
      window.dispatchEvent(new CustomEvent('cross-diary-language-change', { detail: langKey }));
    } catch {}

    const singleFolder: FolderGroup = {
      id: 'grp-main',
      name: langConfig.folderName,
      color: '#FF2E00',
      collapsed: false,
    };

    const welcomeWidgets = createDefaultWelcomeWidgets(langKey === 'en');

    const welcomeNote: Note = {
      id: 'note-welcome-' + Date.now(),
      groupId: singleFolder.id,
      title: langConfig.welcomeNoteTitle,
      content: langConfig.welcomeNoteContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: '⚡',
      widgets: welcomeWidgets,
      resetMode: 'manual',
    };

    const newState: DiaryState = {
      ...diary,
      isInitialized: true,
      groups: [singleFolder],
      notes: [welcomeNote],
      vaultNotes: [],
      decoyNotes: [],
      clipboardHistory: [],
      selectedGroupId: singleFolder.id,
      selectedNoteId: welcomeNote.id,
      settings: {
        ...diary.settings,
        diaryName: name.toUpperCase(),
        theme,
        userAvatar: icon,
        language: langKey,
      },
    };

    setDiary(newState);
    saveDiaryState(newState, true);
    scheduleR2Sync(newState);
    recordMetric('note_created', { count: 1, language: langKey });
  };

  const handleLinkExistingDiary = async (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (cleanCode.replace(/[^A-Z0-9]/g, '').length >= 6) {
      // 1. Download full diary state from Cloudflare R2!
      const r2Res = await r2DownloadDiary(cleanCode);
      if (r2Res.success && r2Res.state) {
        let formattedCode = cleanCode;
        const pureChars = cleanCode.replace(/[^A-Z0-9]/g, '');
        if (pureChars.length === 8 && !cleanCode.includes('-')) {
          formattedCode = `${pureChars.slice(0, 4)}-${pureChars.slice(4)}`;
        }

        const merged: DiaryState = {
          ...diary,
          ...r2Res.state,
          isInitialized: true,
          pairingCode: formattedCode,
        };
        setDiary(merged);
        saveDiaryState(merged, true);

        // Register device network and connect to live P2P channel
        registerDeviceNetwork(formattedCode).then(({ currentDevice }) => {
          startLiveSync(formattedCode, currentDevice);
        }).catch(() => {
          startLiveSync(formattedCode);
        });

        return true;
      }
      return false;
    }
    return false;
  };

  const handleResetDiary = () => {
    try {
      localStorage.removeItem('cross_diary_state_v4');
      localStorage.clear();
    } catch {}
    const fresh = getInitialState();
    setDiary({
      ...fresh,
      isInitialized: false,
    });
    setIsIslandOpen(true);
  };

  const handleUpdateShares = (updatedShares: ResourceShare[]) => {
    setDiary((prev) => ({
      ...prev,
      shares: updatedShares,
      updatedAt: new Date().toISOString(),
    }));
  };

  if (isMobile) {
    return (
      <>
        {restoredNotification && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[92%] p-3 rounded-2xl border border-emerald-500/40 bg-[#0e1713]/95 backdrop-blur-md shadow-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{restoredNotification}</span>
            </div>
            <button
              onClick={() => setRestoredNotification(null)}
              className="p-1 rounded-lg text-emerald-400/60 hover:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <MobileDiaryApp
          diary={diary}
          onUpdateSettings={handleUpdateSettings}
          onAddNewNote={handleAddNewNote}
          onUpdateNote={handleUpdateNote}
          onSelectNote={handleSelectNote}
          onDeleteNote={handleDeleteNote}
          onAddGroup={handleAddGroup}
          onUpdateGroup={handleUpdateGroup}
          onPanicLock={handlePanicLock}
          onAddVaultNote={handleAddVaultNote}
          onDeleteVaultNote={handleDeleteVaultNote}
          onAddClipboardEntry={handleAddClipboardEntry}
          onDeleteClipboardEntry={handleDeleteClipboardEntry}
          onCompleteNewDiary={handleCompleteNewDiary}
          onLinkExistingDiary={handleLinkExistingDiary}
          globalStickers={diary.globalStickers || []}
          onUpdateGlobalStickers={handleUpdateGlobalStickers}
          r2Status={r2Status}
          onResetDiary={handleResetDiary}
          onUpdateShares={handleUpdateShares}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative select-none bg-transparent pointer-events-none">
      {restoredNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90%] p-3.5 rounded-2xl border border-emerald-500/40 bg-[#0e1713]/95 backdrop-blur-md shadow-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{restoredNotification}</span>
          </div>
          <button
            onClick={() => setRestoredNotification(null)}
            className="p-1 rounded-lg text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <ErrorBoundary fallbackTitle="Dynamic Island" language={diary.settings?.language}>
        <DynamicIsland
          isInitialized={diary.isInitialized}
          onCompleteNewDiary={handleCompleteNewDiary}
          onLinkExistingDiary={handleLinkExistingDiary}
          r2Status={r2Status}
          isOpen={isIslandOpen}
          onToggleOpen={setIsIslandOpen}
          pairingCode={diary.pairingCode}
          diaryId={diary.diaryId}
          settings={diary.settings}
          onUpdateSettings={handleUpdateSettings}
          onCycleTheme={handleCycleTheme}
          groups={diary.groups}
          notes={diary.notes}
          vaultNotes={diary.vaultNotes}
          decoyNotes={diary.decoyNotes}
          globalStickers={diary.globalStickers || []}
          onUpdateGlobalStickers={handleUpdateGlobalStickers}
          clipboardHistory={diary.clipboardHistory}
          selectedGroupId={diary.selectedGroupId}
          selectedNoteId={diary.selectedNoteId}
          activeExternalExtensionId={diary.activeExternalExtensionId}
          onSelectGroup={handleSelectGroup}
          onSelectNote={handleSelectNote}
          onSelectExternalExtension={(extId) =>
            setDiary((prev) => ({ ...prev, activeExternalExtensionId: extId }))
          }
          onUpdateNote={handleUpdateNote}
          onAddNewNote={handleAddNewNote}
          onDeleteNote={handleDeleteNote}
          onAddGroup={handleAddGroup}
          onUpdateGroup={handleUpdateGroup}
          onAddVaultNote={handleAddVaultNote}
          onSelectVaultNote={handleSelectVaultNote}
          onDeleteVaultNote={handleDeleteVaultNote}
          onPanicLock={handlePanicLock}
          onAddClipboardEntry={handleAddClipboardEntry}
          onDeleteClipboardEntry={handleDeleteClipboardEntry}
          extensions={diary.extensions}
          extensionConfigs={diary.settings.extensionConfigs}
          onUpdateExtensionConfig={handleUpdateExtensionConfig}
          onToggleExtension={handleToggleExtension}
          onSaveExtension={handleSaveExtension}
          onDeleteExtension={handleDeleteExtension}
          onReorderExtensions={handleReorderExtensions}
          onResetDiary={handleResetDiary}
          shares={diary.shares || []}
          onUpdateShares={handleUpdateShares}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;
