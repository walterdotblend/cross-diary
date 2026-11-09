import React, { useRef, useState, useEffect } from 'react';
import { Note, NoteAttachment } from '../types/diary';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Paperclip, 
  CheckCircle2, 
  Cloud, 
  Trash2, 
  Radio, 
  Share2, 
  Smile,
  ExternalLink,
  Laptop2,
  Smartphone
} from 'lucide-react';

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (updated: Partial<Note>) => void;
  googleDriveConnected: boolean;
  onConnectDrive: () => void;
  inlineExtensions?: React.ReactNode;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdateNote,
  googleDriveConnected,
  onConnectDrive,
  inlineExtensions,
}) => {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'remote_typing'>('synced');
  const [isSimulatingRemote, setIsSimulatingRemote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate words and read time
  const wordCount = note?.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Sync status debounce simulation
  useEffect(() => {
    if (!note) return;
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      setSyncStatus('synced');
    }, 450);
    return () => clearTimeout(timer);
  }, [note?.title, note?.content]);

  // Remote typing simulation demo (simulates keystrokes coming from mobile device in real-time)
  useEffect(() => {
    let interval: any;
    if (isSimulatingRemote && note) {
      setSyncStatus('remote_typing');
      const sampleAddition = " [Sincronizando desde iPhone: idea registrada a las " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + "]";
      let index = 0;
      
      interval = setInterval(() => {
        if (index < sampleAddition.length) {
          const char = sampleAddition[index];
          onUpdateNote({
            content: note.content + char,
            updatedAt: new Date().toISOString()
          });
          index++;
        } else {
          setIsSimulatingRemote(false);
          setSyncStatus('synced');
          clearInterval(interval);
        }
      }, 70);
    }
    return () => clearInterval(interval);
  }, [isSimulatingRemote]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !note) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const url = event.target?.result as string;
      const isImg = file.type.startsWith('image/');
      
      const newAttachment: NoteAttachment = {
        id: 'att-' + Date.now(),
        name: file.name,
        size: file.size,
        type: isImg ? 'image' : 'file',
        url: url,
        uploadedToDrive: googleDriveConnected,
        driveId: googleDriveConnected ? 'gdrive-' + Math.random().toString(36).substring(2, 8) : undefined,
      };

      const updatedAttachments = [...(note.attachments || []), newAttachment];
      onUpdateNote({ attachments: updatedAttachments });
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachment = (attId: string) => {
    if (!note) return;
    const filtered = (note.attachments || []).filter(a => a.id !== attId);
    onUpdateNote({ attachments: filtered });
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted select-none bg-background">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted mb-4 shadow-sm">
          <Paperclip size={20} />
        </div>
        <h3 className="text-sm font-medium text-text mb-1">Ninguna hoja seleccionada</h3>
        <p className="text-xs max-w-sm text-text-muted/80">
          Selecciona una hoja de la columna izquierda o crea una nueva para comenzar a plasmar tus pensamientos.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(note.createdAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Subtle Status Bar */}
      <div className="px-6 py-2.5 border-b border-border/60 flex items-center justify-between bg-surface/30 backdrop-blur-sm text-xs">
        <div className="flex items-center space-x-3 text-text-muted">
          <div className="flex items-center space-x-1.5 capitalize text-[11px]">
            <Calendar size={12} className="opacity-70" />
            <span>{formattedDate}</span>
          </div>
          <span className="text-border">•</span>
          <div className="flex items-center space-x-1 text-[11px]">
            <Clock size={12} className="opacity-70" />
            <span>{wordCount} palabras · ~{readTime} min</span>
          </div>
        </div>

        {/* Sync & Real-time indicator */}
        <div className="flex items-center space-x-2">
          {/* Simulated remote device typing trigger */}
          <button
            onClick={() => setIsSimulatingRemote(true)}
            disabled={isSimulatingRemote}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1.5 transition-all border ${
              isSimulatingRemote 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text border-border'
            }`}
            title="Probar simulación de escritura en vivo desde otro dispositivo"
          >
            <Smartphone size={11} />
            <span>{isSimulatingRemote ? 'Móvil escribiendo...' : 'Simular móvil'}</span>
          </button>

          {/* Sync indicator pill */}
          <div 
            className={`w-40 min-w-[160px] justify-center flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] border transition-colors select-none ${
              syncStatus === 'remote_typing'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : syncStatus === 'syncing'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'remote_typing'
                  ? 'bg-amber-400 animate-ping'
                  : syncStatus === 'syncing'
                  ? 'bg-indigo-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="font-mono text-[10px] tracking-tight">
              {syncStatus === 'remote_typing' 
                ? 'Dispositivo escribiendo...' 
                : syncStatus === 'syncing' 
                ? 'Sincronizando...' 
                : 'Sincronización Directa Activa'}
            </span>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full space-y-4">
        {/* Title Input */}
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateNote({ title: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="Título de la hoja..."
          className="w-full text-2xl md:text-3xl font-semibold bg-transparent text-text placeholder-text-muted/40 focus:outline-none tracking-tight border-none p-0"
        />

        {/* Toolbar Bar */}
        <div className="flex items-center justify-between py-1.5 border-y border-border/40 text-text-muted text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-surface-hover hover:text-text transition-colors"
              title="Adjuntar imagen o archivo pequeño"
            >
              <ImageIcon size={13} />
              <span>Adjuntar imagen</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,.pdf,.txt" 
              className="hidden" 
            />

            {/* Google Drive Status indicator button */}
            <button
              onClick={onConnectDrive}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors text-[11px] ${
                googleDriveConnected 
                  ? 'text-emerald-400/90 bg-emerald-500/10 hover:bg-emerald-500/20' 
                  : 'text-text-muted hover:text-amber-400 hover:bg-surface-hover'
              }`}
              title={googleDriveConnected ? 'Google Drive conectado para archivos' : 'Vincular Google Drive para respaldar archivos'}
            >
              <Cloud size={12} />
              <span>{googleDriveConnected ? 'Drive conectado' : 'Conectar Drive'}</span>
            </button>
          </div>

          {/* Mood badge selector */}
          <div className="flex items-center space-x-1">
            {(['reflective', 'calm', 'focused', 'inspired'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onUpdateNote({ mood: m })}
                className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${
                  note.mood === m
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-text-muted/60 hover:text-text'
                }`}
              >
                {m === 'reflective' ? '🌿 Reflexivo' : m === 'calm' ? '☕ Calma' : m === 'focused' ? '🎯 Enfoque' : '💡 Inspirado'}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments Section (if any) */}
        {note.attachments && note.attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {note.attachments.map((att) => (
              <div 
                key={att.id} 
                className="group relative rounded-lg border border-border bg-surface overflow-hidden transition-all hover:border-accent/40"
              >
                {att.type === 'image' ? (
                  <div className="h-32 w-full overflow-hidden bg-black/20">
                    <img 
                      src={att.url} 
                      alt={att.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-full flex flex-col items-center justify-center p-3 text-center">
                    <Paperclip size={24} className="text-text-muted mb-1" />
                    <span className="text-[11px] text-text font-medium truncate w-full">{att.name}</span>
                  </div>
                )}
                
                {/* Meta & Actions */}
                <div className="p-2 flex items-center justify-between text-[10px] text-text-muted border-t border-border/40 bg-surface/90">
                  <div className="flex items-center space-x-1 truncate">
                    {att.uploadedToDrive ? (
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <Cloud size={10} />
                        <span>En Drive</span>
                      </span>
                    ) : (
                      <span>Local</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-background transition-colors"
                    title="Eliminar adjunto"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note Content (Textarea with typography) */}
        <textarea
          value={note.content}
          onChange={(e) => onUpdateNote({ content: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="Comienza a redactar aquí... Escribe tus pensamientos, memorias o planes..."
          rows={16}
          className="w-full diary-paper bg-transparent text-text text-base md:text-lg focus:outline-none resize-none leading-relaxed tracking-normal placeholder-text-muted/30 border-none p-0 mt-2"
        />

        {/* Inline Extensions Container (for mobile / sheet embed) */}
        {inlineExtensions && (
          <div className="pt-6 border-t border-border/50">
            <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-accent" />
              <span>Extensión activa en esta hoja</span>
            </div>
            {inlineExtensions}
          </div>
        )}
      </div>
    </div>
  );
};
