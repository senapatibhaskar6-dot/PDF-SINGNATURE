import React, { useRef, useState, useEffect } from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature, PageNumberingOptions } from '../types';
import { renderPdfPageToCanvas } from '../utils/pdfRenderer';
import { formatPageNumberText, calculatePageNumberBounds } from '../utils/pageNumberHelper';
import {
  Move,
  Copy,
  Trash2,
  Sparkles,
  RefreshCw,
  Hand,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Hash,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react';

interface VisualPageCanvasProps {
  pageInfo: PageInfo;
  pdfRawBytes?: Uint8Array;
  placements: SignaturePlacement[];
  activePlacementId: string | null;
  signature: ProcessedSignature | null;
  pageNumbering?: PageNumberingOptions;
  totalPages?: number;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacementAtCoords: (x: number, y: number) => void;
  onDuplicatePlacement?: (id: string) => void;
  onRemovePlacement?: (id: string) => void;
  onApplyToAllPages?: (id: string) => void;
  onRotatePage?: (delta: number) => void;
  onRotateAllPages?: (delta: number) => void;
  onOpenPageNumberModal?: () => void;
  onUpdatePageNumbering?: (updates: Partial<PageNumberingOptions>) => void;
  onJumpToPage?: (pageNumber: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onSaveAndNextPage?: () => void;
}

export const VisualPageCanvas: React.FC<VisualPageCanvasProps> = ({
  pageInfo,
  pdfRawBytes,
  placements,
  activePlacementId,
  signature,
  pageNumbering,
  totalPages,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacementAtCoords,
  onDuplicatePlacement,
  onRemovePlacement,
  onApplyToAllPages,
  onRotatePage,
  onRotateAllPages,
  onOpenPageNumberModal,
  onUpdatePageNumbering,
  onJumpToPage,
  onNextPage,
  onPrevPage,
  onSaveAndNextPage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  const [scale, setScale] = useState<number>(1);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1);
  const [isPdfRendering, setIsPdfRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [pageNumberDrag, setPageNumberDrag] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    placementId: string;
    isDragging: boolean;
    isResizing: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Compute container scale to fit mobile and desktop responsive frame
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const availableW = containerWidth > 40 ? Math.max(200, containerWidth - 16) : 300;
      const baseScale = availableW / pageInfo.width;
      setScale(Math.min(1.8, Math.max(0.25, baseScale * zoomMultiplier)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pageInfo.width, zoomMultiplier]);

  // Render REAL PDF content onto canvas whenever page or pdf changes
  useEffect(() => {
    let isCancelled = false;

    async function loadPdfContent() {
      if (!pdfRawBytes || !pdfCanvasRef.current) return;
      setIsPdfRendering(true);
      setRenderError(null);

      try {
        const targetW = Math.round(pageInfo.width * scale * window.devicePixelRatio);
        await renderPdfPageToCanvas(
          pdfRawBytes,
          pageInfo.pageNumber,
          pdfCanvasRef.current,
          targetW
        );
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('PDF page render error, falling back:', err);
          setRenderError(err.message || 'Render issue');
        }
      } finally {
        if (!isCancelled) {
          setIsPdfRendering(false);
        }
      }
    }

    loadPdfContent();

    return () => {
      isCancelled = true;
    };
  }, [pdfRawBytes, pageInfo.pageNumber, pageInfo.width, pageInfo.height, pageInfo.rotation, scale]);

  const [pageJumpInput, setPageJumpInput] = useState<string>(String(pageInfo.pageNumber));

  useEffect(() => {
    setPageJumpInput(String(pageInfo.pageNumber));
  }, [pageInfo.pageNumber]);

  // Handle clicking "Go ➔" or pressing Enter in page input:
  // Saves current page signature & advances to specified page (or next page if same number), replicating the signature!
  const handleExecuteGo = () => {
    const rawTarget = parseInt(pageJumpInput, 10);
    const target = isNaN(rawTarget) ? pageInfo.pageNumber + 1 : rawTarget;
    if (onJumpToPage) {
      onJumpToPage(target);
    } else if (onSaveAndNextPage) {
      onSaveAndNextPage();
    }
  };

  // Keyboard shortcut listener: Ctrl+C, Ctrl+V, Delete, Enter (Save & Next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key shortcut: Save signature and jump to next page
      if (e.key === 'Enter') {
        const activeElem = document.activeElement;
        const isInput =
          activeElem?.tagName === 'INPUT' || activeElem?.tagName === 'TEXTAREA';

        if (activeElem?.getAttribute('data-page-jump') === 'true') {
          e.preventDefault();
          handleExecuteGo();
          (activeElem as HTMLElement)?.blur();
          return;
        }

        if (!isInput && onSaveAndNextPage) {
          e.preventDefault();
          onSaveAndNextPage();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (activePlacementId) {
          e.preventDefault();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (activePlacementId && onDuplicatePlacement) {
          e.preventDefault();
          onDuplicatePlacement(activePlacementId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          activePlacementId &&
          onRemovePlacement &&
          placements.length > 1
        ) {
          e.preventDefault();
          onRemovePlacement(activePlacementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlacementId, onDuplicatePlacement, onRemovePlacement, placements.length, pageJumpInput, onJumpToPage, onSaveAndNextPage, pageInfo.pageNumber]);

  // Filter placements belonging to this page
  const pagePlacements = placements.filter((p) => p.pageNumber === pageInfo.pageNumber);

  // Convert placement coordinates to visual screen pixels (top-left based)
  const getVisualBox = (p: SignaturePlacement) => {
    const visualX = p.x * scale;
    let visualY = p.y * scale;

    if (p.origin === 'bottom-left') {
      visualY = (pageInfo.height - p.y - p.height) * scale;
    } else {
      visualY = p.y * scale;
    }

    const visualW = p.width * scale;
    const visualH = p.height * scale;

    return { visualX, visualY, visualW, visualH };
  };

  // Dragging & Resizing handlers
  const handlePointerDownPlacement = (
    e: React.PointerEvent,
    placement: SignaturePlacement,
    isResize: boolean
  ) => {
    e.stopPropagation();
    onSelectPlacement(placement.id);

    setDragState({
      placementId: placement.id,
      isDragging: !isResize,
      isResizing: isResize,
      startX: e.clientX,
      startY: e.clientY,
      initialX: placement.x,
      initialY: placement.y,
      initialW: placement.width,
      initialH: placement.height,
    });
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // 1. Signature Placement Dragging or Resizing
      if (dragState) {
        const deltaScreenX = e.clientX - dragState.startX;
        const deltaScreenY = e.clientY - dragState.startY;
        const deltaPtX = Math.round(deltaScreenX / scale);
        const deltaPtY = Math.round(deltaScreenY / scale);

        const placement = placements.find((p) => p.id === dragState.placementId);
        if (placement) {
          if (dragState.isDragging) {
            let newX = Math.max(0, Math.min(pageInfo.width - placement.width, dragState.initialX + deltaPtX));
            let newY = dragState.initialY;

            if (placement.origin === 'bottom-left') {
              newY = Math.max(0, Math.min(pageInfo.height - placement.height, dragState.initialY - deltaPtY));
            } else {
              newY = Math.max(0, Math.min(pageInfo.height - placement.height, dragState.initialY + deltaPtY));
            }

            onUpdatePlacement(placement.id, { x: newX, y: newY });
          } else if (dragState.isResizing) {
            const aspect = signature?.aspectRatio || (dragState.initialW / Math.max(1, dragState.initialH));
            const newW = Math.max(40, Math.min(pageInfo.width - placement.x, dragState.initialW + deltaPtX));
            const newH = Math.round(newW / aspect);

            onUpdatePlacement(placement.id, { width: newW, height: newH });
          }
        }
      }

      // 2. Page Number Badge Dragging (Manual Positioning anywhere on page)
      if (pageNumberDrag?.isDragging && pageNumbering && onUpdatePageNumbering) {
        const deltaPtX = Math.round((e.clientX - pageNumberDrag.startX) / scale);
        const deltaPtY = Math.round((e.clientY - pageNumberDrag.startY) / scale);

        const newX = Math.max(4, Math.min(pageInfo.width - 60, pageNumberDrag.initialX + deltaPtX));
        const newY = Math.max(4, Math.min(pageInfo.height - 25, pageNumberDrag.initialY + deltaPtY));
        const newXPercent = Math.round((newX / pageInfo.width) * 1000) / 10;
        const newYPercent = Math.round((newY / pageInfo.height) * 1000) / 10;

        onUpdatePageNumbering({
          positionMode: 'manual_drag',
          manualX: newX,
          manualY: newY,
          manualXPercent: newXPercent,
          manualYPercent: newYPercent,
        });
      }
    };

    const handlePointerUp = () => {
      if (dragState) setDragState(null);
      if (pageNumberDrag) setPageNumberDrag(null);
    };

    if (dragState || pageNumberDrag) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, pageNumberDrag, scale, pageInfo, placements, signature, onUpdatePlacement, pageNumbering, onUpdatePageNumbering]);

  // Click directly on real document to drop or move signature
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXScreen = e.clientX - rect.left;
    const clickYScreen = e.clientY - rect.top;

    const clickPtX = Math.round(clickXScreen / scale);
    const clickPtYScreen = Math.round(clickYScreen / scale);

    // If active placement exists on this page, move it directly to click point
    if (activePlacementId) {
      const active = placements.find((p) => p.id === activePlacementId && p.pageNumber === pageInfo.pageNumber);
      if (active) {
        const halfW = Math.round(active.width / 2);
        const halfH = Math.round(active.height / 2);
        const targetX = Math.max(0, Math.min(pageInfo.width - active.width, clickPtX - halfW));

        let targetY: number;
        if (active.origin === 'bottom-left') {
          targetY = Math.max(0, Math.min(pageInfo.height - active.height, pageInfo.height - clickPtYScreen - halfH));
        } else {
          targetY = Math.max(0, Math.min(pageInfo.height - active.height, clickPtYScreen - halfH));
        }

        onUpdatePlacement(active.id, { x: targetX, y: targetY });
        return;
      }
    }

    // Otherwise drop/paste a new signature placement right at this clicked coordinate!
    onAddPlacementAtCoords(clickPtX, clickPtYScreen);
  };

  const canvasWidthPx = Math.round(pageInfo.width * scale);
  const canvasHeightPx = Math.round(pageInfo.height * scale);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center select-none">
      {/* 1. Primary Page Jump & Save-and-Next (Enter) Bar */}
      <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-xl p-2 sm:p-2.5 mb-2.5 flex items-center justify-between flex-wrap gap-2.5 shadow-sm">
        {/* Left: Interactive Manual Page Jump Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/60 border border-slate-300 rounded-lg px-2.5 py-1 transition-colors">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
              <span>📄 পৃষ্ঠা (Page):</span>
            </span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              data-page-jump="true"
              value={pageJumpInput}
              onChange={(e) => setPageJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExecuteGo();
                  (e.target as HTMLElement)?.blur();
                }
              }}
              className="w-14 text-center text-xs font-mono font-bold bg-white border border-slate-300 rounded-md py-0.5 text-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
              title="পৃষ্ঠা নম্বৰ লিখক আৰু Go ক্লিক কৰক বা Enter টিপক"
            />
            <span className="text-xs font-mono text-slate-500 font-semibold">
              / {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={handleExecuteGo}
              className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
              title="চহী সংৰক্ষণ কৰি এই পৃষ্ঠা / Next পৃষ্ঠালৈ যাওক (Go & Save to next page)"
            >
              <span>Go</span>
              <span>➔</span>
            </button>
          </div>

          {/* Quick Prev / Next page arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={pageInfo.pageNumber <= 1}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-slate-700 shadow-2xs transition-colors"
              title="Previous Page (পূৰ্বৰ পৃষ্ঠা)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={pageInfo.pageNumber >= (totalPages || 1)}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-slate-700 shadow-2xs transition-colors"
              title="Next Page (পৰৱৰ্তী পৃষ্ঠা)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Save & Next Page Button with Enter shortcut indicator */}
        {onSaveAndNextPage && (
          <button
            type="button"
            onClick={onSaveAndNextPage}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all"
            title="চহী সংৰক্ষণ কৰি পৰৱৰ্তী পৃষ্ঠাত চহী বহুৱাওক (বা কিবৰ্ডত Enter টিপক)"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Save & Next Page</span>
            <span className="bg-emerald-950/70 text-emerald-100 px-1.5 py-0.2 rounded font-mono text-[10px] border border-emerald-400/40 font-bold">
              Enter ↵
            </span>
          </button>
        )}
      </div>

      {/* On-Canvas Guide Header & Rotation Tools */}
      <div className="w-full max-w-2xl bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-2 mb-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Hand className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>ক্লিক কৰি চহী বহুৱাওক:</strong> য'ত চহী লাগে তাত ক্লিক কৰক আৰু ড্ৰেগ কৰক!
          </span>
        </div>

        {/* Rotation and Duplicate Controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {onRotatePage && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Flip 180 button (Instantly fixes upside-down uploaded PDFs) */}
              <button
                type="button"
                onClick={() => onRotatePage(180)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md text-[11px] font-bold transition-all shadow-xs"
                title="পৃষ্ঠাটো উল্টা হৈ থাকিলে ১৮০° চিধা কৰক (Flip this page 180°)"
              >
                <span>🔄 Flip 180° (চিধা কৰক)</span>
              </button>

              <button
                type="button"
                onClick={() => onRotatePage(90)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white text-slate-800 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                title="Rotate page 90° clockwise (সোঁফালে ঘূৰাওক)"
              >
                <span>90° ⟳</span>
              </button>

              <button
                type="button"
                onClick={() => onRotatePage(-90)}
                className="inline-flex items-center gap-1 px-1.5 py-1 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                title="Rotate page 90° counter-clockwise (বাওঁফালে ঘূৰাওক)"
              >
                <span>⟲</span>
              </button>

              {onRotateAllPages && (
                <button
                  type="button"
                  onClick={() => onRotateAllPages(180)}
                  className="px-2 py-1 text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md text-[10px] font-bold transition-colors shadow-2xs"
                  title="সকলো পৃষ্ঠা ১৮০° উল্টা চিধা কৰক (Flip all pages 180°)"
                >
                  সকলো ১৮০° Flip
                </button>
              )}
            </div>
          )}

          {/* Zoom controls (especially useful on mobile) */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setZoomMultiplier((prev) => Math.max(0.6, prev - 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              title="Zoom Out (জুম সৰু কৰক)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-semibold px-1 text-slate-700">
              {Math.round(zoomMultiplier * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomMultiplier((prev) => Math.min(2.5, prev + 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              title="Zoom In (জুম ডাঙৰ কৰক)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenPageNumberModal && (
            <button
              type="button"
              onClick={onOpenPageNumberModal}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${
                pageNumbering?.enabled
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white text-slate-800 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-300'
              }`}
              title="পেজ নম্বৰ ছেটিংছ (Page Number Settings)"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>পেজ নম্বৰ {pageNumbering?.enabled ? '(Active)' : ''}</span>
            </button>
          )}

          {activePlacementId && onDuplicatePlacement && (
            <button
              type="button"
              onClick={() => onDuplicatePlacement(activePlacementId)}
              className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              + Duplicate
            </button>
          )}
        </div>
      </div>

      {/* Real PDF Canvas Document Frame */}
      <div
        className="relative bg-white shadow-xl border border-slate-300 rounded-xs overflow-hidden transition-shadow hover:shadow-2xl cursor-crosshair"
        style={{
          width: `${canvasWidthPx}px`,
          height: `${canvasHeightPx}px`,
        }}
        onClick={handlePageClick}
      >
        {/* Real PDF Rendered Canvas */}
        <canvas
          ref={pdfCanvasRef}
          className="w-full h-full object-contain pointer-events-none block"
          style={{ width: `${canvasWidthPx}px`, height: `${canvasHeightPx}px` }}
        />

        {/* Loading Spinner */}
        {isPdfRendering && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-700">
              Rendering PDF Page {pageInfo.pageNumber}...
            </span>
          </div>
        )}

        {/* Signature Placements Layer */}
        {pagePlacements.map((placement, index) => {
          const { visualX, visualY, visualW, visualH } = getVisualBox(placement);
          const isActive = placement.id === activePlacementId;

          return (
            <div
              key={placement.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlacement(placement.id);
              }}
              onPointerDown={(e) => handlePointerDownPlacement(e, placement, false)}
              className={`absolute cursor-grab active:cursor-grabbing border-2 rounded transition-colors group z-20 ${
                isActive
                  ? 'border-blue-600 bg-blue-500/10 shadow-lg ring-2 ring-blue-500/30'
                  : 'border-blue-500/70 bg-blue-500/5 hover:border-blue-600'
              }`}
              style={{
                left: `${visualX}px`,
                top: `${visualY}px`,
                width: `${visualW}px`,
                height: `${visualH}px`,
                touchAction: 'none',
              }}
            >
              {/* Floating Toolbar above the signature */}
              {isActive && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[11px] font-semibold py-1 px-2 rounded-md shadow-md flex items-center gap-2 whitespace-nowrap z-30 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onDuplicatePlacement) onDuplicatePlacement(placement.id);
                    }}
                    className="hover:text-blue-300 flex items-center gap-1 transition-colors"
                    title="Copy and paste this signature"
                  >
                    <Copy className="w-3 h-3 text-blue-400" />
                    <span>Copy</span>
                  </button>
                  <span className="text-slate-600">|</span>
                  {onApplyToAllPages && (
                    <button
                      type="button"
                      onClick={() => onApplyToAllPages(placement.id)}
                      className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                      title="Paste on all pages"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>All Pages</span>
                    </button>
                  )}
                  {onSaveAndNextPage && (
                    <>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={onSaveAndNextPage}
                        className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-bold transition-colors"
                        title="চহী সংৰক্ষণ কৰি পিছৰ পৃষ্ঠালৈ যাওক (বা Enter টিপক)"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Next (Enter ↵)</span>
                      </button>
                    </>
                  )}
                  {onRemovePlacement && placements.length > 1 && (
                    <>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => onRemovePlacement(placement.id)}
                        className="hover:text-red-400 flex items-center gap-1 transition-colors"
                        title="Delete this signature"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Signature Image preview */}
              {signature ? (
                <img
                  src={signature.processedDataUrl}
                  alt="Signature"
                  className="w-full h-full object-contain pointer-events-none drop-shadow-sm select-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono font-medium">
                  <Move className="w-4 h-4 mb-1 text-slate-400" />
                  <span>Signature #{index + 1}</span>
                </div>
              )}

              {/* Resize Handle (Bottom-Right corner) */}
              <div
                onPointerDown={(e) => handlePointerDownPlacement(e, placement, true)}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nwse-resize flex items-center justify-center hover:scale-125 transition-transform z-30"
                title="Drag to resize signature"
              >
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-xs" />
              </div>
            </div>
          );
        })}

        {/* Live Page Number Badge Preview with Free Drag & Drop */}
        {pageNumbering?.enabled &&
          (() => {
            const pageNumStr = formatPageNumberText(
              pageInfo.pageNumber - 1,
              totalPages || 1,
              pageNumbering
            );
            if (!pageNumStr) return null;

            const bounds = calculatePageNumberBounds(
              pageInfo.width,
              pageInfo.height,
              60,
              16,
              pageNumbering
            );

            const leftPx = Math.round(bounds.x * scale);
            const topPx = Math.round(bounds.yTop * scale);

            return (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setPageNumberDrag({
                    isDragging: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialX: bounds.x,
                    initialY: bounds.yTop,
                  });
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (onOpenPageNumberModal) onOpenPageNumberModal();
                }}
                className={`absolute select-none z-30 cursor-grab active:cursor-grabbing transition-shadow hover:scale-105 group ${
                  pageNumberDrag?.isDragging ? 'opacity-90 ring-2 ring-purple-500 scale-105 shadow-lg' : ''
                }`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  touchAction: 'none',
                }}
                title="ড্ৰেগ কৰি যিকোনো স্থানত বহুৱাওক (Drag anywhere. Double click for settings)"
              >
                <span
                  style={{
                    color: pageNumbering.fontColor,
                    fontSize: `${Math.max(9, Math.round(pageNumbering.fontSize * scale * 1.05))}px`,
                  }}
                  className={`font-semibold tracking-wide flex items-center gap-1.5 ${
                    pageNumbering.includeBackgroundPill
                      ? 'bg-white/95 px-2.5 py-0.5 rounded-full shadow-md border border-slate-300 backdrop-blur-xs'
                      : ''
                  } ${
                    pageNumbering.positionMode === 'manual_drag'
                      ? 'ring-1 ring-purple-500'
                      : ''
                  }`}
                >
                  <Move className="w-2.5 h-2.5 opacity-60 text-purple-600 group-hover:opacity-100" />
                  <span>{pageNumStr}</span>
                </span>

                {/* Floating tooltip */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-md whitespace-nowrap pointer-events-none">
                  <span>ড্ৰেগ কৰক (Drag)</span>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-xs text-slate-500 text-center max-w-md">
        💡 আপুনি নিজৰ হাতেৰে চহীটো ড্ৰেগ (Drag) কৰি যিকোনো স্থানত নিব পাৰিব আৰু কোণত ধৰি সৰু-ডাঙৰ কৰিব পাৰিব।
      </div>
    </div>
  );
};
