/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PdfDocumentInfo,
  SignaturePlacement,
  ProcessedSignature,
} from './types';
import {
  loadPdfDocument,
  createSamplePdf,
  applySignaturesAndExport,
} from './utils/pdfHelper';
import { generateSampleSignatureDataUrl, processSignatureImage } from './utils/imageProcessor';
import { PdfUploader } from './components/PdfUploader';
import { SignatureEditor } from './components/SignatureEditor';
import { PlacementList } from './components/PlacementList';
import { VisualPageCanvas } from './components/VisualPageCanvas';
import { AllPagesFlowView } from './components/AllPagesFlowView';
import { SignedPdfViewer } from './components/SignedPdfViewer';
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
} from 'lucide-react';

export default function App() {
  const [pdfInfo, setPdfInfo] = useState<PdfDocumentInfo | null>(null);
  const [signature, setSignature] = useState<ProcessedSignature | null>(null);
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [canvasViewMode, setCanvasViewMode] = useState<'focus' | 'all'>('focus');

  // Export & View State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [signedResult, setSignedResult] = useState<{
    blobUrl: string;
    fileName: string;
    count: number;
  } | null>(null);

  // Status/Error banner
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            y: 490, // Bottom-left coordinate on Page 3 execution block
            width: 170,
            height: 60,
            origin: 'bottom-left',
          },
          {
            id: 'placement-p1',
            pageNumber: 1,
            x: 185,
            y: 54, // Initial block on Page 1
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
    } catch (err: any) {
      setErrorMessage('Failed to load sample document: ' + err.message);
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
  };

  // Add placement directly to a specific page
  const handleAddPlacementToPage = (pageNumber: number, xPt?: number, yPt?: number) => {
    if (!pdfInfo) return;
    const pageMeta = pdfInfo.pages[pageNumber - 1] || pdfInfo.pages[0];

    const sigW = signature ? Math.min(170, Math.round(pageMeta.width * 0.3)) : 160;
    const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 55;

    const finalX = xPt !== undefined ? Math.max(0, Math.min(pageMeta.width - sigW, xPt)) : Math.max(54, pageMeta.width - sigW - 54);
    const finalY = yPt !== undefined ? Math.max(0, Math.min(pageMeta.height - sigH, yPt)) : 70;

    const newPlacement: SignaturePlacement = {
      id: 'placement-' + Date.now(),
      pageNumber,
      x: finalX,
      y: finalY,
      width: sigW,
      height: sigH,
      origin: 'bottom-left',
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setActivePlacementId(newPlacement.id);
  };

  // Add placement at exact clicked coordinates on the visual single canvas
  const handleAddPlacementAtCoords = (xPt: number, yPtScreen: number) => {
    if (!pdfInfo) return;
    const targetPage = currentPageIndex + 1;
    const pageMeta = pdfInfo.pages[currentPageIndex] || pdfInfo.pages[0];

    const sigW = signature ? Math.min(170, Math.round(pageMeta.width * 0.3)) : 160;
    const sigH = signature ? Math.round(sigW / signature.aspectRatio) : 55;

    const pdfY = Math.max(0, pageMeta.height - yPtScreen - sigH);

    const newPlacement: SignaturePlacement = {
      id: 'placement-' + Date.now(),
      pageNumber: targetPage,
      x: Math.max(0, Math.min(pageMeta.width - sigW, xPt)),
      y: pdfY,
      width: sigW,
      height: sigH,
      origin: 'bottom-left',
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setActivePlacementId(newPlacement.id);
  };

  // Update placement
  const handleUpdatePlacement = (id: string, updates: Partial<SignaturePlacement>) => {
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (updates.pageNumber && updates.pageNumber !== p.pageNumber) {
            setCurrentPageIndex(updates.pageNumber - 1);
          }
          return updated;
        }
        return p;
      })
    );
  };

  // Remove placement
  const handleRemovePlacement = (id: string) => {
    setPlacements((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
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
    const clone: SignaturePlacement = {
      ...target,
      id: 'placement-' + Date.now(),
      x: Math.max(0, target.x + 20),
      y: Math.max(0, target.y - 20),
    };
    setPlacements((prev) => [...prev, clone]);
    setActivePlacementId(clone.id);
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

  // Generate & Sign PDF
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

    try {
      const { url } = await applySignaturesAndExport(
        pdfInfo,
        signature.pngBytes,
        placements
      );

      setSignedResult({
        blobUrl: url,
        fileName: pdfInfo.name,
        count: placements.length,
      });
    } catch (err: any) {
      console.error('Failed to sign PDF:', err);
      setErrorMessage('Error exporting signed PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Active page info
  const activePageInfo =
    pdfInfo?.pages[currentPageIndex] ||
    pdfInfo?.pages[0] || { pageNumber: 1, width: 612, height: 792 };

  const uniqueSignedPagesCount = new Set(placements.map((p) => p.pageNumber)).size;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <a href="/" className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              SignFlow
            </a>
          </div>

          {/* Navigation indicators */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Client-Side Privacy (গোপনীয়তা সুৰক্ষিত)</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Multi-Page Batch Signing (প্ৰতিটো পৃষ্ঠাত চহী)</span>
            </span>
          </nav>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateSignedPdf}
              disabled={isExporting || !pdfInfo || !signature || placements.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              {isExporting ? (
                <span>Embedding Signatures...</span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Signed PDF (ডাউনলোড কৰক)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
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

        {/* If signed result is ready, present the preview modal/panel */}
        {signedResult ? (
          <SignedPdfViewer
            signedBlobUrl={signedResult.blobUrl}
            originalFileName={signedResult.fileName}
            placementsCount={signedResult.count}
            onEditMore={() => setSignedResult(null)}
            onResetAll={() => {
              setSignedResult(null);
              handleResetPdf();
            }}
          />
        ) : (
          /* Split Workspace Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Configuration & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. PDF Document Upload */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <PdfUploader
                  pdfInfo={pdfInfo}
                  isLoading={false}
                  onPdfSelected={handlePdfSelected}
                  onLoadSample={handleLoadSamplePdf}
                  onResetPdf={handleResetPdf}
                />
              </div>

              {/* 2. Signature Upload & Automatic Background Removal */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
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
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
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
                    }}
                    onUpdatePlacement={handleUpdatePlacement}
                    onAddPlacement={handleAddPlacement}
                    onRemovePlacement={handleRemovePlacement}
                    onDuplicatePlacement={handleDuplicatePlacement}
                    onApplyToAllPages={handleApplyToAllPages}
                    onApplyToLastPage={handleApplyToLastPage}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Visual Page Canvas & Multi-Page View (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
                {/* View Switcher & Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Visual Document View (নথি চাওক)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {uniqueSignedPagesCount} of {pdfInfo ? pdfInfo.pageCount : 1} pages signed
                    </p>
                  </div>

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
                      <span>All Pages Flow</span>
                    </button>
                  </div>
                </div>

                {/* Sub-bar for Single Page navigation */}
                {canvasViewMode === 'focus' && pdfInfo && (
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
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

                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {currentPageIndex + 1} / {pdfInfo.pageCount}
                      </span>

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
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-center min-h-[460px]">
                    <VisualPageCanvas
                      pageInfo={activePageInfo}
                      placements={placements}
                      activePlacementId={activePlacementId}
                      signature={signature}
                      onSelectPlacement={(id) => setActivePlacementId(id)}
                      onUpdatePlacement={handleUpdatePlacement}
                      onAddPlacementAtCoords={handleAddPlacementAtCoords}
                    />
                  </div>
                ) : (
                  /* All Pages Flow View */
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    {pdfInfo && (
                      <AllPagesFlowView
                        pages={pdfInfo.pages}
                        placements={placements}
                        activePlacementId={activePlacementId}
                        signature={signature}
                        onSelectPlacement={(id) => setActivePlacementId(id)}
                        onUpdatePlacement={handleUpdatePlacement}
                        onAddPlacementToPage={handleAddPlacementToPage}
                        onRemovePlacement={handleRemovePlacement}
                        onFocusPage={(pageIdx) => {
                          setCurrentPageIndex(pageIdx);
                          setCanvasViewMode('focus');
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Bottom Quick Action in Visual inspector */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {canvasViewMode === 'focus'
                      ? 'ডকুমেণ্টত যিকোনো ঠাইত ক্লিক কৰি চহী সলাওক বা স্থান নিৰ্ধাৰণ কৰক'
                      : 'প্ৰতিটো পৃষ্ঠাত নিজ ইচ্ছামতে চহী বহুৱাওক আৰু এডজাষ্ট কৰক'}
                  </span>
                  {placements.length > 0 && (
                    <button
                      onClick={() => handleApplyToAllPages(activePlacementId || placements[0].id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>সকলো পৃষ্ঠাত বহুৱাওক</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ready to sign banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-5 shadow-md flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Sign & Download Document (চহী সম্পূৰ্ণ কৰক)
                  </h4>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {placements.length} {placements.length === 1 ? 'signature' : 'signatures'} across{' '}
                    {uniqueSignedPagesCount} {uniqueSignedPagesCount === 1 ? 'page' : 'pages'}
                  </p>
                </div>

                <button
                  onClick={handleGenerateSignedPdf}
                  disabled={isExporting || !pdfInfo || !signature || placements.length === 0}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Export Signed PDF</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SignFlow</span>
            <span>·</span>
            <span>Client-side PDF signature engine powered by pdf-lib</span>
          </div>
          <div>
            <span>আপোনাৰ সকলো নথি আৰু চহী আপোনাৰ ডিভাইচতে সম্পূৰ্ণ সুৰক্ষিতভাৱে প্ৰচেচ কৰা হয়।</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
