/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PdfDocumentInfo,
  SignaturePlacement,
  ProcessedSignature,
  MobileViewTab,
  PdfCompressionOptions,
  PageNumberingOptions,
} from './types';
import {
  loadPdfDocument,
  createSamplePdf,
  createLargeSamplePdf,
  applySignaturesAndExport,
  rotatePdfDocument,
} from './utils/pdfHelper';
import { generateSampleSignatureDataUrl, processSignatureImage } from './utils/imageProcessor';
import { formatBytes, CompressionProgressInfo } from './utils/pdfCompressor';
import { DEFAULT_PAGE_NUMBERING } from './utils/pageNumberHelper';
import { PdfUploader } from './components/PdfUploader';
import { SignatureEditor } from './components/SignatureEditor';
import { PlacementList } from './components/PlacementList';
import { VisualPageCanvas } from './components/VisualPageCanvas';
import { AllPagesFlowView } from './components/AllPagesFlowView';
import { SignedPdfViewer } from './components/SignedPdfViewer';
import { DocumentScannerModal } from './components/DocumentScannerModal';
import { BatchSigningModal } from './components/BatchSigningModal';
import { PdfCompressorModal } from './components/PdfCompressorModal';
import { PageNumberingModal } from './components/PageNumberingModal';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Zap,
  FileSignature,
  ArrowRight,
  LayoutGrid,
  Square,
  Sparkles,
  Camera,
  Layers,
  Sliders,
  CheckCircle2,
  RefreshCw,
  FileText,
  PenTool,
  Hash,
} from 'lucide-react';

