import React, { useRef, useState, useEffect } from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature } from '../types';
import { renderPdfPageToCanvas } from '../utils/pdfRenderer';
import {
  Move,
  Copy,
  Trash2,
  Sparkles,
  RefreshCw,
  Hand,
  Maximize2,
} from 'lucide-react';

interface VisualPageCanvasProps {
  pageInfo: PageInfo;
  pdfRawBytes?: Uint8Array;
  placements: SignaturePlacement[];
  activePlacementId: string | null;
  signature: ProcessedSignature | null;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacementAtCoords: (x: number, y: number) => void;
  onDuplicatePlacement?: (id: string) => void;
  onRemovePlacement?: (id: string) => void;
  onApplyToAllPages?: (id: string) => void;
}

export const VisualPageCanvas: React.FC<VisualPageCanvasProps> = ({
  pageInfo,
  pdfRawBytes,
  placements,
  activePlacementId,
  signature,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacementAtCoords,
  onDuplicatePlacement,
  onRemovePlacement,
  onApplyToAllPages,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  const [scale, setScale] = useState<number>(1);
  const [isPdfRendering, setIsPdfRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

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

  // Compute container scale to fit responsive frame
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const availableW = Math.max(300, containerWidth - 24);
      const computedScale = availableW / pageInfo.width;
      setScale(Math.min(1.4, Math.max(0.4, computedScale)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pageInfo.width]);

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
  }, [pdfRawBytes, pageInfo.pageNumber, pageInfo.width, scale]);

  // Keyboard shortcut listener: Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [activePlacementId, onDuplicatePlacement, onRemovePlacement, placements.length]);

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
      if (!dragState) return;

      const deltaScreenX = e.clientX - dragState.startX;
      const deltaScreenY = e.clientY - dragState.startY;
      const deltaPtX = Math.round(deltaScreenX / scale);
      const deltaPtY = Math.round(deltaScreenY / scale);

      const placement = placements.find((p) => p.id === dragState.placementId);
      if (!placement) return;

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
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, scale, pageInfo, placements, signature, onUpdatePlacement]);

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
      {/* On-Canvas Guide Header */}
      <div className="w-full max-w-2xl bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-2 mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Hand className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>হাত বা মাউচেৰে ক্লিক কৰক:</strong> PDF খনৰ যিকোনো ঠাইত ক্লিক কৰিলেই তাত চহী বহি যাব আৰু ড্ৰেগ কৰিব পাৰিব!
          </span>
        </div>

        {activePlacementId && onDuplicatePlacement && (
          <button
            type="button"
            onClick={() => onDuplicatePlacement(activePlacementId)}
            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs shrink-0 ml-2"
          >
            + Paste Duplicate
          </button>
        )}
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
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-xs text-slate-500 text-center max-w-md">
        💡 আপুনি নিজৰ হাতেৰে চহীটো ড্ৰেগ (Drag) কৰি যিকোনো স্থানত নিব পাৰিব আৰু কোণত ধৰি সৰু-ডাঙৰ কৰিব পাৰিব।
      </div>
    </div>
  );
};
