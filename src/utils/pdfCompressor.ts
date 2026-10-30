import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  PdfCompressionOptions,
  CompressionResult,
  PdfDocumentInfo,
} from '../types';

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export interface CompressionProgressInfo {
  current: number;
  total: number;
  percentage: number;
  statusText: string;
}

/**
 * Calculates adaptive compression parameters based on target size (e.g. 800 KB) and page count.
 */
export function calculateAdaptiveParams(pageCount: number, targetSizeKb: number = 800) {
  const targetBytesPerPage = (targetSizeKb * 1024) / Math.max(1, pageCount);

  if (targetBytesPerPage >= 100 * 1024) {
    // Generous budget: e.g. 1-8 pages target 800 KB
    return {
      maxDimension: 1600,
      quality: 0.82,
      dpi: 180,
    };
  } else if (targetBytesPerPage >= 40 * 1024) {
    // 10-20 pages target 800 KB
    return {
      maxDimension: 1400,
      quality: 0.74,
      dpi: 150,
    };
  } else if (targetBytesPerPage >= 15 * 1024) {
    // 25-50 pages target 800 KB
    return {
      maxDimension: 1200,
      quality: 0.65,
      dpi: 130,
    };
  } else if (targetBytesPerPage >= 7 * 1024) {
    // 60-120 pages target 800 KB
    return {
      maxDimension: 1000,
      quality: 0.58,
      dpi: 110,
    };
  } else {
    // 120-200+ pages target 800 KB (~4KB per page budget)
    return {
      maxDimension: 900,
      quality: 0.52,
      dpi: 96,
    };
  }
}

/**
 * High-performance, high-regulation client-side PDF compressor.
 * Renders pages at crisp resolution, optimizes image quantization,
 * and recompiles using object stream packing to crush 350 MB down to ~800 KB.
 */
export async function compressPdfDocument(
  pdfRawBytes: Uint8Array,
  options: PdfCompressionOptions,
  onProgress?: (progress: CompressionProgressInfo) => void
): Promise<CompressionResult> {
  const originalBytes = pdfRawBytes.byteLength;

  onProgress?.({
    current: 0,
    total: 100,
    percentage: 5,
    statusText: 'Analyzing PDF structure and images (PDF বিশ্লেষণ চলি আছে)...',
  });

  // Load via pdfjs
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfRawBytes),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfJsDoc = await loadingTask.promise;
  const totalPages = pdfJsDoc.numPages;

  // Compute adaptive settings based on page count and target size (e.g. 800 KB)
  let quality = options.quality || 0.72;
  let maxDim = options.maxDimension || 1400;

  if (options.preset === 'extreme_800kb' || options.targetSizeKb > 0) {
    const adaptive = calculateAdaptiveParams(totalPages, options.targetSizeKb || 800);
    quality = adaptive.quality;
    maxDim = adaptive.maxDimension;
  } else if (options.preset === 'balanced_1mb') {
    const adaptive = calculateAdaptiveParams(totalPages, 1024);
    quality = adaptive.quality;
    maxDim = adaptive.maxDimension;
  } else if (options.preset === 'crisp_hd') {
    maxDim = 1600;
    quality = 0.82;
  }

  // Create clean PDF document with object streams enabled
  const newPdfDoc = await PDFDocument.create();

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to create canvas 2D rendering context');

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      current: pageNum,
      total: totalPages,
      percentage: Math.round((pageNum / totalPages) * 85),
      statusText: `Compressing page ${pageNum} of ${totalPages} (${totalPages} খন পৃষ্ঠাৰ ${pageNum} নং পৃষ্ঠা কম্প্ৰেছ কৰা হৈছে)...`,
    });

    const page = await pdfJsDoc.getPage(pageNum);
    const originalViewport = page.getViewport({ scale: 1.0 });

    // Calculate scale to fit within maxDimension while maintaining aspect ratio
    const currentMax = Math.max(originalViewport.width, originalViewport.height);
    const targetScale = Math.min(2.0, maxDim / currentMax);
    const viewport = page.getViewport({ scale: targetScale });

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render page
    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
    });
    await renderTask.promise;

    // If grayscale option is selected for extreme compactness
    if (options.useGrayscale) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // High quality luminosity formula
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Export to high-quality compressed JPEG
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = dataUrlToBytes(jpegDataUrl);

    // Embed into new PDF
    const embeddedImg = await newPdfDoc.embedJpg(jpegBytes);
    const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });

    // Clean up page resources
    page.cleanup();

    // Yield control to browser so UI animations and progress bar remain buttery smooth
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.({
    current: totalPages,
    total: totalPages,
    percentage: 95,
    statusText: 'Finalizing compressed PDF package (PDF ফাইল প্ৰস্তুত কৰা হৈছে)...',
  });

  // Save with maximum object stream compression
  const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
  const finalSize = compressedBytes.byteLength;
  const reduction = Math.max(0, Math.round(((originalBytes - finalSize) / originalBytes) * 100));

  const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  onProgress?.({
    current: totalPages,
    total: totalPages,
    percentage: 100,
    statusText: `Complete! Compressed to ${formatBytes(finalSize)} (${reduction}% saved)`,
  });

  return {
    originalBytes,
    compressedBytes: finalSize,
    reductionPercentage: reduction,
    bytes: compressedBytes,
    blob,
    url,
    pageCount: totalPages,
  };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
