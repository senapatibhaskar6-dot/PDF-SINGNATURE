import { BackgroundRemovalOptions, ProcessedSignature } from '../types';

export function dataUriToUint8Array(dataUri: string): Uint8Array {
  const base64Index = dataUri.indexOf(';base64,');
  if (base64Index === -1) {
    throw new Error('Invalid data URI: missing ;base64,');
  }
  const base64 = dataUri.substring(base64Index + 8);
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Automatically removes white/light background from a signature image,
 * rendering it transparent with smooth antialiased edges.
 */
export async function processSignatureImage(
  imageSource: string | File,
  options: BackgroundRemovalOptions
): Promise<ProcessedSignature> {
  let originalDataUrl: string;

  if (typeof imageSource === 'string') {
    originalDataUrl = imageSource;
  } else {
    originalDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  const img = await loadImage(originalDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to obtain canvas 2D rendering context');
  }

  // Draw original image
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const { threshold, feather, inkMode, autoTrim } = options;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasInkPixels = false;

  const featherSpan = Math.max(1, feather);
  const lowerBound = Math.max(0, threshold - featherSpan);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const initialA = data[i + 3];

    if (initialA === 0) continue;

    // Perceived lightness (standard Rec. 709 luminance)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    let targetAlpha = 255;

    if (luminance >= threshold) {
      // Completely white / light paper background -> Transparent
      targetAlpha = 0;
    } else if (luminance > lowerBound) {
      // In the feather transition zone -> Smooth anti-aliased edge
      const ratio = (luminance - lowerBound) / featherSpan;
      targetAlpha = Math.round(255 * (1 - ratio));
    } else {
      // Pure ink stroke
      targetAlpha = 255;
    }

    // Combine with original alpha
    const finalAlpha = Math.min(initialA, targetAlpha);
    data[i + 3] = finalAlpha;

    if (finalAlpha > 15) {
      hasInkPixels = true;
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // Adjust ink color if requested
      const inkDensity = 1 - luminance / 255; // 1 is darkest ink, 0 is light
      if (inkMode === 'black') {
        data[i] = 15;
        data[i + 1] = 23;
        data[i + 2] = 42;
      } else if (inkMode === 'navy') {
        data[i] = 30;
        data[i + 1] = 58;
        data[i + 2] = 138;
      } else if (inkMode === 'darken') {
        data[i] = Math.round(r * 0.7);
        data[i + 1] = Math.round(g * 0.7);
        data[i + 2] = Math.round(b * 0.7);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Optional: auto-trim transparent margins so the signature box tightly bounds the ink
  let finalCanvas = canvas;
  if (autoTrim && hasInkPixels && maxX > minX && maxY > minY) {
    const pad = 4;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cropCtx = croppedCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      finalCanvas = croppedCanvas;
    }
  }

  const processedDataUrl = finalCanvas.toDataURL('image/png');
  const pngBytes = dataUriToUint8Array(processedDataUrl);

  const w = finalCanvas.width;
  const h = finalCanvas.height;

  return {
    originalDataUrl,
    processedDataUrl,
    pngBytes,
    width: w,
    height: h,
    aspectRatio: w / Math.max(1, h),
  };
}

/**
 * Creates a clean sample signature on a simulated paper background
 * so users can test immediately without uploading a file.
 */
export function generateSampleSignatureDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background is slight off-white paper with faint texture
  ctx.fillStyle = '#fdfdfb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Signature ink styling (dark blue ballpoint/fountain pen look)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw cursive "Alexander Wright" flow
  ctx.beginPath();
  // 'A'
  ctx.moveTo(80, 160);
  ctx.quadraticCurveTo(110, 60, 140, 70);
  ctx.quadraticCurveTo(145, 140, 150, 170);
  ctx.moveTo(95, 125);
  ctx.lineTo(145, 120);

  // 'l-e-x'
  ctx.moveTo(150, 165);
  ctx.bezierCurveTo(160, 110, 175, 100, 175, 160);
  ctx.bezierCurveTo(185, 150, 195, 150, 195, 165);
  ctx.bezierCurveTo(205, 150, 220, 145, 225, 165);

  // 'a-n-d-e-r'
  ctx.bezierCurveTo(240, 140, 255, 140, 255, 165);
  ctx.bezierCurveTo(270, 145, 285, 145, 290, 165);
  ctx.bezierCurveTo(300, 110, 310, 105, 310, 165);
  ctx.bezierCurveTo(325, 145, 340, 150, 345, 165);

  // 'W' flourish
  ctx.moveTo(375, 170);
  ctx.bezierCurveTo(385, 80, 400, 70, 410, 150);
  ctx.bezierCurveTo(420, 85, 435, 75, 445, 155);
  ctx.bezierCurveTo(455, 130, 470, 135, 480, 165);

  // Under-flourish tail
  ctx.bezierCurveTo(420, 200, 250, 210, 120, 190);
  ctx.stroke();

  // Subtle dot
  ctx.beginPath();
  ctx.arc(495, 162, 2.5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
