import React from 'react';
import { UserExtension } from '../types/diary';
import { ExtensionProps } from './types';
import { AudioVisualizerExtension } from './AudioVisualizerExtension';
import { ChronoTimerExtension } from './ChronoTimerExtension';
import { CalculatorExtension } from './CalculatorExtension';
import { VaultExtension } from './VaultExtension';
import { ClipboardExtension } from './ClipboardExtension';
import { StickersExtension } from './StickersExtension';
import { NoteBlocksExtension } from './NoteBlocksExtension';
import { CustomCssExtension } from './CustomCssExtension';
import { SandboxExtension } from './SandboxExtension';
import {
  Music,
  Timer,
  Calculator,
  Lock,
  Clipboard,
  Sticker,
  LayoutGrid,
  Code,
  Sparkles,
} from 'lucide-react';

export function getExtensionIcon(type: UserExtension['type']) {
  switch (type) {
    case 'music_waveform':
      return <Music size={13} />;
    case 'chrono_calc':
      return <Timer size={13} />;
    case 'calculator_pro':
      return <Calculator size={13} />;
    case 'vault_boveda':
      return <Lock size={13} />;
    case 'clipboard_hub':
      return <Clipboard size={13} />;
    case 'sticker_studio':
      return <Sticker size={13} />;
    case 'note_widgets':
      return <LayoutGrid size={13} />;
    default:
      return <Sparkles size={13} />;
  }
}

export function renderExtensionWidget(
  ext: UserExtension,
  props: ExtensionProps
): React.ReactNode {
  switch (ext.type) {
    case 'music_waveform':
      return <AudioVisualizerExtension {...props} />;
    case 'chrono_calc':
      return <ChronoTimerExtension {...props} />;
    case 'calculator_pro':
      return <CalculatorExtension {...props} />;
    case 'vault_boveda':
      return <VaultExtension {...props} />;
    case 'clipboard_hub':
      return <ClipboardExtension {...props} />;
    case 'sticker_studio':
      return <StickersExtension {...props} />;
    case 'note_widgets':
      return <NoteBlocksExtension {...props} />;
    default:
      if (ext.id === 'ext-custom-css') {
        return <CustomCssExtension {...props} />;
      }
      return <SandboxExtension {...props} />;
  }
}
