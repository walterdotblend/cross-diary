import React, { useState, useEffect } from 'react';
import { ExtensionProps } from './types';
import { Calculator, Plus, RotateCcw, Copy } from 'lucide-react';

export const CalculatorExtension: React.FC<ExtensionProps> = ({
  currentNote,
  onUpdateNote,
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

  const [calcExpr, setCalcExpr] = useState('');
  const [calcRes, setCalcRes] = useState('');
  const [calcHistory, setCalcHistory] = useState<Array<{ expr: string; res: string }>>([]);

  const evalCalculator = (expr: string) => {
    const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    try {
      if (normalized.trim() && /^[0-9+\-*/.% ()]+$/.test(normalized)) {
        // eslint-disable-next-line no-new-func
        const val = Function(`'use strict'; return (${normalized})`)();
        if (typeof val === 'number' && isFinite(val)) {
          return String(Math.round(val * 10000) / 10000);
        }
      }
    } catch {}
    return '';
  };

  const handleCalcInput = (token: string) => {
    if (token === 'C') {
      setCalcExpr('');
      setCalcRes('');
      return;
    }
    if (token === '⌫') {
      const next = calcExpr.slice(0, -1);
      setCalcExpr(next);
      setCalcRes(evalCalculator(next));
      return;
    }
    if (token === '=') {
      const r = evalCalculator(calcExpr);
      if (r) {
        setCalcHistory((prev) => [{ expr: calcExpr, res: r }, ...prev.slice(0, 5)]);
        setCalcExpr(r);
        setCalcRes(r);
      }
      return;
    }
    const next = calcExpr + token;
    setCalcExpr(next);
    setCalcRes(evalCalculator(next));
  };

  const handleInsertIntoNote = () => {
    if (!currentNote || !calcRes) return;
    const calcLabel = isEnglish ? 'Calculation' : 'Cálculo';
    const textToInsert = `\n> 🧮 **${calcLabel}**: \`${calcExpr || calcRes}\` = **${calcRes}**\n`;
    onUpdateNote({
      content: (currentNote.content || '').trimEnd() + textToInsert,
      updatedAt: new Date().toISOString(),
    });
  };

  const calcButtons = [
    ['C', '(', ')', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  return (
    <div className="space-y-2.5">
      {/* Display */}
      <div
        className="rounded-2xl p-3 border flex flex-col justify-end text-right min-h-[64px]"
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-strong)' }}
      >
        <div className="text-[11px] font-mono text-zinc-500 overflow-x-auto no-scrollbar whitespace-nowrap">
          {calcExpr || '0'}
        </div>
        <div
          className="text-2xl font-mono font-extrabold truncate"
          style={{ color: 'var(--accent)' }}
        >
          {calcRes || (calcExpr ? evalCalculator(calcExpr) : '0')}
        </div>
      </div>

      {/* Insert Into Note Button */}
      {calcRes && currentNote && (
        <button
          type="button"
          onClick={handleInsertIntoNote}
          className="w-full py-1.5 px-3 rounded-xl text-[10px] font-extrabold uppercase border flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          style={{
            background: 'var(--bg-pill)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent-fg)',
          }}
        >
          <Plus size={11} />
          <span>{isEnglish ? 'Insert result into sheet' : 'Insertar resultado en la hoja'}</span>
        </button>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-1.5">
        {calcButtons.flat().map((btn) => {
          const isOp = ['÷', '×', '-', '+', '='].includes(btn);
          const isSpecial = ['C', '⌫', '(', ')'].includes(btn);
          return (
            <button
              key={btn}
              type="button"
              onClick={() => handleCalcInput(btn)}
              className={`h-9 rounded-xl font-mono text-xs font-bold border transition-transform active:scale-95 ${
                isOp
                  ? 'bg-[var(--bg-pill)] text-[var(--accent-fg)] border-[var(--border-strong)]'
                  : isSpecial
                  ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--accent)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
              }`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
