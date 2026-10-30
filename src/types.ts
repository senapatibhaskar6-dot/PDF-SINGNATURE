export interface PageInfo {
  pageNumber: number; // 1-indexed
  width: number; // visual width in points (pt)
  height: number; // visual height in points (pt)
  unrotatedWidth: number; // unrotated media box width
  unrotatedHeight: number; // unrotated media box height
  rotation: number; // 0, 90, 180, 270
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

export type CompressionPreset = 'extreme_800kb' | 'balanced_1mb' | 'crisp_hd' | 'custom';

export interface PdfCompressionOptions {
  enabled: boolean;
  preset: CompressionPreset;
  targetSizeKb: number; // e.g. 800 KB
  quality: number; // 0.1 to 1.0 (default 0.72)
  maxDimension: number; // max width/height in px (e.g. 1400)
  useGrayscale: boolean;
  removeMetadata: boolean;
}

export interface CompressionResult {
  originalBytes: number;
  compressedBytes: number;
  reductionPercentage: number;
  bytes: Uint8Array;
  blob: Blob;
  url: string;
  pageCount: number;
}

export interface BatchSigningConfig {
  scope: 'all' | 'range' | 'odd' | 'even' | 'last_only';
  rangeStart?: number;
  rangeEnd?: number;
  positionPreset: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'same_as_current';
  customCoords?: { x: number; y: number; width: number; height: number };
  width?: number;
  height?: number;
}

export type MobileViewTab = 'document' | 'signature' | 'batch' | 'compress';
