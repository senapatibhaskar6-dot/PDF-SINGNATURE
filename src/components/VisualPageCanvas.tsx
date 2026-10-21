import React, { useRef, useState, useEffect } from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature } from '../types';
import { Move, Copy, Trash2, ClipboardPaste, Sparkles, Layers } from 'lucide-react';

interface VisualPageCanvasProps {
  pageInfo: PageInfo;
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
  const [scale, setScale] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      const availableW = Math.max(260, containerWidth - 32);
      const computedScale = availableW / pageInfo.width;
      setScale(Math.min(1.1, Math.max(0.35, computedScale)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pageInfo.width]);

  // Keyboard shortcut listener: Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (activePlacementId) {
          e.preventDefault();
          setCopiedId(activePlacementId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedId || activePlacementId) {
          e.preventDefault();
          const sourceId = copiedId || activePlacementId;
          if (sourceId && onDuplicatePlacement) {
            onDuplicatePlacement(sourceId);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // If not typing in an input
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
  }, [activePlacementId, copiedId, onDuplicatePlacement, onRemovePlacement, placements.length]);

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

  // Click on page background to position or paste
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXScreen = e.clientX - rect.left;
    const clickYScreen = e.clientY - rect.top;

    const clickPtX = Math.round(clickXScreen / scale);
    const clickPtYScreen = Math.round(clickYScreen / scale);

    // If an active placement is already on this page, move it to click location
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

    // Otherwise paste/add new placement at this exact point!
    onAddPlacementAtCoords(clickPtX, clickPtYScreen);
  };

  const canvasWidthPx = Math.round(pageInfo.width * scale);
  const canvasHeightPx = Math.round(pageInfo.height * scale);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center select-none">
      {/* On-Canvas Quick Actions Bar */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 text-xs">
        <span className="text-slate-600 font-medium flex items-center gap-1">
          <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
          <span>Click anywhere on page to paste signature (ক্লিক কৰি পেষ্ট কৰক)</span>
        </span>

        {activePlacementId && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCopiedId(activePlacementId);
                if (onDuplicatePlacement) onDuplicatePlacement(activePlacementId);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-medium transition-colors text-[11px]"
            >
              <Copy className="w-3 h-3" />
              <span>Copy & Paste Here</span>
            </button>
            {onApplyToAllPages && (
              <button
                type="button"
                onClick={() => onApplyToAllPages(activePlacementId)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-medium transition-colors text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Paste on All Pages</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visual Canvas Frame */}
      <div
        className="relative bg-white shadow-md border border-slate-300 rounded-sm overflow-hidden transition-shadow hover:shadow-lg cursor-crosshair"
        style={{
          width: `${canvasWidthPx}px`,
          height: `${canvasHeightPx}px`,
        }}
        onClick={handlePageClick}
      >
        {/* Document Simulation Mock Lines */}
        <div className="absolute inset-0 p-8 pointer-events-none opacity-25 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-slate-300 rounded w-1/3 mb-4" />
            <div className="h-2 bg-slate-200 rounded w-full" />
            <div className="h-2 bg-slate-200 rounded w-11/12" />
            <div className="h-2 bg-slate-200 rounded w-4/5" />
            <div className="h-2 bg-slate-200 rounded w-full" />
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-slate-200 rounded w-full" />
            <div className="h-2 bg-slate-200 rounded w-5/6" />
            <div className="h-2 bg-slate-200 rounded w-2/3" />
          </div>

          <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-400">
            <span>Page {pageInfo.pageNumber}</span>
            <span>{pageInfo.width} × {pageInfo.height} pt</span>
          </div>
        </div>

        {/* Placements for this page */}
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
              className={`absolute cursor-grab active:cursor-grabbing border-2 rounded transition-colors group ${
                isActive
                  ? 'border-blue-600 bg-blue-500/15 shadow-md ring-2 ring-blue-500/30'
                  : 'border-slate-500 bg-slate-500/10 hover:border-blue-400 hover:bg-blue-50/20'
              }`}
              style={{
                left: `${visualX}px`,
                top: `${visualY}px`,
                width: `${visualW}px`,
                height: `${visualH}px`,
                touchAction: 'none',
              }}
            >
              {/* Floating Toolbar above the signature when active */}
              {isActive && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-medium py-0.5 px-2 rounded-md shadow-md flex items-center gap-2 whitespace-nowrap z-20 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCopiedId(placement.id);
                      if (onDuplicatePlacement) onDuplicatePlacement(placement.id);
                    }}
                    className="hover:text-blue-300 flex items-center gap-1 transition-colors"
                    title="Copy and paste this signature"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <span className="text-slate-600">|</span>
                  {onApplyToAllPages && (
                    <button
                      type="button"
                      onClick={() => onApplyToAllPages(placement.id)}
                      className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                      title="Paste to all pages"
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
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
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
                  className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
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
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-xs cursor-nwse-resize flex items-center justify-center hover:scale-125 transition-transform"
                title="Drag to resize signature"
              >
                <div className="w-1 h-1 bg-blue-600 rounded-full" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper guide */}
      <div className="mt-3 text-xs text-slate-500 text-center max-w-sm">
        💡 চহীটো ড্ৰেগ কৰি যিকোনো ঠাইলৈ নিব পাৰিব বা <strong>Ctrl+C</strong> আৰু <strong>Ctrl+V</strong> কৰি পেষ্ট কৰিব পাৰিব।
      </div>
    </div>
  );
};
