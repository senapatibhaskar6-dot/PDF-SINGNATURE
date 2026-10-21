export interface PageInfo {
  pageNumber: number; // 1-indexed
  width: number; // in points (pt)
  height: number; // in points (pt)
}

export interface PdfDocumentInfo {
  name: string;
  size: number;
  pageCount: number;
  pages: PageInfo[];
  rawBytes: Uint8Array;
}

export interface SignaturePlacement {
  id: string;
  pageNumber: number; // 1-indexed (e.g. 1, 2, 3)
  x: number; // in points
  y: number; // in points
  width: number; // in points
  height: number; // in points
  origin: 'bottom-left' | 'top-left'; // PDF standard is bottom-left, screen standard is top-left
}

export interface BackgroundRemovalOptions {
  threshold: number; // 120 - 255 (default: 215)
  feather: number; // 0 - 50 (smoothing)
  shadowRemoval: number; // 0 - 100 (cleans phone shadows and off-white paper tint)
  inkMode: 'original' | 'darken' | 'navy' | 'black' | 'high_contrast';
  autoTrim: boolean; // Crop empty transparent borders
  cleanPreset?: 'crystal' | 'phone_photo' | 'scan' | 'custom';
}

export interface ProcessedSignature {
  originalDataUrl: string;
  processedDataUrl: string;
  pngBytes: Uint8Array;
  width: number; // pixels
  height: number; // pixels
  aspectRatio: number;
}
