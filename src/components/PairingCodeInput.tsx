import React, { useRef } from 'react';

interface PairingCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

export const PairingCodeInput: React.FC<PairingCodeInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Raw 8 chars without hyphen
  const rawCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const chars = Array.from({ length: 8 }, (_, i) => rawCode[i] || '');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const newChars = [...chars];
    newChars[index] = char;
    const cleanStr = newChars.join('');
    
    // Format with hyphen: XXXX-XXXX
    let formatted = cleanStr;
    if (cleanStr.length > 4) {
      formatted = `${cleanStr.slice(0, 4)}-${cleanStr.slice(4)}`;
    }
    onChange(formatted);

    // Auto advance focus
    if (char && index < 7) {
      inputsRef.current[index + 1]?.focus();
    }

    if (cleanStr.length === 8 && onComplete) {
      onComplete(formatted);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 7) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!pasted) return;

    let formatted = pasted;
    if (pasted.length > 4) {
      formatted = `${pasted.slice(0, 4)}-${pasted.slice(4)}`;
    }
    onChange(formatted);

    const nextFocusIndex = Math.min(pasted.length, 7);
    inputsRef.current[nextFocusIndex]?.focus();

    if (pasted.length === 8 && onComplete) {
      onComplete(formatted);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 select-none w-full my-1">
      {/* First 4 boxes */}
      <div className="flex gap-1 sm:gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            value={chars[i]}
            disabled={disabled}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-8 h-11 sm:w-10 sm:h-12 rounded-xl text-center text-base sm:text-lg font-mono font-black uppercase transition-all focus:outline-none focus:scale-105 border-2"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--accent)',
              borderColor: chars[i] ? 'var(--accent)' : 'var(--border-color)',
            }}
          />
        ))}
      </div>

      {/* Styled Hyphen Divider */}
      <div
        className="w-3 sm:w-4 h-1 rounded-full mx-0.5 sm:mx-1 shrink-0 opacity-70"
        style={{ background: 'var(--accent)' }}
      />

      {/* Second 4 boxes */}
      <div className="flex gap-1 sm:gap-1.5">
        {[4, 5, 6, 7].map((i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            value={chars[i]}
            disabled={disabled}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-8 h-11 sm:w-10 sm:h-12 rounded-xl text-center text-base sm:text-lg font-mono font-black uppercase transition-all focus:outline-none focus:scale-105 border-2"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--accent)',
              borderColor: chars[i] ? 'var(--accent)' : 'var(--border-color)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
