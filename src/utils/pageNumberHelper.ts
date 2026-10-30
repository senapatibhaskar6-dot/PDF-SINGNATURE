import { PageNumberingOptions } from '../types';

export const DEFAULT_PAGE_NUMBERING: PageNumberingOptions = {
  enabled: false,
  format: 'page_n_of_total',
  positionMode: 'preset',
  position: 'bottom-center',
  targetScope: 'all',
  startPage: 1,
  startNumber: 1,
  fontSize: 10,
  fontColor: '#334155', // slate-700
  fontFamily: 'Helvetica',
  bottomMargin: 24,
  sideMargin: 36,
  includeBackgroundPill: true,
};

/**
 * Parses user input like "1-5, 8, 12, 14-20" into a list of page numbers (1-indexed)
 */
export function parsePageRangeString(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) return [];
  const pagesSet = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const s = parseInt(startStr, 10);
      const e = parseInt(endStr, 10);
      if (!isNaN(s) && !isNaN(e)) {
        const from = Math.max(1, Math.min(s, e));
        const to = Math.min(totalPages, Math.max(s, e));
        for (let p = from; p <= to; p++) {
          pagesSet.add(p);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pagesSet.add(p);
      }
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

/**
 * Checks whether a page is targeted by the current page numbering options
 */
export function isPageTargeted(
  pageNumber: number, // 1-indexed
  totalPages: number,
  options: PageNumberingOptions
): boolean {
  if (!options.enabled) return false;

  switch (options.targetScope) {
    case 'custom_selection': {
      if (options.selectedPages && options.selectedPages.length > 0) {
        return options.selectedPages.includes(pageNumber);
      }
      if (options.pageRangeText) {
        const parsed = parsePageRangeString(options.pageRangeText, totalPages);
        return parsed.includes(pageNumber);
      }
      return true;
    }
    case 'odd':
      return pageNumber % 2 !== 0 && pageNumber >= options.startPage;
    case 'even':
      return pageNumber % 2 === 0 && pageNumber >= options.startPage;
    case 'range':
    case 'all':
    default:
      if (pageNumber < options.startPage) return false;
      if (options.endPage && pageNumber > options.endPage) return false;
      return true;
  }
}

/**
 * Converts standard Arabic numerals (0-9) to Assamese digits (০-৯)
 */
export function toAssameseNumerals(value: number | string): string {
  const assameseDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(value).replace(/[0-9]/g, (d) => assameseDigits[parseInt(d, 10)] ?? d);
}

/**
 * Computes the page number string according to selected formatting and language
 */
export function formatPageNumberText(
  pageIndex: number, // 0-indexed
  totalPages: number,
  options: PageNumberingOptions
): string | null {
  const pageNum = pageIndex + 1;
  if (!isPageTargeted(pageNum, totalPages, options)) {
    return null;
  }

  let currentCount = options.startNumber + (pageNum - options.startPage);
  let totalCount =
    (options.endPage ? options.endPage : totalPages) - options.startPage + options.startNumber;

  // If user selected custom specific pages, calculate order within selected list
  if (options.targetScope === 'custom_selection' && options.selectedPages && options.selectedPages.length > 0) {
    const idxInSelected = options.selectedPages.indexOf(pageNum);
    if (idxInSelected >= 0) {
      currentCount = options.startNumber + idxInSelected;
      totalCount = options.selectedPages.length + options.startNumber - 1;
    }
  }

  switch (options.format) {
    case 'page_n_of_total':
      return `Page ${currentCount} of ${totalCount}`;
    case 'n_slash_total':
      return `${currentCount} / ${totalCount}`;
    case 'dash_n_dash':
      return `- ${currentCount} -`;
    case 'page_n':
      return `Page ${currentCount}`;
    case 'just_n':
      return `${currentCount}`;
    case 'assamese_page_n_of_total':
      return `পৃষ্ঠা ${toAssameseNumerals(currentCount)} / ${toAssameseNumerals(totalCount)}`;
    case 'assamese_just_n':
      return `${toAssameseNumerals(currentCount)}`;
    case 'custom': {
      const template = options.customTemplate || 'Page {n} of {total}';
      return template
        .replace(/{n}/g, String(currentCount))
        .replace(/{total}/g, String(totalCount))
        .replace(/{assamese_n}/g, toAssameseNumerals(currentCount))
        .replace(/{assamese_total}/g, toAssameseNumerals(totalCount));
    }
    default:
      return `${currentCount} / ${totalCount}`;
  }
}

/**
 * Calculates visual coordinate bounding box for a given page dimension and position preset,
 * or returns manual custom drag coordinates if manual positioning is enabled.
 */
export function calculatePageNumberBounds(
  pageVisualWidth: number,
  pageVisualHeight: number,
  textEstimatedWidth: number,
  textHeight: number,
  options: PageNumberingOptions
): { x: number; yTop: number; yBottomLeft: number; width: number; height: number } {
  const paddingX = options.includeBackgroundPill ? 14 : 0;
  const paddingY = options.includeBackgroundPill ? 6 : 0;
  const boxWidth = textEstimatedWidth + paddingX * 2;
  const boxHeight = textHeight + paddingY * 2;

  let x = 0;
  let yTop = 0;
  let yBottom = options.bottomMargin;

  // Check if manual drag coordinate mode is active
  if (options.positionMode === 'manual_drag') {
    if (options.manualXPercent !== undefined && options.manualYPercent !== undefined) {
      x = Math.round((options.manualXPercent / 100) * pageVisualWidth);
      yTop = Math.round((options.manualYPercent / 100) * pageVisualHeight);
    } else if (options.manualX !== undefined && options.manualY !== undefined) {
      x = options.manualX;
      yTop = options.manualY;
    } else {
      // Default fallback
      x = Math.round((pageVisualWidth - boxWidth) / 2);
      yTop = pageVisualHeight - boxHeight - options.bottomMargin;
    }

    // Clamp within bounds
    x = Math.max(4, Math.min(pageVisualWidth - boxWidth - 4, x));
    yTop = Math.max(4, Math.min(pageVisualHeight - boxHeight - 4, yTop));
    yBottom = pageVisualHeight - yTop - boxHeight;

    return {
      x,
      yTop,
      yBottomLeft: yBottom,
      width: boxWidth,
      height: boxHeight,
    };
  }

  // Otherwise calculate based on position preset
  switch (options.position) {
    case 'bottom-center':
      x = Math.round((pageVisualWidth - boxWidth) / 2);
      yBottom = options.bottomMargin;
      break;
    case 'bottom-right':
      x = Math.round(pageVisualWidth - boxWidth - options.sideMargin);
      yBottom = options.bottomMargin;
      break;
    case 'bottom-left':
      x = options.sideMargin;
      yBottom = options.bottomMargin;
      break;
    case 'top-center':
      x = Math.round((pageVisualWidth - boxWidth) / 2);
      yBottom = Math.round(pageVisualHeight - boxHeight - options.bottomMargin);
      break;
    case 'top-right':
      x = Math.round(pageVisualWidth - boxWidth - options.sideMargin);
      yBottom = Math.round(pageVisualHeight - boxHeight - options.bottomMargin);
      break;
    case 'top-left':
      x = options.sideMargin;
      yBottom = Math.round(pageVisualHeight - boxHeight - options.bottomMargin);
      break;
  }

  // Clamping within page bounds
  x = Math.max(8, Math.min(pageVisualWidth - boxWidth - 8, x));
  yBottom = Math.max(8, Math.min(pageVisualHeight - boxHeight - 8, yBottom));
  yTop = pageVisualHeight - yBottom - boxHeight;

  return {
    x,
    yTop,
    yBottomLeft: yBottom,
    width: boxWidth,
    height: boxHeight,
  };
}

/**
 * Creates a crystal-clear PNG image data URL or byte buffer of the formatted page number
 * for rendering on PDF or Canvas. Handles Bengali/Assamese Unicode characters seamlessly.
 */
export async function renderPageNumberBadgeToPng(
  text: string,
  fontSizePt: number,
  fontColorHex: string,
  includePill: boolean
): Promise<{
  pngBytes: Uint8Array;
  widthPt: number;
  heightPt: number;
}> {
  const scaleFactor = 3; // 3x retina resolution for razor-sharp vector-like rendering
  const fontPt = Math.max(8, fontSizePt);
  const pxFontSize = fontPt * 1.333 * scaleFactor;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Measure text
  ctx.font = `600 ${pxFontSize}px "Noto Sans", "Noto Sans Bengali", system-ui, -apple-system, sans-serif`;
  const metrics = ctx.measureText(text);
  const textPxW = metrics.width;
  const textPxH = pxFontSize * 1.1;

  const padXPx = includePill ? pxFontSize * 0.9 : 0;
  const padYPx = includePill ? pxFontSize * 0.4 : 0;

  const totalPxW = Math.ceil(textPxW + padXPx * 2);
  const totalPxH = Math.ceil(textPxH + padYPx * 2);

  canvas.width = totalPxW;
  canvas.height = totalPxH;

  const renderCtx = canvas.getContext('2d')!;
  renderCtx.imageSmoothingEnabled = true;
  renderCtx.imageSmoothingQuality = 'high';

  if (includePill) {
    const radius = totalPxH / 2;
    renderCtx.save();
    renderCtx.beginPath();
    renderCtx.roundRect(1, 1, totalPxW - 2, totalPxH - 2, radius);
    renderCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    renderCtx.fill();
    renderCtx.lineWidth = 1.5 * scaleFactor;
    renderCtx.strokeStyle = 'rgba(203, 213, 225, 0.8)'; // slate-300
    renderCtx.stroke();
    renderCtx.restore();
  }

  // Draw text
  renderCtx.font = `600 ${pxFontSize}px "Noto Sans", "Noto Sans Bengali", system-ui, -apple-system, sans-serif`;
  renderCtx.fillStyle = fontColorHex;
  renderCtx.textAlign = 'center';
  renderCtx.textBaseline = 'middle';
  renderCtx.fillText(text, totalPxW / 2, totalPxH / 2 + 1);

  // Convert to PNG blob & bytes
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
  });

  const arrayBuffer = await blob.arrayBuffer();
  const pngBytes = new Uint8Array(arrayBuffer);

  const widthPt = (totalPxW / scaleFactor) / 1.333;
  const heightPt = (totalPxH / scaleFactor) / 1.333;

  return {
    pngBytes,
    widthPt,
    heightPt,
  };
}
