import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import {
  PdfDocumentInfo,
  SignaturePlacement,
  PageInfo,
  PdfCompressionOptions,
  BatchSigningConfig,
  PageNumberingOptions,
} from '../types';
import { compressPdfDocument, CompressionProgressInfo } from './pdfCompressor';
import {
  formatPageNumberText,
  calculatePageNumberBounds,
  renderPageNumberBadgeToPng,
} from './pageNumberHelper';

/**
 * Loads a PDF file and extracts page counts, rotation angles, and dimensions in points.
 */
export async function loadPdfDocument(fileOrBytes: File | ArrayBuffer | Uint8Array, fileName?: string): Promise<PdfDocumentInfo> {
  let bytes: Uint8Array;
  let name = fileName || 'document.pdf';
  let size = 0;

  if (fileOrBytes instanceof File) {
    name = fileOrBytes.name;
    size = fileOrBytes.size;
    const arrayBuffer = await fileOrBytes.arrayBuffer();
    bytes = new Uint8Array(arrayBuffer);
  } else if (fileOrBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBytes);
    size = bytes.byteLength;
  } else {
    bytes = fileOrBytes;
    size = bytes.byteLength;
  }

  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pages: PageInfo[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const isTransposed = rot === 90 || rot === 270;

    pages.push({
      pageNumber: i + 1,
      width: Math.round(isTransposed ? height : width),
      height: Math.round(isTransposed ? width : height),
      unrotatedWidth: Math.round(width),
      unrotatedHeight: Math.round(height),
      rotation: rot,
    });
  }

  return {
    name,
    size,
    pageCount,
    pages,
    rawBytes: bytes,
  };
}

/**
 * Rotates specific pages or all pages of the PDF by +90° (clockwise) or -90° (counter-clockwise).
 */
