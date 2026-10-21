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
 * High-precision signature background cleaner.
 * Handles uneven phone shadows, paper texture, yellow tints, and converts ink
 * into a crystal-clear, transparent-background signature.
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
  const { threshold, feather, shadowRemoval = 40, inkMode, autoTrim } = options;

  // 1. Sample corners/edges to detect ambient paper brightness
  let cornerLuminanceSum = 0;
  let cornerSampleCount = 0;
  const samplePoints = [
    [4, 4],
    [canvas.width - 5, 4],
    [4, canvas.height - 5],
    [canvas.width - 5, canvas.height - 5],
    [Math.floor(canvas.width / 2), 4],
    [Math.floor(canvas.width / 2), canvas.height - 5],
  ];

  for (const [sx, sy] of samplePoints) {
    if (sx >= 0 && sx < canvas.width && sy >= 0 && sy < canvas.height) {
      const idx = (sy * canvas.width + sx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      cornerLuminanceSum += luma;
      cornerSampleCount++;
    }
  }

  const detectedPaperLuma = cornerSampleCount > 0 ? cornerLuminanceSum / cornerSampleCount : 240;

  // 2. Dynamic threshold calculation
  const featherSpan = Math.max(1, feather);
  const shadowFactor = Math.min(65, (shadowRemoval / 100) * 55);

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasInkPixels = false;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const initialA = data[i + 3];

    if (initialA === 0) continue;

    // Rec. 709 Luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Chromatic Saturation (0.0 to 1.0)
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const chroma = maxVal - minVal;
    const saturation = maxVal > 0 ? chroma / maxVal : 0;

    // Paper background is generally neutral/gray/yellow with low chroma.
    // Colored ink (blue pen, purple) has higher chroma.
    // If pixel is low saturation, we aggressively apply shadowRemoval to erase paper shadows.
    let effectiveThreshold = threshold;

    if (detectedPaperLuma < threshold) {
      // If photo has overall lower lighting, compensate relative to detected paper
      effectiveThreshold = Math.min(threshold, detectedPaperLuma - 5);
    }

    if (saturation < 0.18) {
      // Erase phone camera shadows on paper
      effectiveThreshold -= shadowFactor;
    }

    effectiveThreshold = Math.max(80, effectiveThreshold);
    const lowerBound = Math.max(0, effectiveThreshold - featherSpan);

    let targetAlpha = 255;

    if (luminance >= effectiveThreshold) {
      // Paper background -> 100% crystal clean transparent
      targetAlpha = 0;
    } else if (luminance > lowerBound) {
      // Soft antialiased pen stroke edge
      const ratio = (luminance - lowerBound) / featherSpan;
      targetAlpha = Math.round(255 * (1 - ratio));
    } else {
      // Solid ink stroke
      targetAlpha = 255;
    }

    const finalAlpha = Math.min(initialA, targetAlpha);
    data[i + 3] = finalAlpha;

    if (finalAlpha > 12) {
      hasInkPixels = true;
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // Ink Styling
      if (inkMode === 'high_contrast') {
        // Crisp, ultra-clean black ink
        data[i] = 10;
        data[i + 1] = 15;
        data[i + 2] = 25;
      } else if (inkMode === 'black') {
        data[i] = 15;
        data[i + 1] = 23;
        data[i + 2] = 42;
      } else if (inkMode === 'navy') {
        data[i] = 28;
        data[i + 1] = 54;
        data[i + 2] = 140;
      } else if (inkMode === 'darken') {
        // Enhance ink contrast while retaining subtle ballpoint ink texture
        const contrastRatio = Math.max(0.4, luminance / 255);
        data[i] = Math.round(r * contrastRatio * 0.7);
        data[i + 1] = Math.round(g * contrastRatio * 0.7);
        data[i + 2] = Math.round(b * contrastRatio * 0.7);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // 3. Auto-trim borders with clean padding
  let finalCanvas = canvas;
  if (autoTrim && hasInkPixels && maxX > minX && maxY > minY) {
    const pad = 6;
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
  ctx.fillStyle = '#f8f8f6';
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
