import React, { useEffect, useRef } from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature } from '../types';
import { renderPdfPageToCanvas } from '../utils/pdfRenderer';
import { Plus, Check, Move, Trash2, Hand, RotateCw } from 'lucide-react';

interface AllPagesFlowViewProps {
  pages: PageInfo[];
  pdfRawBytes?: Uint8Array;
  placements: SignaturePlacement[];
  activePlacementId: string | null;
  signature: ProcessedSignature | null;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacementToPage: (pageNumber: number, x?: number, y?: number) => void;
  onRemovePlacement: (id: string) => void;
  onFocusPage: (pageIndex: number) => void;
  onRotatePage?: (pageNumber: number, delta: number) => void;
  onRotateAllPages?: (delta: number) => void;
}

// Single Page Item with Real PDF Canvas
const RealPdfPageCard: React.FC<{
  page: PageInfo;
  totalPages: number;
  pdfRawBytes?: Uint8Array;
  placements: SignaturePlacement[];
  activePlacementId: string | null;
  signature: ProcessedSignature | null;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacementToPage: (pageNumber: number, x?: number, y?: number) => void;
  onRemovePlacement: (id: string) => void;
  onFocusPage: (pageIndex: number) => void;
  onRotatePage?: (pageNumber: number, delta: number) => void;
}> = ({
  page,
  totalPages,
  pdfRawBytes,
  placements,
  activePlacementId,
  signature,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacementToPage,
  onRemovePlacement,
  onFocusPage,
  onRotatePage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardWidth = 360;
  const scale = cardWidth / page.width;
  const cardHeight = Math.round(page.height * scale);

  const pagePlacements = placements.filter((p) => p.pageNumber === page.pageNumber);
  const isSigned = pagePlacements.length > 0;

  useEffect(() => {
    let isCancelled = false;
    async function loadPage() {
      if (!pdfRawBytes || !canvasRef.current) return;
      try {
        await renderPdfPageToCanvas(
          pdfRawBytes,
          page.pageNumber,
          canvasRef.current,
          Math.round(cardWidth * window.devicePixelRatio)
        );
      } catch (err) {
        if (!isCancelled) console.warn('Render flow error:', err);
      }
    }
    loadPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfRawBytes, page.pageNumber, cardWidth, page.rotation, page.width, page.height]);

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all shadow-sm ${
        isSigned ? 'border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/50'
      }`}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            Page {page.pageNumber} of {totalPages} (পৃষ্ঠা {page.pageNumber})
          </span>
          {isSigned ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              <Check className="w-3 h-3" /> Signed ({pagePlacements.length})
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              No Signature
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onAddPlacementToPage(page.pageNumber)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>+ Paste Signature</span>
          </button>
          {onRotatePage && (
            <>
              <button
                type="button"
                onClick={() => onRotatePage(page.pageNumber, 180)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded shadow-2xs transition-colors"
                title="পৃষ্ঠা ১৮০° চিধা কৰক (Flip this page 180°)"
              >
                <span>🔄 180° Flip</span>
              </button>
              <button
                type="button"
                onClick={() => onRotatePage(page.pageNumber, 90)}
                className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                title="Rotate this page 90° clockwise (পৃষ্ঠা ঘূৰাওক ⟳)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onFocusPage(page.pageNumber - 1)}
            className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded font-medium transition-colors"
          >
            Full View
          </button>
        </div>
      </div>

      {/* Real Page Canvas Simulator */}
      <div className="flex justify-center">
        <div
          className="relative bg-white shadow-md border border-slate-300 rounded-xs overflow-hidden cursor-crosshair transition-shadow hover:shadow-lg"
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = Math.round((e.clientX - rect.left) / scale);
            const clickYScreen = Math.round((e.clientY - rect.top) / scale);

            if (isSigned && pagePlacements[0]) {
              const active = pagePlacements[0];
              const halfW = Math.round(active.width / 2);
              const halfH = Math.round(active.height / 2);
              const targetX = Math.max(0, Math.min(page.width - active.width, clickX - halfW));
              const targetY =
                active.origin === 'bottom-left'
                  ? Math.max(0, Math.min(page.height - active.height, page.height - clickYScreen - halfH))
                  : Math.max(0, Math.min(page.height - active.height, clickYScreen - halfH));
              onUpdatePlacement(active.id, { x: targetX, y: targetY });
              onSelectPlacement(active.id);
            } else {
              const defaultH = 50;
              const pdfY = Math.max(0, page.height - clickYScreen - defaultH);
              onAddPlacementToPage(page.pageNumber, clickX, pdfY);
            }
          }}
        >
          {/* Real PDF Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none block"
            style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
          />

          {/* Render signatures for this page */}
          {pagePlacements.map((placement) => {
            const visualX = placement.x * scale;
            let visualY = placement.y * scale;
            if (placement.origin === 'bottom-left') {
              visualY = (page.height - placement.y - placement.height) * scale;
            }
            const visualW = placement.width * scale;
            const visualH = placement.height * scale;
            const isActive = placement.id === activePlacementId;

            return (
              <div
                key={placement.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(placement.id);
                }}
                className={`absolute border-2 rounded transition-colors cursor-move group z-20 ${
                  isActive
                    ? 'border-blue-600 bg-blue-500/15 shadow-sm'
                    : 'border-blue-500/80 bg-blue-500/10 hover:border-blue-600'
                }`}
                style={{
                  left: `${visualX}px`,
                  top: `${visualY}px`,
                  width: `${visualW}px`,
                  height: `${visualH}px`,
                }}
              >
                {signature ? (
                  <img
                    src={signature.processedDataUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                    <Move className="w-3 h-3 text-slate-400" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePlacement(placement.id);
                  }}
                  title="Remove from this page"
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}

          {/* Empty State Overlay */}
          {!isSigned && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 hover:bg-white/10 transition-colors p-4 text-center cursor-pointer">
              <div className="bg-white/95 px-3 py-1.5 rounded-lg border border-slate-300 shadow-md">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <Hand className="w-3.5 h-3.5 text-blue-600" />
                  <span>Click to paste signature here</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  (চহী বহুৱাবলৈ ইয়াত ক্লিক কৰক)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AllPagesFlowView: React.FC<AllPagesFlowViewProps> = (props) => {
  return (
    <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
      {props.onRotateAllPages && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs shadow-2xs">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
            <span>PDF ফাইল ওলোটা (Upside down) হৈ থাকিলে চিধা কৰক:</span>
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => props.onRotateAllPages && props.onRotateAllPages(180)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold transition-all shadow-xs"
              title="সকলো পৃষ্ঠা ১৮০° উল্টা চিধা কৰক (Flip all pages 180°)"
            >
              <span>🔄 সকলো পৃষ্ঠা ১৮০° Flip (চিধা কৰক)</span>
            </button>
            <button
              type="button"
              onClick={() => props.onRotateAllPages && props.onRotateAllPages(90)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-800 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              title="সকলো পৃষ্ঠা ৯০° সোঁফালে ঘূৰাওক (Rotate all 90° clockwise)"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              <span>সকলো ৯০° ⟳</span>
            </button>
            <button
              type="button"
              onClick={() => props.onRotateAllPages && props.onRotateAllPages(-90)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              title="সকলো পৃষ্ঠা ৯০° বাওঁফালে ঘূৰাওক (Rotate all 90° counter-clockwise)"
            >
              <span>⟲</span>
            </button>
          </div>
        </div>
      )}

      {props.pages.map((page) => (
        <RealPdfPageCard
          key={page.pageNumber}
          page={page}
          totalPages={props.pages.length}
          pdfRawBytes={props.pdfRawBytes}
          placements={props.placements}
          activePlacementId={props.activePlacementId}
          signature={props.signature}
          onSelectPlacement={props.onSelectPlacement}
          onUpdatePlacement={props.onUpdatePlacement}
          onAddPlacementToPage={props.onAddPlacementToPage}
          onRemovePlacement={props.onRemovePlacement}
          onFocusPage={props.onFocusPage}
          onRotatePage={props.onRotatePage}
        />
      ))}
    </div>
  );
};