export async function rotatePdfDocument(
  pdfInfo: PdfDocumentInfo,
  targetPageNumber: number | 'all',
  deltaDegrees: number
): Promise<PdfDocumentInfo> {
  const pdfDoc = await PDFDocument.load(pdfInfo.rawBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    if (targetPageNumber === 'all' || targetPageNumber === i + 1) {
      const page = pdfDoc.getPage(i);
      const currentAngle = page.getRotation().angle;
      const newAngle = ((currentAngle + deltaDegrees) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  const newBytes = await pdfDoc.save({ useObjectStreams: true });
  return loadPdfDocument(newBytes, pdfInfo.name);
}

/**
 * Generates signature placements across multiple pages (e.g., 200 pages at once)
 * based on position presets or coordinates.
 */
export function batchApplySignaturesToDocument(
  pages: PageInfo[],
  config: BatchSigningConfig,
  signatureAspectRatio: number,
  basePlacement?: SignaturePlacement
): SignaturePlacement[] {
  const totalPages = pages.length;
  let targetPages: number[] = [];

  if (config.scope === 'all') {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (config.scope === 'range') {
    const start = Math.max(1, config.rangeStart || 1);
    const end = Math.min(totalPages, config.rangeEnd || totalPages);
    for (let p = start; p <= end; p++) {
      targetPages.push(p);
    }
  } else if (config.scope === 'odd') {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
  } else if (config.scope === 'even') {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
  } else if (config.scope === 'last_only') {
    targetPages = [totalPages];
  }

  const result: SignaturePlacement[] = [];

  for (const pageNum of targetPages) {
    const pageMeta = pages.find((p) => p.pageNumber === pageNum) || pages[0];
    const width = config.width || basePlacement?.width || Math.min(160, Math.round(pageMeta.width * 0.28));
    const height = config.height || (basePlacement ? basePlacement.height : Math.round(width / (signatureAspectRatio || 2.8)));

    const margin = 50;
    let x = margin;
    let y = margin;

    if (config.positionPreset === 'bottom-right') {
      x = Math.max(margin, pageMeta.width - width - margin);
      y = margin;
    } else if (config.positionPreset === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (config.positionPreset === 'bottom-center') {
      x = Math.max(margin, Math.round((pageMeta.width - width) / 2));
      y = margin;
    } else if (config.positionPreset === 'top-right') {
      x = Math.max(margin, pageMeta.width - width - margin);
      y = Math.max(margin, pageMeta.height - height - margin);
    } else if (config.positionPreset === 'same_as_current' && basePlacement) {
      x = Math.min(pageMeta.width - width, basePlacement.x);
      y = Math.min(pageMeta.height - height, basePlacement.y);
    } else {
      // Default to bottom right
      x = Math.max(margin, pageMeta.width - width - margin);
      y = margin;
    }

    result.push({
      id: `batch-p${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageNumber: pageNum,
      x,
      y,
      width,
      height,
      origin: 'bottom-left',
    });
  }

  return result;
}

/**
 * Embeds the transparent signature onto the specified pages and coordinates,
 * taking into account page rotation so signatures appear upright and in the exact position.
 * Supports bulk placement on up to 200+ pages and optional high-regulation compression.
 */
export async function applySignaturesAndExport(
  pdfDocInfo: PdfDocumentInfo,
  signaturePngBytes: Uint8Array,
  placements: SignaturePlacement[],
  compressionOptions?: PdfCompressionOptions,
  onProgress?: (progress: CompressionProgressInfo) => void,
  pageNumbering?: PageNumberingOptions
): Promise<{
  bytes: Uint8Array;
  blob: Blob;
  url: string;
  originalSize: number;
  finalSize: number;
  reductionPercentage: number;
  isCompressed: boolean;
}> {
  const originalSize = pdfDocInfo.rawBytes.byteLength;
  const pdfDoc = await PDFDocument.load(pdfDocInfo.rawBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  onProgress?.({
    current: 0,
    total: placements.length,
    percentage: 10,
    statusText: `Embedding signatures across ${placements.length} page instances (${placements.length} টা স্থানত চহী বহুওৱা হৈছে)...`,
  });

  const pngImage = await pdfDoc.embedPng(signaturePngBytes);

  let processedCount = 0;
  for (const placement of placements) {
    const pageIndex = placement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) {
      continue;
    }

    const page = pdfDoc.getPage(pageIndex);
    const { width: W0, height: H0 } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;

    // Determine visual dimensions
    const visualHeight = rot === 90 || rot === 270 ? W0 : H0;

    // Calculate visual top-left coordinates (xScreen, yScreen)
    let xScreen = placement.x;
    let yScreen = placement.y;
    if (placement.origin === 'bottom-left') {
      yScreen = visualHeight - placement.y - placement.height;
    }

    // Map screen top-left coordinates to PDF user space depending on page rotation
    let drawParams: any;

    if (rot === 0) {
      drawParams = {
        x: xScreen,
        y: H0 - yScreen - placement.height,
        width: placement.width,
        height: placement.height,
        rotate: degrees(0),
      };
    } else if (rot === 90) {
      drawParams = {
        x: yScreen + placement.height,
        y: xScreen,
        width: placement.width,
        height: placement.height,
        rotate: degrees(90),
      };
    } else if (rot === 180) {
      drawParams = {
        x: W0 - xScreen,
        y: yScreen + placement.height,
        width: placement.width,
        height: placement.height,
        rotate: degrees(180),
      };
    } else {
      // rot === 270
      drawParams = {
        x: W0 - yScreen - placement.height,
        y: H0 - xScreen,
        width: placement.width,
        height: placement.height,
        rotate: degrees(270),
      };
    }

    page.drawImage(pngImage, drawParams);

    processedCount++;
    if (processedCount % 10 === 0 || processedCount === placements.length) {
      onProgress?.({
        current: processedCount,
        total: placements.length,
        percentage: Math.round((processedCount / placements.length) * (compressionOptions?.enabled ? 30 : 70)),
        statusText: `Applied signature to ${processedCount} of ${placements.length} pages (${processedCount}/${placements.length} পৃষ্ঠা সম্পূৰ্ণ)...`,
      });
      if (processedCount % 25 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  // Embed page numbers across pages if enabled
  if (pageNumbering?.enabled) {
    onProgress?.({
      current: 0,
      total: totalPages,
      percentage: compressionOptions?.enabled ? 35 : 75,
      statusText: `Embedding page numbers across pages (পেজ নম্বৰ বহুওৱা হৈছে)...`,
    });

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageNumStr = formatPageNumberText(pageIdx, totalPages, pageNumbering);
      if (!pageNumStr) continue;

      const page = pdfDoc.getPage(pageIdx);
      const { width: W0, height: H0 } = page.getSize();
      const rot = ((page.getRotation().angle % 360) + 360) % 360;
      const visualWidth = rot === 90 || rot === 270 ? H0 : W0;
      const visualHeight = rot === 90 || rot === 270 ? W0 : H0;

      // Render crisp badge
      const badge = await renderPageNumberBadgeToPng(
        pageNumStr,
        pageNumbering.fontSize,
        pageNumbering.fontColor,
        pageNumbering.includeBackgroundPill
      );

      const bounds = calculatePageNumberBounds(
        visualWidth,
        visualHeight,
        badge.widthPt,
        badge.heightPt,
        pageNumbering
      );

      const badgeImage = await pdfDoc.embedPng(badge.pngBytes);
      const bw = badge.widthPt;
      const bh = badge.heightPt;
      const xScreen = bounds.x;
      const yScreen = bounds.yTop;

      let drawParams: any;
      if (rot === 0) {
        drawParams = {
          x: xScreen,
          y: H0 - yScreen - bh,
          width: bw,
          height: bh,
          rotate: degrees(0),
        };
      } else if (rot === 90) {
        drawParams = {
          x: yScreen + bh,
          y: xScreen,
          width: bw,
          height: bh,
          rotate: degrees(90),
        };
      } else if (rot === 180) {
        drawParams = {
          x: W0 - xScreen,
          y: yScreen + bh,
          width: bw,
          height: bh,
          rotate: degrees(180),
        };
      } else {
        // rot === 270
        drawParams = {
          x: W0 - yScreen - bh,
          y: H0 - xScreen,
          width: bw,
          height: bh,
          rotate: degrees(270),
        };
      }

      page.drawImage(badgeImage, drawParams);

      if ((pageIdx + 1) % 15 === 0 || pageIdx === totalPages - 1) {
        onProgress?.({
          current: pageIdx + 1,
          total: totalPages,
          percentage:
            (compressionOptions?.enabled ? 35 : 75) +
            Math.round(((pageIdx + 1) / totalPages) * (compressionOptions?.enabled ? 10 : 20)),
          statusText: `Numbered ${pageIdx + 1} of ${totalPages} pages (${pageIdx + 1}/${totalPages} পৃষ্ঠাত নম্বৰ বহুওৱা হ'ল)...`,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  // Save base signed document
  const signedBytes = await pdfDoc.save({ useObjectStreams: true });

  // If compression is requested (e.g. 350 MB to 800 KB, or target size), run compressor engine
  if (compressionOptions?.enabled) {
    onProgress?.({
      current: 0,
      total: totalPages,
      percentage: 45,
      statusText: `Starting high-regulation quality compression to ~${compressionOptions.targetSizeKb} KB (৮০০ KB কম্প্ৰেছন চলি আছে)...`,
    });

    const compressResult = await compressPdfDocument(
      signedBytes,
      compressionOptions,
      (prog) => {
        onProgress?.({
          current: prog.current,
          total: prog.total,
          percentage: 45 + Math.round(prog.percentage * 0.53),
          statusText: prog.statusText,
        });
      }
    );

    return {
      bytes: compressResult.bytes,
      blob: compressResult.blob,
      url: compressResult.url,
      originalSize,
      finalSize: compressResult.compressedBytes,
      reductionPercentage: compressResult.reductionPercentage,
      isCompressed: true,
    };
  }

  // Standard non-compressed export
  const blob = new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  onProgress?.({
    current: placements.length,
    total: placements.length,
    percentage: 100,
    statusText: 'Signed PDF ready for download!',
  });

  return {
    bytes: signedBytes,
    blob,
    url,
    originalSize,
    finalSize: signedBytes.byteLength,
    reductionPercentage: 0,
    isCompressed: false,
  };
}

/**
 * Creates a clean multi-page demo PDF (Master Services Agreement).
 */
export async function createSamplePdf(): Promise<PdfDocumentInfo> {
  const pdfDoc = await PDFDocument.create();
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.1, 0.15, 0.25);
  const mutedColor = rgb(0.4, 0.45, 0.5);
  const lineColor = rgb(0.85, 0.88, 0.92);

  // PAGE 1
  const page1 = pdfDoc.addPage([612, 792]);
  page1.drawText('MASTER SERVICES AGREEMENT', { x: 54, y: 720, size: 18, font: helveticaBold, color: primaryColor });
  page1.drawText('Document Reference: MSA-2026-88402', { x: 54, y: 700, size: 10, font: helvetica, color: mutedColor });
  page1.drawLine({ start: { x: 54, y: 685 }, end: { x: 558, y: 685 }, thickness: 1, color: lineColor });
  page1.drawText('This Master Services Agreement is entered into by and between the Client and Provider.', { x: 54, y: 650, size: 10, font: timesFont, color: primaryColor });
  page1.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page1.drawText('Page 1 of 3  ·  Initial:', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });
  page1.drawRectangle({ x: 180, y: 52, width: 90, height: 22, borderColor: rgb(0.7, 0.75, 0.8), borderWidth: 1 });

  // PAGE 2
  const page2 = pdfDoc.addPage([612, 792]);
  page2.drawText('TERMS OF SERVICE AND SERVICE LEVELS', { x: 54, y: 720, size: 14, font: helveticaBold, color: primaryColor });
  page2.drawLine({ start: { x: 54, y: 700 }, end: { x: 558, y: 700 }, thickness: 1, color: lineColor });
  page2.drawText('Section 3: Uptime SLA, Privacy Guarantees and Verification Compliance.', { x: 54, y: 660, size: 10, font: timesFont, color: primaryColor });
  page2.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page2.drawText('Page 2 of 3  ·  Initial:', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });
  page2.drawRectangle({ x: 180, y: 52, width: 90, height: 22, borderColor: rgb(0.7, 0.75, 0.8), borderWidth: 1 });

  // PAGE 3: Execution and Signatures
  const page3 = pdfDoc.addPage([612, 792]);
  page3.drawText('EXECUTION AND SIGNATURE ATTESTATION', { x: 54, y: 720, size: 14, font: helveticaBold, color: primaryColor });
  page3.drawLine({ start: { x: 54, y: 700 }, end: { x: 558, y: 700 }, thickness: 1, color: lineColor });
  page3.drawText('IN WITNESS WHEREOF, the parties hereto execute this Agreement.', { x: 54, y: 660, size: 10, font: timesFont, color: primaryColor });

  // Provider
  page3.drawText('PROVIDER: Acrobatix Inc.', { x: 54, y: 560, size: 10, font: helveticaBold, color: primaryColor });
  page3.drawLine({ start: { x: 54, y: 490 }, end: { x: 260, y: 490 }, thickness: 1, color: primaryColor });
  page3.drawText('Authorized Signature (Pre-signed)', { x: 54, y: 475, size: 9, font: helvetica, color: mutedColor });

  // Client Box
  page3.drawText('CLIENT (Sign Below):', { x: 310, y: 560, size: 10, font: helveticaBold, color: primaryColor });
  page3.drawRectangle({ x: 310, y: 485, width: 200, height: 60, borderColor: rgb(0.2, 0.4, 0.8), borderWidth: 1, borderDashArray: [4, 4] });
  page3.drawLine({ start: { x: 310, y: 480 }, end: { x: 510, y: 480 }, thickness: 1, color: primaryColor });
  page3.drawText('Authorized Representative Signature', { x: 310, y: 465, size: 9, font: helvetica, color: mutedColor });

  page3.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page3.drawText('Page 3 of 3  ·  Final Execution', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });

  const rawBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    name: 'Master_Services_Agreement_Execution.pdf',
    size: rawBytes.byteLength,
    pageCount: 3,
    pages: [
      { pageNumber: 1, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
      { pageNumber: 2, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
      { pageNumber: 3, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
    ],
    rawBytes,
  };
}

/**
 * Creates a high-capacity multi-page document (up to 200 pages)
 * so users can test 200-page batch signing and compression.
 */
export async function createLargeSamplePdf(
  pageCount: number = 200,
  onProgress?: (percent: number) => void
): Promise<PdfDocumentInfo> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesInfo: PageInfo[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([612, 792]);
    page.drawText(`OFFICIAL BATCH RECORD / DOCUMENT REGISTER`, {
      x: 54,
      y: 730,
      size: 14,
      font: helveticaBold,
      color: rgb(0.1, 0.2, 0.35),
    });
    page.drawText(`Page Number: ${i} of ${pageCount} (পৃষ্ঠা সংখ্যা: ${i}/${pageCount})  ·  Batch Ref #B200-${1000 + i}`, {
      x: 54,
      y: 710,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.5),
    });
    page.drawLine({
      start: { x: 54, y: 695 },
      end: { x: 558, y: 695 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Content lines
    page.drawText(`This document page is part of the 200-page verified enterprise dossier.`, {
      x: 54,
      y: 660,
      size: 10,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`Audit certification checkpoint #${i} verified. All legal requirements attested.`, {
      x: 54,
      y: 640,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Signature Area guide on bottom right
    page.drawRectangle({
      x: 350,
      y: 60,
      width: 170,
      height: 55,
      borderColor: rgb(0.3, 0.5, 0.8),
      borderWidth: 1,
      borderDashArray: [3, 3],
    });
    page.drawText(`Signatory Line (Page ${i})`, {
      x: 355,
      y: 120,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.4, 0.7),
    });

    pagesInfo.push({
      pageNumber: i,
      width: 612,
      height: 792,
      unrotatedWidth: 612,
      unrotatedHeight: 792,
      rotation: 0,
    });

    if (i % 20 === 0 || i === pageCount) {
      onProgress?.(Math.round((i / pageCount) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const rawBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    name: `Official_Document_${pageCount}_Pages.pdf`,
    size: rawBytes.byteLength,
    pageCount,
    pages: pagesInfo,
    rawBytes,
  };
}
