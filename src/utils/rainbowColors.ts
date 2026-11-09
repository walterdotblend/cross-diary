/**
 * Rainbow Sequence Generator for Cross-Diary Folders & Sheets
 * Starts at pure Red (0 deg hue) and smoothly advances across the spectrum.
 * Supports custom CSS overrides through --item-color, --rainbow-hue and data-rainbow-index.
 */

export function getRainbowFolderColor(index: number): string {
  // Starts at Red (hue 0 / #FF2E00), steps ~45 deg per folder (8-phase harmonious cycle)
  const hue = Math.round((index * 45) % 360);
  return `hsl(${hue}, 92%, 52%)`;
}

export function getRainbowSheetColor(folderIndex: number, sheetIndex: number): string {
  // Starts cleanly at folder base hue (sheet 0 matches folder), advancing ~22 deg per sheet
  const baseHue = (folderIndex * 45) % 360;
  const hue = Math.round((baseHue + sheetIndex * 22) % 360);
  return `hsl(${hue}, 92%, 52%)`;
}

export function getRainbowCssVars(index: number, effectiveColor: string) {
  const hue = Math.round((index * 45) % 360);
  return {
    '--item-color': effectiveColor,
    '--rainbow-hue': `${hue}deg`,
    '--rainbow-index': index,
  } as React.CSSProperties;
}

/**
 * Returns a recognizable color emoji dot (🔴, 🟠, 🟡, 🟢, 🔵, 🟣, 🌸)
 * corresponding to the hue of a folder or sheet color.
 */
export function getColorEmojiDot(colorOrHue?: string | number): string {
  if (colorOrHue === undefined || colorOrHue === null) return '⚪';
  let hue = 0;
  if (typeof colorOrHue === 'number') {
    hue = Math.round(colorOrHue % 360);
    if (hue < 0) hue += 360;
  } else {
    const str = colorOrHue.trim().toLowerCase();
    if (str.startsWith('hsl')) {
      const match = str.match(/hsl\((\d+)/);
      if (match) hue = parseInt(match[1], 10) % 360;
    } else if (str.startsWith('#')) {
      const hex = str.replace('#', '');
      let r = 0, g = 0, b = 0;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) hue = 0;
      else if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }
  }

  if (hue >= 345 || hue < 20) return '🔴';
  if (hue < 45) return '🟠';
  if (hue < 75) return '🟡';
  if (hue < 165) return '🟢';
  if (hue < 255) return '🔵';
  if (hue < 315) return '🟣';
  return '🌸';
}

