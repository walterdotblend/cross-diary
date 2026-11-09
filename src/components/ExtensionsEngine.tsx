import React, { useState } from 'react';
import { UserExtension } from '../types/diary';
import {
  X,
  Sparkles,
  Check,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Copy,
  Bot
} from 'lucide-react';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: UserExtension[];
  onToggleExtension: (id: string) => void;
  onSaveExtension: (ext: UserExtension) => void;
  onDeleteExtension: (id: string) => void;
}

const AI_PROMPT_GUIDE = `Actúa como un desarrollador experto de extensiones para la aplicación "Cross-Diary".
Quiero que me programes una extensión en JavaScript puro (vanilla JS + HTML inline) que sea 100% compatible con el motor de Cross-Diary.

REGLAS TÉCNICAS Y API DE CROSS-DIARY:
1. Tu código se ejecutará dentro de una función con acceso directo a dos variables globales: \`container\` (un elemento DOM donde debes renderizar tu interfaz con \`container.innerHTML\`) y \`api\` (el objeto de conexión con el diario).
2. Métodos disponibles en \`api\`:
   - \`api.getCurrentNote()\`: Devuelve la hoja activa \`{ id, title, content, updatedAt }\`.
   - \`api.insertText(texto)\`: Inserta texto o Markdown directamente en la hoja activa del diario.
   - \`api.addSticker(urlImagen, nombre)\`: Coloca un sticker flotante libre en la pantalla.
   - \`api.getStorage(clave)\` y \`api.setStorage(clave, valor)\`: Guarda y lee datos permanentes de tu extensión.
3. Variables CSS nativas que DEBES usar en tus estilos para adaptarte automáticamente al tema del usuario:
   - Fondo principal: \`var(--bg-surface)\` o \`var(--bg-card)\`
   - Botones/Píldoras de acento: \`background: var(--bg-pill); color: var(--accent-fg);\`
   - Texto: \`color: var(--text-main);\`
   - Bordes: \`border: 1.5px solid var(--border-color);\`
   - Fuentes: \`var(--font-display)\` (títulos) y \`var(--font-mono)\` (datos/números).
4. El ancho del contenedor externo es de ~310px. Diseña una interfaz compacta, con bordes redondeados (\`border-radius: 16px\`) y alto contraste.
5. Devuelve ÚNICAMENTE el código JavaScript ejecutable sin bloques markdown adicionales ni importaciones externas.

PÍDELE A LA IA LO QUE QUIERAS CREAR AQUÍ ABAJO:
"Créame una extensión para Cross-Diary que haga lo siguiente: [DESCRIBE TU IDEA AQUÍ]"`;

const DEFAULT_CUSTOM_CODE = `// Ejemplo funcional: Generador de Plantilla Rápida
const state = api.getStorage('contador') || 0;

function render() {
  container.innerHTML = \`
    <div style="padding:10px;background:var(--bg-surface);border:1.5px solid var(--border-color);border-radius:16px;">
      <div style="font-size:10px;font-family:var(--font-mono);font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
        MI EXTENSIÓN // USOS: \${state}
      </div>
      <button id="btn-insert" style="width:100%;padding:8px;border-radius:999px;background:var(--bg-pill);color:var(--accent-fg);font-weight:800;font-size:11px;border:none;cursor:pointer;text-transform:uppercase;">
        + Insertar Separador de Hora
      </button>
    </div>
  \`;

  container.querySelector('#btn-insert').onclick = () => {
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    api.insertText(\`\\n### ⏱ Registro [\${hora}]\\n- \`);
    api.setStorage('contador', state + 1);
    render();
  };
}

render();`;