export default function App() {
  const [pdfInfo, setPdfInfo] = useState<PdfDocumentInfo | null>(null);
  const [signature, setSignature] = useState<ProcessedSignature | null>(null);
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [canvasViewMode, setCanvasViewMode] = useState<'focus' | 'all'>('focus');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isCompressorModalOpen, setIsCompressorModalOpen] = useState<boolean>(false);
  const [isPageNumberModalOpen, setIsPageNumberModalOpen] = useState<boolean>(false);

  // PDF Page Numbering System State
  const [pageNumbering, setPageNumbering] = useState<PageNumberingOptions>(DEFAULT_PAGE_NUMBERING);

  // Compression on Export settings (Default enabled for ~800 KB as requested)
  const [compressOnExport, setCompressOnExport] = useState<boolean>(true);
  const [exportTargetSizeKb, setExportTargetSizeKb] = useState<number>(800);
  const [exportProgress, setExportProgress] = useState<CompressionProgressInfo | null>(null);

  // Mobile navigation tabs: 'document' | 'signature' | 'batch' | 'compress'
  const [mobileTab, setMobileTab] = useState<MobileViewTab>('document');

  // Export & View State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoading200, setIsLoading200] = useState<boolean>(false);
  const [signedResult, setSignedResult] = useState<{
    blobUrl: string;
    fileName: string;
    count: number;
    originalSize?: number;
    finalSize?: number;
    reductionPercentage?: number;
    isCompressed?: boolean;
  } | null>(null);

  // Status/Error banner & quick toast notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Auto-dismiss quick toast after 3 seconds
  useEffect(() => {
    if (!quickToast) return;
    const timer = setTimeout(() => {
      setQuickToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [quickToast]);

  // Auto-load sample PDF and sample signature on initial visit
  useEffect(() => {
    async function initSample() {
      try {
        const samplePdf = await createSamplePdf();
        setPdfInfo(samplePdf);

        const sampleSigDataUrl = generateSampleSignatureDataUrl();
        const processedSig = await processSignatureImage(sampleSigDataUrl, {
          threshold: 215,
          feather: 25,
          shadowRemoval: 45,
          inkMode: 'darken',
          autoTrim: true,
        });
        setSignature(processedSig);

        // Pre-configure initial signature placements (e.g. Page 3 main signature line + initials on page 1 & 2)
        const initialPlacements: SignaturePlacement[] = [
          {
            id: 'placement-p3',
            pageNumber: 3,
            x: 320,
            y: 490,
            width: 170,
            height: 60,
            origin: 'bottom-left',
          },
          {
            id: 'placement-p1',
            pageNumber: 1,
            x: 185,
            y: 54,
            width: 80,
            height: 25,
            origin: 'bottom-left',
          },
        ];

        setPlacements(initialPlacements);
        setActivePlacementId('placement-p3');
        setCurrentPageIndex(2); // Show page 3 initially to highlight execution block
      } catch (e) {
        console.error('Initial sample generation error:', e);
      }
    }

    initSample();
  }, []);

  // Handle uploaded PDF
  const handlePdfSelected = async (file: File) => {
    setErrorMessage(null);
    try {
      const docInfo = await loadPdfDocument(file);
      setPdfInfo(docInfo);
      setSignedResult(null);
      setCurrentPageIndex(0);

      // Default signature placement
      const defaultPage = docInfo.pageCount;
      const targetPageInfo = docInfo.pages[defaultPage - 1] || { width: 612, height: 792 };
      const sigWidth = signature ? Math.min(180, Math.round(targetPageInfo.width * 0.3)) : 160;
      const sigHeight = signature ? Math.round(sigWidth / signature.aspectRatio) : 55;

      const newPlacement: SignaturePlacement = {
        id: 'placement-' + Date.now(),
        pageNumber: defaultPage,
        x: Math.max(50, targetPageInfo.width - sigWidth - 60),
        y: 80,
        width: sigWidth,
        height: sigHeight,
        origin: 'bottom-left',
      };

      setPlacements([newPlacement]);
      setActivePlacementId(newPlacement.id);
      setCurrentPageIndex(defaultPage - 1);
      setMobileTab('document'); // Auto-switch to document view on mobile
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not load PDF document: ' + (err.message || 'Unknown error'));
    }
  };

  const handleLoadSamplePdf = async () => {
    setErrorMessage(null);
    try {
      const sample = await createSamplePdf();
      setPdfInfo(sample);
      setSignedResult(null);
      setCurrentPageIndex(sample.pageCount - 1);
      setMobileTab('document');
    } catch (err: any) {
      setErrorMessage('Failed to load sample document: ' + err.message);
    }
  };

  // 200-page high-capacity demo generator for testing batch 200 signing & 800 KB compression
  const handleLoad200PagesPdf = async () => {
    setErrorMessage(null);
    setIsLoading200(true);
    try {
      const largeDoc = await createLargeSamplePdf(200);
      setPdfInfo(largeDoc);
      setSignedResult(null);
      setCurrentPageIndex(0);
      setIsBatchModalOpen(true);
      setMobileTab('document');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load 200-page file: ' + err.message);
    } finally {
      setIsLoading200(false);
    }
  };

  const handleResetPdf = () => {
    setPdfInfo(null);
    setSignedResult(null);
    setPlacements([]);
    setActivePlacementId(null);
  };

  // Add new placement
  const handleAddPlacement = (pageNumber?: number) => {
    if (!pdfInfo) return;
    const targetPage = pageNumber || (currentPageIndex + 1);
    const pageMeta = pdfInfo.pages[targetPage - 1] || pdfInfo.pages[0];

    const sigW = signature ? Math.min(170, Math.round(pageMeta.width * 0.3)) : 160;
    const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 55;

    const newPlacement: SignaturePlacement = {
      id: 'placement-' + Date.now(),
      pageNumber: targetPage,
      x: Math.max(54, pageMeta.width - sigW - 54),
      y: 70,
      width: sigW,
      height: sigH,
      origin: 'bottom-left',
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setActivePlacementId(newPlacement.id);
    setCurrentPageIndex(targetPage - 1);
    setMobileTab('document');
  };

  // Add placement directly by clicking on visual canvas
  const handleAddPlacementAtCoords = (xPt: number, yPtScreen: number) => {
    if (!pdfInfo) return;
    const targetPage = currentPageIndex + 1;
    const pageMeta = pdfInfo.pages[currentPageIndex] || pdfInfo.pages[0];

    const sigW = signature ? Math.min(170, Math.round(pageMeta.width * 0.3)) : 160;
    const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 55;

    const halfW = Math.round(sigW / 2);
    const halfH = Math.round(sigH / 2);

    const clampedX = Math.max(0, Math.min(pageMeta.width - sigW, xPt - halfW));
    const clampedYBottomLeft = Math.max(
      0,
      Math.min(pageMeta.height - sigH, pageMeta.height - yPtScreen - halfH)
    );

    const newPlacement: SignaturePlacement = {
      id: 'placement-' + Date.now(),
      pageNumber: targetPage,
      x: clampedX,
      y: clampedYBottomLeft,
      width: sigW,
      height: sigH,
      origin: 'bottom-left',
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setActivePlacementId(newPlacement.id);
  };

  // Add placement directly on a specific page from AllPagesFlowView
  const handleAddPlacementToPage = (targetPageNum: number, xPt?: number, yPtScreen?: number) => {
    if (!pdfInfo) return;
    const pageMeta = pdfInfo.pages[targetPageNum - 1] || pdfInfo.pages[0];

    const sigW = signature ? Math.min(160, Math.round(pageMeta.width * 0.3)) : 150;
    const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 50;

    let posX = Math.max(50, pageMeta.width - sigW - 50);
    let posY = 60;

    if (xPt !== undefined && yPtScreen !== undefined) {
      posX = Math.max(0, Math.min(pageMeta.width - sigW, xPt - Math.round(sigW / 2)));
      posY = Math.max(0, Math.min(pageMeta.height - sigH, pageMeta.height - yPtScreen - Math.round(sigH / 2)));
    }

    const newPlacement: SignaturePlacement = {
      id: 'placement-' + Date.now(),
      pageNumber: targetPageNum,
      x: posX,
      y: posY,
      width: sigW,
      height: sigH,
      origin: 'bottom-left',
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setActivePlacementId(newPlacement.id);
  };

  // Update placement coordinates/size
  const handleUpdatePlacement = (id: string, updates: Partial<SignaturePlacement>) => {
    setPlacements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove placement
  const handleRemovePlacement = (id: string) => {
    setPlacements((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activePlacementId === id) {
        setActivePlacementId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  // Duplicate placement
  const handleDuplicatePlacement = (id: string) => {
    const target = placements.find((p) => p.id === id);
    if (!target) return;

    const dup: SignaturePlacement = {
      ...target,
      id: 'placement-' + Date.now(),
      x: Math.min(target.x + 20, 500),
      y: Math.max(target.y - 20, 30),
    };

    setPlacements((prev) => [...prev, dup]);
    setActivePlacementId(dup.id);
  };

  // Rotate PDF pages
  const handleRotatePdf = async (targetPageNumber: number | 'all', deltaDegrees: number) => {
    if (!pdfInfo) return;
    try {
      const updated = await rotatePdfDocument(pdfInfo, targetPageNumber, deltaDegrees);
      setPdfInfo(updated);
    } catch (err: any) {
      console.error('Rotation failed:', err);
      setErrorMessage('Could not rotate PDF: ' + err.message);
    }
  };

  // Batch action: Apply current placement to ALL pages
  const handleApplyToAllPages = (basePlacementId: string) => {
    if (!pdfInfo) return;
    const base = placements.find((p) => p.id === basePlacementId) || placements[0];
    if (!base) return;

    const newPlacements: SignaturePlacement[] = [];
    for (let pageNum = 1; pageNum <= pdfInfo.pageCount; pageNum++) {
      newPlacements.push({
        ...base,
        id: `placement-page-${pageNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: pageNum,
      });
    }

    setPlacements(newPlacements);
    setActivePlacementId(newPlacements[0]?.id || null);
  };

  // Batch action: Apply placement to LAST page
  const handleApplyToLastPage = (basePlacementId: string) => {
    if (!pdfInfo) return;
    const lastPageNum = pdfInfo.pageCount;
    handleUpdatePlacement(basePlacementId, { pageNumber: lastPageNum });
    setCurrentPageIndex(lastPageNum - 1);
  };

  // Manual Jump to specific page with automatic signature replication & save option
  const handleJumpToPage = (pageNum: number) => {
    if (!pdfInfo) return;
    const currentPg = currentPageIndex + 1;
    const total = pdfInfo.pageCount;
    let target = Math.max(1, Math.min(total, pageNum));

    // If target entered is same as current page, clicking Go / Enter advances to next page!
    if (target === currentPg && currentPg < total) {
      target = currentPg + 1;
    }

    // Current page placement to save & replicate
    const currentPlacement =
      placements.find((p) => p.id === activePlacementId && p.pageNumber === currentPg) ||
      placements.find((p) => p.pageNumber === currentPg);

    // Target page placement check
    const existingTargetPlacement = placements.find((p) => p.pageNumber === target);

    if (existingTargetPlacement) {
      setCurrentPageIndex(target - 1);
      setActivePlacementId(existingTargetPlacement.id);
      setQuickToast(`✅ পৃষ্ঠা ${currentPg} সংৰক্ষিত! পৃষ্ঠা ${target} ত চহী সাজু (Go / Enter ↵)`);
    } else if (currentPlacement) {
      // Automatically replicate placement onto target page at exact coordinates
      const newPlacement: SignaturePlacement = {
        ...currentPlacement,
        id: `placement-p${target}-${Date.now()}`,
        pageNumber: target,
      };
      setPlacements((prev) => [...prev, newPlacement]);
      setCurrentPageIndex(target - 1);
      setActivePlacementId(newPlacement.id);
      setQuickToast(`✅ পৃষ্ঠা ${currentPg} সংৰক্ষিত! পৃষ্ঠা ${target} ত চহী বহিল (Go / Enter ↵)`);
    } else if (signature) {
      const targetPageInfo = pdfInfo.pages[target - 1] || pdfInfo.pages[0];
      const sigW = Math.min(170, Math.round(targetPageInfo.width * 0.3));
      const sigH = Math.round(sigW / signature.aspectRatio);
      const newPlacement: SignaturePlacement = {
        id: `placement-p${target}-${Date.now()}`,
        pageNumber: target,
        x: Math.max(54, targetPageInfo.width - sigW - 54),
        y: 70,
        width: sigW,
        height: sigH,
        origin: 'bottom-left',
      };
      setPlacements((prev) => [...prev, newPlacement]);
      setCurrentPageIndex(target - 1);
      setActivePlacementId(newPlacement.id);
      setQuickToast(`✅ পৃষ্ঠা ${target} ত চহী বহিল (Go / Enter ↵)`);
    } else {
      setCurrentPageIndex(target - 1);
      setQuickToast(`পৃষ্ঠা ${target} লৈ যোৱা হ'ল (Page ${target})`);
    }
  };

  // Automatic Save & Move to Next Page workflow requested by user:
  // When user places a signature, pressing Enter saves it in place, moves to next page, and prepares next signature!
  const handleSaveAndNextPage = () => {
    if (!pdfInfo) return;
    const currentPg = currentPageIndex + 1;
    const total = pdfInfo.pageCount;

    // Current page placement
    const currentPlacement =
      placements.find((p) => p.id === activePlacementId && p.pageNumber === currentPg) ||
      placements.find((p) => p.pageNumber === currentPg);

    if (currentPageIndex < total - 1) {
      const nextPg = currentPg + 1;
      const nextPageInfo = pdfInfo.pages[nextPg - 1] || pdfInfo.pages[0];

      // Check if next page already has a placement
      const existingNextPlacement = placements.find((p) => p.pageNumber === nextPg);

      if (existingNextPlacement) {
        setCurrentPageIndex(nextPg - 1);
        setActivePlacementId(existingNextPlacement.id);
        setQuickToast(`✅ পৃষ্ঠা ${currentPg} সংৰক্ষিত! পৃষ্ঠা ${nextPg} লৈ যোৱা হ'ল (Enter ↵)`);
      } else if (currentPlacement) {
        // Automatically replicate placement onto next page at exact coordinates
        const newPlacement: SignaturePlacement = {
          ...currentPlacement,
          id: `placement-p${nextPg}-${Date.now()}`,
          pageNumber: nextPg,
        };
        setPlacements((prev) => [...prev, newPlacement]);
        setCurrentPageIndex(nextPg - 1);
        setActivePlacementId(newPlacement.id);
        setQuickToast(`✅ পৃষ্ঠা ${currentPg} সংৰক্ষিত! পৃষ্ঠা ${nextPg} ত চহী বহিল (Enter ↵)`);
      } else {
        // Place default signature on next page
        const sigW = signature ? Math.min(170, Math.round(nextPageInfo.width * 0.3)) : 160;
        const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 55;
        const newPlacement: SignaturePlacement = {
          id: `placement-p${nextPg}-${Date.now()}`,
          pageNumber: nextPg,
          x: Math.max(54, nextPageInfo.width - sigW - 54),
          y: 70,
          width: sigW,
          height: sigH,
          origin: 'bottom-left',
        };
        setPlacements((prev) => [...prev, newPlacement]);
        setCurrentPageIndex(nextPg - 1);
        setActivePlacementId(newPlacement.id);
        setQuickToast(`পৃষ্ঠা ${nextPg} ত চহী বহিল (Enter ↵)`);
      }
    } else {
      setQuickToast(`🎉 সকলো ${total} খন পৃষ্ঠাত চহী প্ৰক্ৰিয়া সম্পূৰ্ণ হ'ল! এতিয়া Download কৰক`);
    }
  };

  // Global Enter shortcut for rapid next page signing
  useEffect(() => {
    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const activeElem = document.activeElement;
        const isInput =
          activeElem?.tagName === 'INPUT' ||
          activeElem?.tagName === 'TEXTAREA' ||
          activeElem?.getAttribute('contenteditable') === 'true';

        if (
          !isInput &&
          pdfInfo &&
          canvasViewMode === 'focus' &&
          !isBatchModalOpen &&
          !isCompressorModalOpen &&
          !isScannerOpen &&
          !isPageNumberModalOpen
        ) {
          e.preventDefault();
          handleSaveAndNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalEnter);
    return () => window.removeEventListener('keydown', handleGlobalEnter);
  }, [
    pdfInfo,
    canvasViewMode,
    isBatchModalOpen,
    isCompressorModalOpen,
    isScannerOpen,
    isPageNumberModalOpen,
    currentPageIndex,
    placements,
    activePlacementId,
    signature,
  ]);

  // Generate & Sign PDF (with high-regulation compression to ~800 KB support!)
  const handleGenerateSignedPdf = async () => {
    if (!pdfInfo) {
      setErrorMessage('অনুগ্রহ কৰি প্ৰথমে এটা PDF ফাইল আপলোড কৰক।');
      return;
    }
    if (!signature) {
      setErrorMessage('অনুগ্রহ কৰি চহীৰ ফটো বা ছবি আপলোড কৰক।');
      return;
    }
    if (placements.length === 0) {
      setErrorMessage('অন্ততঃ এটা পৃষ্ঠাত চহী বহুৱাওক।');
      return;
    }

    setErrorMessage(null);
    setIsExporting(true);
    setExportProgress({
      current: 0,
      total: placements.length,
      percentage: 5,
      statusText: 'Preparing document & signatures...',
    });

    try {
      const compressionOpts: PdfCompressionOptions = {
        enabled: compressOnExport,
        preset: 'extreme_800kb',
        targetSizeKb: exportTargetSizeKb,
        quality: 0.72,
        maxDimension: 1400,
        useGrayscale: false,
        removeMetadata: true,
      };

      const result = await applySignaturesAndExport(
        pdfInfo,
        signature.pngBytes,
        placements,
        compressOnExport ? compressionOpts : undefined,
        (prog) => setExportProgress(prog),
        pageNumbering
      );

      setSignedResult({
        blobUrl: result.url,
        fileName: pdfInfo.name,
        count: placements.length,
        originalSize: result.originalSize,
        finalSize: result.finalSize,
        reductionPercentage: result.reductionPercentage,
        isCompressed: result.isCompressed,
      });
    } catch (err: any) {
      console.error('Failed to sign PDF:', err);
      setErrorMessage('Error exporting signed PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Active page info
  const activePageInfo =
    pdfInfo?.pages[currentPageIndex] ||
    pdfInfo?.pages[0] || { pageNumber: 1, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 };

  const uniqueSignedPagesCount = new Set(placements.map((p) => p.pageNumber)).size;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Bar (Mobile and Desktop Friendly) */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <a href="/" className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                SignFlow
              </a>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                350MB ➔ 800KB
              </span>
            </div>
          </div>

          {/* Navigation indicators (Desktop) */}
          <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Client-Side Privacy (সুৰক্ষিত)</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-indigo-700 font-semibold">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Batch Sign 200+ Pages (২০০খন পৃষ্ঠাত চহী)</span>
            </span>
          </nav>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Batch Sign 200 Pages Button */}
            {pdfInfo && (
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-indigo-900 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg shadow-2xs transition-all whitespace-nowrap"
                title="একেলগে ২০০খন পৃষ্ঠাত চহী বহুৱাওক (Batch Sign 200 Pages)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">২০০ পৃষ্ঠাত চহী (Batch 200)</span>
                <span className="sm:hidden">২০০ চহী</span>
              </button>
            )}

            {/* High Regulation PDF Compressor Button */}
            {pdfInfo && (
              <button
                type="button"
                onClick={() => setIsCompressorModalOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-emerald-900 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all whitespace-nowrap"
                title="350 MB ফাইল ৮০০ KB লৈ কম্প্ৰেছ কৰক"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">৮০০ KB কম্প্ৰেছ (Compress)</span>
                <span className="md:hidden">৮০০KB</span>
              </button>
            )}

            {/* Page Numbering System Button */}
            {pdfInfo && (
              <button
                type="button"
                onClick={() => setIsPageNumberModalOpen(true)}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-lg shadow-2xs transition-all whitespace-nowrap ${
                  pageNumbering.enabled
                    ? 'text-white bg-purple-700 hover:bg-purple-800 ring-2 ring-purple-400/30'
                    : 'text-purple-900 hover:text-purple-950 bg-purple-50 hover:bg-purple-100 border border-purple-300'
                }`}
                title="পৃষ্ঠাত পেজ নম্বৰ বহুৱাওক (Add Page Numbers)"
              >
                <Hash className="w-3.5 h-3.5" />
                <span className="hidden md:inline">পেজ নম্বৰ (Page No)</span>
                <span className="md:hidden">নম্বৰ</span>
                {pageNumbering.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                )}
              </button>
            )}

            {/* Document Camera Scanner */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
              title="কেমেৰাৰে পৃষ্ঠা স্কেন কৰি PDF বনাওক"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">স্কেন (Scan)</span>
            </button>

            {/* Export Signed PDF Button */}
            <button
              onClick={handleGenerateSignedPdf}
              disabled={isExporting || !pdfInfo || !signature || placements.length === 0}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              {isExporting ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                </span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export & Download (ডাউনলোড)</span>
                  <span className="sm:hidden">Export</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE TAB BAR (Only on small screens < lg) - Makes app 100% mobile friendly */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-[53px] z-40 px-2 py-1 flex items-center justify-between gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'document'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📄 নথি (Canvas)</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('signature')}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'signature'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>✍️ চহী (Sign)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (pdfInfo) {
              setIsBatchModalOpen(true);
            } else {
              setMobileTab('batch');
            }
          }}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'batch'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>⚡ ২০০ চহী</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (pdfInfo) {
              setIsCompressorModalOpen(true);
            } else {
              setMobileTab('compress');
            }
          }}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'compress'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>🗜️ ৮০০KB</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPageNumberModalOpen(true)}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageNumbering.enabled
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-purple-800 bg-purple-50/70 hover:bg-purple-100'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>নম্বৰ {pageNumbering.enabled ? '✓' : ''}</span>
        </button>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col gap-4 sm:gap-6 pb-20 lg:pb-6 relative">
        {/* Quick Toast Notification */}
        {quickToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{quickToast}</span>
            <button
              onClick={() => setQuickToast(null)}
              className="text-slate-400 hover:text-white ml-2 text-sm leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-medium underline hover:text-red-950 ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Export & Compression Progress Overlay/Banner */}
        {isExporting && exportProgress && (
          <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-800 text-white rounded-xl shadow-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-blue-100">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>{exportProgress.statusText}</span>
              </span>
              <span className="font-mono text-amber-300 font-extrabold">
                {exportProgress.percentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-blue-950 rounded-full overflow-hidden border border-blue-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-400 transition-all duration-300 rounded-full"
                style={{ width: `${exportProgress.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-blue-200">
              Embedding {placements.length} signatures & compressing document under ~{exportTargetSizeKb} KB with high-regulation quality...
            </p>
          </div>
        )}

        {/* If signed result is ready, present the preview modal/panel */}
        {signedResult ? (
          <SignedPdfViewer
            signedBlobUrl={signedResult.blobUrl}
            originalFileName={signedResult.fileName}
            placementsCount={signedResult.count}
            originalSize={signedResult.originalSize}
            finalSize={signedResult.finalSize}
            reductionPercentage={signedResult.reductionPercentage}
            isCompressed={signedResult.isCompressed}
            onEditMore={() => setSignedResult(null)}
            onResetAll={() => {
              setSignedResult(null);
              handleResetPdf();
            }}
          />
        ) : (
          /* Split Workspace Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Configuration & Controls (5 cols) */}
            <div
              className={`lg:col-span-5 space-y-5 sm:space-y-6 ${
                mobileTab === 'document' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* 1. PDF Document Upload */}
              <div
                className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs ${
                  mobileTab === 'compress' ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <PdfUploader
                  pdfInfo={pdfInfo}
                  isLoading={isLoading200}
                  onPdfSelected={handlePdfSelected}
                  onLoadSample={handleLoadSamplePdf}
                  onLoad200PagesSample={handleLoad200PagesPdf}
                  onResetPdf={handleResetPdf}
                  onRotatePdf={handleRotatePdf}
                  onOpenScanner={() => setIsScannerOpen(true)}
                  onOpenCompressor={() => setIsCompressorModalOpen(true)}
                />
              </div>

              {/* 2. Signature Upload & Automatic Background Removal */}
              <div
                className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs ${
                  mobileTab === 'signature' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <SignatureEditor
                  signature={signature}
                  onSignatureProcessed={(sig) => {
                    setSignature(sig);
                    if (placements.length > 0) {
                      setPlacements((prev) =>
                        prev.map((p) => ({
                          ...p,
                          height: Math.round(p.width / sig.aspectRatio),
                        }))
                      );
                    }
                  }}
                />
              </div>

              {/* 3. Placements Coordinates & Multi-page Configuration */}
              {pdfInfo && (
                <div
                  className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs ${
                    mobileTab === 'batch' ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <PlacementList
                    placements={placements}
                    pages={pdfInfo.pages}
                    activePlacementId={activePlacementId}
                    onSelectPlacement={(id) => {
                      setActivePlacementId(id);
                      const target = placements.find((p) => p.id === id);
                      if (target) {
                        setCurrentPageIndex(target.pageNumber - 1);
                      }
                      setMobileTab('document');
                    }}
                    onUpdatePlacement={handleUpdatePlacement}
                    onAddPlacement={handleAddPlacement}
                    onRemovePlacement={handleRemovePlacement}
                    onDuplicatePlacement={handleDuplicatePlacement}
                    onApplyToAllPages={handleApplyToAllPages}
                    onApplyToLastPage={handleApplyToLastPage}
                    pageNumbering={pageNumbering}
                    onOpenBatchModal={() => setIsBatchModalOpen(true)}
                    onOpenPageNumberModal={() => setIsPageNumberModalOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Visual Page Canvas & Multi-Page View (7 cols) */}
            <div
              className={`lg:col-span-7 space-y-4 ${
                mobileTab !== 'document' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col">
                {/* View Switcher & Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Visual Document View (নথি চাওক)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {uniqueSignedPagesCount} of {pdfInfo ? pdfInfo.pageCount : 1} pages signed
                      {pdfInfo && pdfInfo.pageCount >= 200 && ' (২০০খন পৃষ্ঠাৰ ফাইল)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* One-click Batch Sign button on Canvas header */}
                    {pdfInfo && (
                      <button
                        type="button"
                        onClick={() => setIsBatchModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                        title="একেলগে ২০০খন পৃষ্ঠাত চহী বহুৱাওক"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>২০০ পৃষ্ঠাত চহী (Batch 200)</span>
                      </button>
                    )}

                    {/* View Mode Toggle: Single Page vs All Pages Flow */}
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setCanvasViewMode('focus')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          canvasViewMode === 'focus'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Single Page</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanvasViewMode('all')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          canvasViewMode === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>All Pages</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-bar for Single Page navigation */}
                {canvasViewMode === 'focus' && pdfInfo && (
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                    <span className="text-xs font-medium text-slate-700">
                      Page {currentPageIndex + 1} of {pdfInfo.pageCount}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentPageIndex === 0}
                        className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={pdfInfo.pageCount}
                          value={currentPageIndex + 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= pdfInfo.pageCount) {
                              setCurrentPageIndex(val - 1);
                            }
                          }}
                          className="w-14 text-xs font-mono px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-slate-800 font-bold"
                        />
                        <span className="text-xs text-slate-400">/ {pdfInfo.pageCount}</span>
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPageIndex((prev) => Math.min(pdfInfo.pageCount - 1, prev + 1))
                        }
                        disabled={currentPageIndex >= pdfInfo.pageCount - 1}
                        className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Render View depending on mode */}
                {canvasViewMode === 'focus' ? (
                  <div className="bg-slate-50 p-2 sm:p-4 rounded-lg border border-slate-200 flex items-center justify-center min-h-[460px] overflow-x-auto">
                    <VisualPageCanvas
                      pageInfo={activePageInfo}
                      pdfRawBytes={pdfInfo?.rawBytes}
                      placements={placements}
                      activePlacementId={activePlacementId}
                      signature={signature}
                      pageNumbering={pageNumbering}
                      totalPages={pdfInfo?.pageCount || 1}
                      onSelectPlacement={(id) => setActivePlacementId(id)}
                      onUpdatePlacement={handleUpdatePlacement}
                      onAddPlacementAtCoords={handleAddPlacementAtCoords}
                      onDuplicatePlacement={handleDuplicatePlacement}
                      onRemovePlacement={handleRemovePlacement}
                      onApplyToAllPages={handleApplyToAllPages}
                      onRotatePage={(delta) => handleRotatePdf(currentPageIndex + 1, delta)}
                      onRotateAllPages={(delta) => handleRotatePdf('all', delta)}
                      onOpenPageNumberModal={() => setIsPageNumberModalOpen(true)}
                      onUpdatePageNumbering={(updates) =>
                        setPageNumbering((prev) => ({ ...prev, ...updates }))
                      }
                      onJumpToPage={(target) => handleJumpToPage(target)}
                      onNextPage={() => handleJumpToPage(currentPageIndex + 2)}
                      onPrevPage={() => handleJumpToPage(currentPageIndex)}
                      onSaveAndNextPage={handleSaveAndNextPage}
                    />
                  </div>
                ) : (
                  /* All Pages Flow View */
                  <div className="bg-slate-50 p-2 sm:p-4 rounded-lg border border-slate-200">
                    {pdfInfo && (
                      <AllPagesFlowView
                        pages={pdfInfo.pages}
                        pdfRawBytes={pdfInfo.rawBytes}
                        placements={placements}
                        activePlacementId={activePlacementId}
                        signature={signature}
                        pageNumbering={pageNumbering}
                        onSelectPlacement={(id) => setActivePlacementId(id)}
                        onUpdatePlacement={handleUpdatePlacement}
                        onAddPlacementToPage={handleAddPlacementToPage}
                        onRemovePlacement={handleRemovePlacement}
                        onFocusPage={(pageIdx) => {
                          setCurrentPageIndex(pageIdx);
                          setCanvasViewMode('focus');
                        }}
                        onRotatePage={(pageNum, delta) => handleRotatePdf(pageNum, delta)}
                        onRotateAllPages={(delta) => handleRotatePdf('all', delta)}
                        onOpenPageNumberModal={() => setIsPageNumberModalOpen(true)}
                      />
                    )}
                  </div>
                )}

                {/* Signature Placed Counter and Quick Batch Apply */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>
                      {placements.length} {placements.length === 1 ? 'instance' : 'instances'} of signature placed
                    </span>
                  </div>

                  {placements.length > 0 && (
                    <button
                      onClick={() => handleApplyToAllPages(activePlacementId || placements[0].id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>সকলো পৃষ্ঠাত বহুৱাওক</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ready to sign & High-Regulation Compression Control Card */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white">
                      Sign & Download Document (চহী আৰু ডাউনলোড)
                    </h4>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                      {placements.length} Signatures Placed
                    </span>
                  </div>

                  {/* Compression toggle checkbox */}
                  <label className="flex items-center gap-2 text-xs text-blue-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={compressOnExport}
                      onChange={(e) => setCompressOnExport(e.target.checked)}
                      className="rounded text-emerald-500"
                    />
                    <span className="font-semibold text-emerald-300">
                      High-Regulation Compression (~{exportTargetSizeKb} KB লৈ কম্প্ৰেছ কৰক)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-300">
                    350 MB ফাইল ৮০০ KB লৈ কম্প্ৰেছ কৰিব আৰু ২০০খন পৃষ্ঠাত চহী একেলগে এম্বেড হ'ব।
                  </p>

                  {/* Page Numbers status badge */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsPageNumberModalOpen(true)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        pageNumbering.enabled
                          ? 'bg-purple-900/70 text-purple-200 border-purple-400/50 hover:bg-purple-900'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        পেজ নম্বৰিং:{' '}
                        {pageNumbering.enabled
                          ? `সক্ৰিয় (${pageNumbering.format} • ${pageNumbering.position})`
                          : 'বন্ধ (+ পেজ নম্বৰ যোগ কৰক)'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleGenerateSignedPdf}
                    disabled={isExporting || !pdfInfo || !signature || placements.length === 0}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Document...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Export Signed PDF (ডাউনলোড কৰক)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MOBILE STICKY BOTTOM BAR (Quick Actions for thumb navigation on mobile phones) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 z-40 flex items-center justify-between gap-2 shadow-lg">
        {/* Page stepper */}
        {pdfInfo && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPageIndex === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30 text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-1.5 text-slate-800">
              {currentPageIndex + 1}/{pdfInfo.pageCount}
            </span>
            <button
              onClick={() =>
                setCurrentPageIndex((prev) => Math.min(pdfInfo.pageCount - 1, prev + 1))
              }
              disabled={currentPageIndex >= pdfInfo.pageCount - 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-30 text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Batch Modal Button */}
        {pdfInfo && (
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>২০০ চহী</span>
          </button>
        )}

        {/* Quick Export Button */}
        <button
          onClick={handleGenerateSignedPdf}
          disabled={isExporting || !pdfInfo || !signature || placements.length === 0}
          className="flex-1 max-w-[170px] py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {compressOnExport ? '800KB' : ''}</span>
        </button>
      </div>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SignFlow</span>
            <span>·</span>
            <span>Client-side PDF signature & 800 KB compression engine</span>
          </div>
          <div>
            <span>আপোনাৰ সকলো নথি আৰু চহী ডিভাইচতে সুৰক্ষিতভাৱে প্ৰচেচ হয় (100% Privacy)।</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* 1. Camera Document Scanner to PDF Modal */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveAndOpenInEditor={(file) => {
          handlePdfSelected(file);
        }}
      />

      {/* 2. Batch Signing 200+ Pages Modal */}
      {pdfInfo && (
        <BatchSigningModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          pages={pdfInfo.pages}
          signature={signature}
          currentPlacements={placements}
          activePlacementId={activePlacementId}
          onApplyBatchPlacements={(newPlacements) => {
            setPlacements(newPlacements);
            if (newPlacements.length > 0) {
              setActivePlacementId(newPlacements[0].id);
            }
          }}
        />
      )}

      {/* 3. High-Regulation PDF Compressor Modal (350 MB to 800 KB) */}
      {pdfInfo && (
        <PdfCompressorModal
          isOpen={isCompressorModalOpen}
          onClose={() => setIsCompressorModalOpen(false)}
          pdfInfo={pdfInfo}
          onCompressedPdfReady={(file) => {
            handlePdfSelected(file);
          }}
        />
      )}

      {/* 4. PDF Page Numbering System Modal */}
      <PageNumberingModal
        isOpen={isPageNumberModalOpen}
        onClose={() => setIsPageNumberModalOpen(false)}
        options={pageNumbering}
        onChangeOptions={setPageNumbering}
        totalPages={pdfInfo?.pageCount || 1}
      />
    </div>
  );
}
