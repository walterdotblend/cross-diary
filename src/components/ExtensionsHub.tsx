import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  Calculator, 
  Heart, 
  Activity, 
  GlassWater 
} from 'lucide-react';
import { Extension } from '../types/diary';

interface ExtensionsHubProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  onToggleExtension: (id: string) => void;
  onChangeTarget: (id: string, target: 'island_panel' | 'note_inline') => void;
  onAddExtension: (ext: Extension) => void;
}

export const ExtensionsHub: React.FC<ExtensionsHubProps> = ({
  isOpen,
  onClose,
  extensions,
  onToggleExtension,
  onChangeTarget,
  onAddExtension,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [extName, setExtName] = useState('');
  const [extDesc, setExtDesc] = useState('');
  const [extTarget, setExtTarget] = useState<'island_panel' | 'note_inline'>('note_inline');

  if (!isOpen) return null;

  const handleCreateCustomExt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extName.trim()) return;

    const newExt: Extension = {
      id: 'ext-' + Date.now(),
      name: extName.trim(),
      description: extDesc.trim() || 'Extensión creada por el usuario.',
      version: '1.0.0',
      author: 'Tú',
      icon: 'Sparkles',
      target: extTarget,
      enabled: true,
      type: 'custom',
    };

    onAddExtension(newExt);
    setExtName('');
    setExtDesc('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-sm font-semibold tracking-tight text-text">
              Extensiones de Usuario & Complementos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-surface-hover/30 border-b border-border text-xs text-text-muted">
          <p>
            Las extensiones amplían tu diario. En <strong>escritorio</strong> puedes ubicarlas en la <strong>Isla Dinámica Lateral</strong> o <strong>dentro de la hoja de nota</strong>. En <strong>móvil</strong>, se integran directamente al pie de la nota.
          </p>
        </div>

        {/* Extensions List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              Extensiones Instaladas ({extensions.length})
            </span>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-accent text-white flex items-center space-x-1 hover:opacity-90"
            >
              <Plus size={13} />
              <span>Crear Extensión</span>
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateCustomExt} className="p-4 bg-surface-hover/50 border border-border rounded-2xl space-y-3">
              <span className="text-xs font-semibold text-text">Nueva Extensión Personalizada</span>
              <input
                type="text"
                placeholder="Nombre de la extensión..."
                value={extName}
                onChange={(e) => setExtName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:border-accent"
                autoFocus
              />
              <textarea
                placeholder="Descripción corta..."
                value={extDesc}
                onChange={(e) => setExtDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:border-accent"
              />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted">Ubicación en Escritorio:</span>
                  <select
                    value={extTarget}
                    onChange={(e) => setExtTarget(e.target.value as any)}
                    className="bg-background border border-border rounded px-2 py-1 text-xs text-text"
                  >
                    <option value="note_inline">Dentro de la hoja (predeterminado móvil)</option>
                    <option value="island_panel">Panel en la Isla Lateral</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 text-xs text-text-muted hover:bg-background rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-accent text-white rounded font-medium"
                  >
                    Instalar
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {extensions.map((ext) => (
              <div
                key={ext.id}
                className="p-4 rounded-2xl bg-surface-hover/40 border border-border flex items-start justify-between gap-4 transition-all hover:border-border/80"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-text">{ext.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-background border border-border text-text-muted">
                      v{ext.version}
                    </span>
                    <span className="text-[10px] text-text-muted">por {ext.author}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {ext.description}
                  </p>

                  {/* Target switcher for desktop */}
                  <div className="flex items-center space-x-2 pt-1 text-[11px]">
                    <span className="text-text-muted flex items-center space-x-1">
                      <Monitor size={11} />
                      <span>Destino en Escritorio:</span>
                    </span>
                    <button
                      onClick={() => onChangeTarget(ext.id, ext.target === 'island_panel' ? 'note_inline' : 'island_panel')}
                      className="px-2 py-0.5 rounded bg-background border border-border text-text hover:border-accent transition-colors"
                    >
                      {ext.target === 'island_panel' ? 'Panel en Isla Lateral' : 'Dentro de la Hoja de Nota'}
                    </button>
                  </div>
                </div>

                {/* Enabled Toggle */}
                <button
                  onClick={() => onToggleExtension(ext.id)}
                  className={`p-1 transition-colors ${ext.enabled ? 'text-accent' : 'text-text-muted'}`}
                  title={ext.enabled ? 'Deshabilitar' : 'Habilitar'}
                >
                  {ext.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Interactive Widget for Note-inline Extension (Habit & Mood Tracker) */
export const HabitTrackerInlineWidget: React.FC = () => {
  const [glasses, setGlasses] = useState(4);
  const [energy, setEnergy] = useState(4);
  const [meditated, setMeditated] = useState(true);

  return (
    <div className="p-4 rounded-2xl bg-surface/80 border border-border shadow-sm space-y-3 my-2 backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text flex items-center space-x-1.5">
          <Activity size={14} className="text-accent" />
          <span>Bitácora Diaria de Hábitos</span>
        </span>
        <span className="text-[10px] text-text-muted">Guardado en la nota</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Water */}
        <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GlassWater size={15} className="text-blue-400" />
            <span className="text-text-muted">Agua</span>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setGlasses(Math.max(0, glasses - 1))}
              className="w-5 h-5 rounded bg-surface hover:bg-surface-hover text-text flex items-center justify-center font-bold"
            >
              -
            </button>
            <span className="font-mono text-text font-semibold px-1">{glasses} vasos</span>
            <button 
              onClick={() => setGlasses(glasses + 1)}
              className="w-5 h-5 rounded bg-surface hover:bg-surface-hover text-text flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Energy */}
        <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between">
          <span className="text-text-muted">Energía:</span>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEnergy(lvl)}
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition-all ${
                  energy >= lvl ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-surface text-text-muted'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Mindfulness */}
        <div 
          onClick={() => setMeditated(!meditated)}
          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
            meditated 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-background border-border text-text-muted'
          }`}
        >
          <span className="flex items-center space-x-1.5">
            <Heart size={13} />
            <span>Meditación / Pausa</span>
          </span>
          <span className="text-xs font-semibold">{meditated ? 'Completado ✓' : 'Pendiente'}</span>
        </div>
      </div>
    </div>
  );
};