const COMMUNITY_CATALOG: Array<Omit<UserExtension, 'installed' | 'enabled'>> = [
  {
    id: 'ext-community-pomodoro-pro',
    name: 'FocusMatrix // Hábitos & Metas',
    description: 'Rastreador visual de rachas diarias con inserción de resumen en tu hoja.',
    version: '1.4.0',
    author: 'Comunidad',
    icon: 'Sparkles',
    type: 'custom',
    target: 'external_dock',
    code: `let streak = api.getStorage('streak') || 3;
function render() {
  container.innerHTML = \`
    <div style="padding:10px;background:var(--bg-surface);border:1.5px solid var(--border-color);border-radius:16px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:10px;font-family:var(--font-mono);opacity:0.75;">RACHA DE ESCRITURA</div>
        <div style="font-size:18px;font-weight:900;color:var(--accent);">🔥 \${streak} DÍAS SEGUIDOS</div>
      </div>
      <button id="add-streak" style="padding:6px 12px;border-radius:99px;background:var(--bg-pill);color:var(--accent-fg);font-weight:800;font-size:10px;border:none;cursor:pointer;">
        +1 DÍA
      </button>
    </div>
  \`;
  container.querySelector('#add-streak').onclick = () => {
    streak++;
    api.setStorage('streak', streak);
    render();
  };
}
render();`,
  },
];

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  extensions,
  onToggleExtension,
  onSaveExtension,
  onDeleteExtension,
}) => {
  const [tab, setTab] = useState<'installed' | 'store' | 'create'>('installed');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [customCode, setCustomCode] = useState(DEFAULT_CUSTOM_CODE);
  const [copiedGuide, setCopiedGuide] = useState(false);

  if (!isOpen) return null;

  const handleCopyAiGuide = () => {
    navigator.clipboard.writeText(AI_PROMPT_GUIDE);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2200);
  };

  const handleInstallCommunity = (item: Omit<UserExtension, 'installed' | 'enabled'>) => {
    onSaveExtension({
      ...item,
      installed: true,
      enabled: true,
    });
    setTab('installed');
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onSaveExtension({
      id: 'ext-custom-' + Date.now(),
      name: newName.trim(),
      description: newDesc.trim() || 'Extensión personalizada compatible con Cross-Diary.',
      version: '1.0.0',
      author: 'Usuario / IA',
      icon: 'Sparkles',
      type: 'custom',
      target: 'external_dock',
      installed: true,
      enabled: true,
      code: customCode,
    });
    setNewName('');
    setNewDesc('');
    setTab('installed');
  };

  return (
    <div
      data-interactive="true"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
    >
      <div
        className="w-full max-w-[420px] max-h-[86vh] flex flex-col overflow-hidden animate-folder-unfold"
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
            className="text-xs font-display-brutal uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: 'var(--accent)' }}
          >
            <Sparkles size={14} />
            <span>EXTENSIONES & CREADOR CON IA</span>
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="px-3 py-2 flex items-center gap-1.5 border-b no-scrollbar overflow-x-auto"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          {[
            { id: 'installed', label: `Mis Extensiones (${extensions.length})` },
            { id: 'create', label: '+ Crear con IA / Código' },
            { id: 'store', label: 'Comunidad' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 transition-all"
              style={{
                background: tab === t.id ? 'var(--bg-pill)' : 'var(--bg-card)',
                color: tab === t.id ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-3 text-xs">
          {tab === 'installed' && (
            <div className="space-y-2.5">
              {extensions.map((ext) => (
                <div
                  key={ext.id}
                  className="p-3 rounded-2xl flex items-center justify-between gap-3"
                  style={{
                    background: 'var(--bg-surface)',
                    border: `2px solid ${ext.enabled ? 'var(--border-strong)' : 'var(--border-color)'}`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs uppercase truncate">{ext.name}</div>
                    <div className="text-[10px] opacity-75 leading-snug mt-0.5">{ext.description}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleExtension(ext.id)}
                      style={{ color: ext.enabled ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {ext.enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                    {ext.id.startsWith('ext-custom') && (
                      <button
                        onClick={() => onDeleteExtension(ext.id)}
                        className="p-1 text-red-500 hover:scale-110"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreateCustom} className="space-y-3">
              {/* AI Prompt Guide Box */}
              <div
                className="p-3 rounded-2xl space-y-2"
                style={{
                  background: 'var(--bg-surface)',
                  border: '2px dashed var(--border-strong)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-display-brutal uppercase flex items-center gap-1.5"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Bot size={13} />
                    <span>GUÍA PARA PEDIRLE UNA EXTENSIÓN A UNA IA</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAiGuide}
                    className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 transition-transform hover:scale-105"
                    style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                  >
                    {copiedGuide ? <Check size={10} /> : <Copy size={10} />}
                    <span>{copiedGuide ? '¡GUÍA COPIADA!' : 'COPIAR PROMPT IA'}</span>
                  </button>
                </div>

                <p className="text-[10px] opacity-80 leading-relaxed">
                  Copia este texto y pégalo en ChatGPT, Claude o Gemini para que te genere el código exacto compatible con tu diario:
                </p>

                <textarea
                  readOnly
                  value={AI_PROMPT_GUIDE}
                  rows={5}
                  className="w-full p-2 rounded-xl text-[10px] font-mono opacity-85 focus:outline-none resize-none no-scrollbar"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-dot-matrix font-bold uppercase mb-1">
                    NOMBRE:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ: HÁBITOS IA"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl text-xs font-bold uppercase"
                    style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-strong)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-dot-matrix font-bold uppercase mb-1">
                    DESCRIPCIÓN CORTA:
                  </label>
                  <input
                    type="text"
                    placeholder="Qué hace..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-dot-matrix font-bold uppercase mb-1">
                  PEGA AQUÍ EL CÓDIGO GENERADO POR LA IA (O TU CÓDIGO JS):
                </label>
                <textarea
                  rows={6}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="w-full p-2.5 rounded-2xl font-mono text-[11px] focus:outline-none resize-none no-scrollbar"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '2px solid var(--border-strong)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full font-display-brutal text-xs uppercase tracking-wider"
                style={{
                  background: 'var(--bg-pill)',
                  color: 'var(--accent-fg)',
                  boxShadow: 'var(--pill-shadow)',
                }}
              >
                INSTALAR Y SINCRONIZAR EXTENSIÓN
              </button>
            </form>
          )}

          {tab === 'store' && (
            <div className="space-y-2.5">
              {COMMUNITY_CATALOG.map((item) => {
                const already = extensions.some((e) => e.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                    style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-color)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-xs uppercase">{item.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{item.description}</div>
                    </div>
                    <button
                      disabled={already}
                      onClick={() => handleInstallCommunity(item)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 flex items-center gap-1"
                      style={{
                        background: already ? 'var(--bg-card)' : 'var(--bg-pill)',
                        color: already ? 'var(--text-muted)' : 'var(--accent-fg)',
                      }}
                    >
                      {already ? <Check size={11} /> : <Download size={11} />}
                      <span>{already ? 'INSTALADA' : 'INSTALAR'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
