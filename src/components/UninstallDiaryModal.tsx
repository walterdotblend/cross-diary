import React, { useState } from 'react';
import { Trash2, AlertTriangle, Cloud, HardDrive, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { DiaryState } from '../types/diary';
import { r2ScheduleDiaryDeletion } from '../utils/r2Sync';
import { resetLocalDiaryStorage } from '../utils/storage';

interface UninstallDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DiaryState;
  onResetComplete: () => void;
}

export const UninstallDiaryModal: React.FC<UninstallDiaryModalProps> = ({
  isOpen,
  onClose,
  state,
  onResetComplete,
}) => {
  const isEn = state.settings?.language === 'en';
  const [deleteLocal, setDeleteLocal] = useState(false);
  const [deleteCloud, setDeleteCloud] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepSuccess, setStepSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setStatusMessage(isEn ? 'Processing request...' : 'Procesando solicitud...');

    try {
      // 1. If user checked cloud delete
      if (deleteCloud && state.pairingCode) {
        setStatusMessage(
          isEn
            ? 'Scheduling 30-day cloud deletion...'
            : 'Programando borrado en la nube (30 días de gracia)...'
        );
        const res = await r2ScheduleDiaryDeletion(
          state.pairingCode,
          state.diaryId,
          (state.settings as any)?.deviceId
        );
        if (!res.success) {
          console.warn('Failed to schedule cloud deletion:', res.error);
        }
      }

      // 2. If user checked local delete
      if (deleteLocal) {
        setStatusMessage(isEn ? 'Erasing local data...' : 'Borrando datos guardados en este equipo...');
        resetLocalDiaryStorage();
        if (typeof window !== 'undefined' && window.crossDiaryNative?.deleteLocalData) {
          await window.crossDiaryNative.deleteLocalData().catch(() => {});
        }
      }

      setStepSuccess(true);
      setStatusMessage(
        isEn
          ? 'Done! Reset completed successfully.'
          : '¡Listo! Solicitud completada exitosamente.'
      );

      setTimeout(() => {
        setIsProcessing(false);
        onResetComplete();
      }, 1400);
    } catch (err: any) {
      console.error('UninstallDiaryModal error:', err);
      setIsProcessing(false);
      alert(isEn ? 'Error processing request' : 'Error al procesar la solicitud');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/30 bg-[#0e0e12] p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEn ? 'Reset or Uninstall Diary' : 'Restablecer o Desinstalar Diario'}
              </h3>
              <p className="text-xs text-white/50">
                {isEn ? 'Manage saved data and cloud retention' : 'Gestiona tus datos guardados y borrado en la nube'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {stepSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-white">
              {isEn ? 'Operation Completed' : 'Operación Completada'}
            </h4>
            <p className="text-xs text-white/70 max-w-sm">{statusMessage}</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Check 1: Borrar datos locales */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={deleteLocal}
                onChange={(e) => setDeleteLocal(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-red-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-sm text-white">
                  <HardDrive className="h-4 w-4 text-amber-400" />
                  <span>
                    {isEn ? 'Erase saved data on this device' : 'Borrar datos guardados en este dispositivo'}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                  {isEn
                    ? 'Deletes local notes, clipboard history, temporary caches and settings on this device.'
                    : 'Elimina notas locales, portapapeles, caché y configuraciones guardadas en este dispositivo.'}
                </p>
              </div>
            </label>

            {/* Check 2: Solicitar borrado de diario en la nube */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.07] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={deleteCloud}
                onChange={(e) => setDeleteCloud(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-red-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-sm text-red-300">
                  <Cloud className="h-4 w-4 text-red-400" />
                  <span>
                    {isEn ? 'Request cloud diary deletion' : 'Solicitar borrado de mi diario en la nube'}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                  {isEn
                    ? 'Starts the 30-day grace retention cycle for your cloud diary (Pairing Code: ' +
                      state.pairingCode +
                      ').'
                    : 'Inicia el ciclo de resguardo de 30 días para tu diario en la nube (Código: ' +
                      state.pairingCode +
                      ').'}
                </p>
              </div>
            </label>

            {/* Cloud deletion rules warning notice */}
            {deleteCloud && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    {isEn ? '30-Day Cloud Deletion Policy' : 'Condiciones de Borrado en la Nube'}
                  </span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-white/80 leading-relaxed">
                  <li>
                    <strong className="text-amber-200">
                      {isEn ? '30-day grace period:' : 'Período de gracia de 30 días:'}
                    </strong>{' '}
                    {isEn
                      ? 'Your cloud data is kept safely for 30 days. If you do not return within 30 days, it is permanently deleted.'
                      : 'Tus datos se mantendrán durante 30 días y si no vuelves se borrarán definitivamente.'}
                  </li>
                  <li>
                    <strong className="text-amber-200">
                      {isEn ? 'Recovery anytime:' : 'Recuperación en cualquier momento:'}
                    </strong>{' '}
                    {isEn
                      ? 'You can restore your diary at any time during those 30 days by entering your 8-digit code or opening Cross-Diary on any of your linked devices.'
                      : 'Puedes recuperar tu diario en cualquier momento introduciendo tu código de 8 dígitos o si vuelves a entrar con un dispositivo ya vinculado.'}
                  </li>
                  <li>
                    <strong className="text-amber-200">
                      {isEn ? 'Guest protection:' : 'Protección de notas compartidas:'}
                    </strong>{' '}
                    {isEn
                      ? 'Visits by third parties to shared notes or folders do NOT cancel the deletion. Only your own devices can restore it.'
                      : 'Si alguien más entra a una nota compartida por ti, NO cuenta como regreso y NO cancela el borrado (solo cuenta si es un dispositivo tuyo).'}
                  </li>
                </ul>
              </div>
            )}

            {!deleteLocal && !deleteCloud && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  {isEn
                    ? 'Default: Data is preserved. Check an option above only if you wish to delete it.'
                    : 'Por defecto no se borra nada. Marca una casilla arriba solo si expresamente deseas borrar.'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!stepSuccess && (
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || (!deleteLocal && !deleteCloud)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>
                {isProcessing
                  ? statusMessage || (isEn ? 'Processing...' : 'Procesando...')
                  : isEn
                  ? 'Confirm Action'
                  : 'Confirmar Acción'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
