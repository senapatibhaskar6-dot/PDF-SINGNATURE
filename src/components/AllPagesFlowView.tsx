import React from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature } from '../types';
import { Plus, Check, Move, Trash2 } from 'lucide-react';

interface AllPagesFlowViewProps {
  pages: PageInfo[];
  placements: SignaturePlacement[];
  activePlacementId: string | null;
  signature: ProcessedSignature | null;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacementToPage: (pageNumber: number, x?: number, y?: number) => void;
  onRemovePlacement: (id: string) => void;
  onFocusPage: (pageIndex: number) => void;
}

export const AllPagesFlowView: React.FC<AllPagesFlowViewProps> = ({
  pages,
  placements,
  activePlacementId,
  signature,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacementToPage,
  onRemovePlacement,
  onFocusPage,
}) => {
  return (
    <div className="space-y-6 max-h-[700px] overflow-y-auto pr-1">
      {pages.map((page) => {
        const pagePlacements = placements.filter((p) => p.pageNumber === page.pageNumber);
        const isSigned = pagePlacements.length > 0;

        // Scale down to fit preview card
        const cardWidth = 340;
        const scale = cardWidth / page.width;
        const cardHeight = Math.round(page.height * scale);

        return (
          <div
            key={page.pageNumber}
            className={`bg-white border rounded-xl p-4 transition-all shadow-2xs ${
              isSigned ? 'border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/50'
            }`}
          >
            {/* Page Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Page {page.pageNumber} of {pages.length} (পৃষ্ঠা {page.pageNumber})
                </span>
                {isSigned ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    <Check className="w-3 h-3" /> Signed ({pagePlacements.length})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    No Signature (চহী নাই)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isSigned ? (
                  <button
                    type="button"
                    onClick={() => onAddPlacementToPage(page.pageNumber)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Sign This Page (চহী দিয়ক)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onFocusPage(page.pageNumber - 1)}
                    className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded font-medium transition-colors"
                  >
                    Focus & Fine-Tune
                  </button>
                )}
              </div>
            </div>

            {/* Page Canvas Simulator */}
            <div className="flex justify-center">
              <div
                className="relative bg-white shadow-xs border border-slate-300 rounded-xs overflow-hidden cursor-crosshair transition-shadow hover:shadow-md"
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = Math.round((e.clientX - rect.left) / scale);
                  const clickYScreen = Math.round((e.clientY - rect.top) / scale);

                  if (isSigned && pagePlacements[0]) {
                    // Update existing signature position on click
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
                    // Add new signature on click
                    const defaultH = 50;
                    const pdfY = Math.max(0, page.height - clickYScreen - defaultH);
                    onAddPlacementToPage(page.pageNumber, clickX, pdfY);
                  }
                }}
              >
                {/* Simulated Document lines */}
                <div className="absolute inset-0 p-5 pointer-events-none opacity-25 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-2.5 bg-slate-300 rounded w-1/3 mb-3" />
                    <div className="h-1.5 bg-slate-200 rounded w-full" />
                    <div className="h-1.5 bg-slate-200 rounded w-11/12" />
                    <div className="h-1.5 bg-slate-200 rounded w-4/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-slate-200 rounded w-full" />
                    <div className="h-1.5 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>

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
                      className={`absolute border-2 rounded transition-colors cursor-move group ${
                        isActive
                          ? 'border-blue-600 bg-blue-500/15 shadow-xs'
                          : 'border-slate-600 bg-slate-500/10 hover:border-blue-500'
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
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          <Move className="w-3 h-3 text-slate-400" />
                        </div>
                      )}

                      {/* Small remove icon on hover */}
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/70 p-4 text-center">
                    <p className="text-xs font-semibold text-slate-700 mb-0.5">
                      Click anywhere to place signature
                    </p>
                    <p className="text-[10px] text-slate-500">
                      (চহী বহুৱাবলৈ পৃষ্ঠাটোত ক্লিক কৰক)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
