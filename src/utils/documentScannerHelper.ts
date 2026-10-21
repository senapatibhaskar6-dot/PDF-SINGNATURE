import { PDFDocument } from 'pdf-lib';
import { loadImage, dataUriToUint8Array } from './imageProcessor';

export type DocumentFilterType = 'magic' | 'bw' | 'color' | 'original';

export interface ScannedPageItem {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: DocumentFilterType;
}

/**
 * Applies document enhancement filters (Magic Clean, B&W, Color, Original)
 * and handles 90°/180° rotations on a captured canvas or image.
 */
export async function processScannedImage(
  dataUrl: string,
  rotation: number = 0,
  filter: DocumentFilterType = 'magic'
): Promise<{ processedDataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Determine canvas dimensions after rotation
  const rot = ((rotation % 360) + 360) % 360;
  const isSwap = rot === 90 || rot === 270;
  const targetW = isSwap ? origH : origW;
  const targetH = isSwap ? origW : origH;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not get canvas context for scanner processing');
  }

  // Draw with rotation around center
  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -origW / 2, -origH / 2);
  ctx.restore();

  // If filter is original, just return JPEG
  if (filter === 'original') {
    return {
      processedDataUrl: canvas.toDataURL('image/jpeg', 0.92),
      width: targetW,
      height: targetH,
    };
  }

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;
  const pixelCount = targetW * targetH;

  if (filter === 'bw') {
    // High-contrast clean black & white document
    // Sample luminance average
    let sumLum = 0;
    const step = Math.max(1, Math.floor(pixelCount / 5000));
    let samples = 0;
    for (let i = 0; i < data.length; i += 4 * step) {
      sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      samples++;
    }
    const avgLum = samples > 0 ? sumLum / samples : 128;
    const threshold = Math.max(110, Math.min(180, avgLum * 0.88));

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = lum > threshold ? 255 : 15;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (filter === 'magic') {
    // CamScanner-style "Magic Clean":
    // Whitens uneven phone shadows, paper texture, yellowing, while sharpening dark ink text
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > 155) {
        // High background: push smoothly to pure white
        const boostFactor = Math.min(1, (lum - 155) / 75);
        data[i] = Math.min(255, Math.round(r + (255 - r) * boostFactor));
        data[i + 1] = Math.min(255, Math.round(g + (255 - g) * boostFactor));
        data[i + 2] = Math.min(255, Math.round(b + (255 - b) * boostFactor));
      } else {
        // Text / ink: enhance contrast and darken slightly
        const darkFactor = 0.85;
        data[i] = Math.max(0, Math.round(r * darkFactor));
        data[i + 1] = Math.max(0, Math.round(g * darkFactor));
        data[i + 2] = Math.max(0, Math.round(b * darkFactor));
      }
    }
  } else if (filter === 'color') {
    // Enhanced color: slight contrast stretch + saturation
    for (let i = 0; i < data.length; i += 4) {
      // Contrast stretch
      for (let c = 0; c < 3; c++) {
        const v = data[i + c];
        // S-curve contrast boost
        const norm = v / 255;
        const stretched = norm < 0.5 ? 2 * norm * norm : 1 - 2 * (1 - norm) * (1 - norm);
        data[i + c] = Math.min(255, Math.max(0, Math.round(stretched * 255)));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    processedDataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: targetW,
    height: targetH,
  };
}

/**
 * Builds a multi-page PDF document from scanned pages.
 */
export async function createPdfFromScannedPages(
  pages: ScannedPageItem[],
  format: 'A4' | 'fit' = 'A4',
  documentTitle: string = 'Scanned_Document'
): Promise<{ pdfBytes: Uint8Array; blob: Blob; file: File }> {
  if (pages.length === 0) {
    throw new Error('At least one page is required to generate a PDF');
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(documentTitle);
  pdfDoc.setAuthor('Document Scanner');

  // A4 dimensions in points (72 points = 1 inch)
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const MARGIN = 18; // 18pt clean printable margin

  for (const pageItem of pages) {
    const imgBytes = dataUriToUint8Array(pageItem.processedDataUrl);
    // Dynamically embed as PNG or JPG based on data URI / header
    let embeddedImg;
    if (pageItem.processedDataUrl.startsWith('data:image/png')) {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
    } else {
      try {
        embeddedImg = await pdfDoc.embedJpg(imgBytes);
      } catch {
        embeddedImg = await pdfDoc.embedPng(imgBytes);
      }
    }

    let pageWidth = A4_WIDTH;
    let pageHeight = A4_HEIGHT;
    let drawX = 0;
    let drawY = 0;
    let drawW = 0;
    let drawH = 0;

    if (format === 'A4') {
      const isLandscape = pageItem.width > pageItem.height;
      pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
      pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;

      const availW = pageWidth - MARGIN * 2;
      const availH = pageHeight - MARGIN * 2;
      const imgAspect = pageItem.width / pageItem.height;
      const availAspect = availW / availH;

      if (imgAspect > availAspect) {
        drawW = availW;
        drawH = availW / imgAspect;
      } else {
        drawH = availH;
        drawW = availH * imgAspect;
      }

      drawX = MARGIN + (availW - drawW) / 2;
      drawY = MARGIN + (availH - drawH) / 2;
    } else {
      // Fit to exact aspect ratio (scaled to comfortable standard resolution)
      const maxDim = 842;
      const scale = Math.min(maxDim / Math.max(pageItem.width, pageItem.height), 1);
      pageWidth = Math.round(pageItem.width * scale);
      pageHeight = Math.round(pageItem.height * scale);
      drawX = 0;
      drawY = 0;
      drawW = pageWidth;
      drawH = pageHeight;
    }

    const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pdfPage.drawImage(embeddedImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const fileName = `${documentTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  return { pdfBytes, blob, file };
}

/**
 * Plays a quick subtle shutter sound when a page photo is taken.
 */
export function playShutterSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore audio errors on un-interacted policy
  }
}
