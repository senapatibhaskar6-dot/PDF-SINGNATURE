import React from 'react';
import { SignaturePlacement, PageInfo } from '../types';
import { Plus, Trash2, Copy, ArrowDownLeft, ArrowUpLeft, Sparkles, CheckCheck, FileText } from 'lucide-react';

interface PlacementListProps {
  placements: SignaturePlacement[];
  pages: PageInfo[];
  activePlacementId: string | null;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacement: (pageNumber?: number) => void;
  onRemovePlacement: (id: string) => void;
  onDuplicatePlacement: (id: string) => void;
  onApplyToAllPages: (basePlacementId: string) => void;
  onApplyToLastPage: (basePlacementId: string) => void;
}

export const PlacementList: React.FC<PlacementListProps> = ({
  placements,
  pages,
  activePlacementId,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacement,
  onRemovePlacement,
  onDuplicatePlacement,
  onApplyToAllPages,
  onApplyToLastPage,
}) => {
  const pageCount = pages.length;

  const getPageDimensions = (pageNum: number) => {
    const p = pages.find((page) => page.pageNumber === pageNum);
    return p || pages[0] || { width: 612, height: 792 };
  };

  const handleApplyPreset = (id: string, preset: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right') => {
    const placement = placements.find((p) => p.id === id);
    if (!placement) return;
    const { width: pageW, height: pageH } = getPageDimensions(placement.pageNumber);

    let x = placement.x;
    let y = placement.y;
    const margin = 54; // standard 0.75 in PDF margin

    if (preset === 'bottom-right') {
      x = Math.max(0, pageW - placement.width - margin);
      y = placement.origin === 'bottom-left' ? margin : pageH - placement.height - margin;
    } else if (preset === 'bottom-left') {
      x = margin;
      y = placement.origin === 'bottom-left' ? margin : pageH - placement.height - margin;
    } else if (preset === 'bottom-center') {
      x = Math.round((pageW - placement.width) / 2);
      y = placement.origin === 'bottom-left' ? margin : pageH - placement.height - margin;
    } else if (preset === 'top-right') {
      x = Math.max(0, pageW - placement.width - margin);
      y = placement.origin === 'bottom-left' ? pageH - placement.height - margin : margin;
    }

    onUpdatePlacement(id, { x, y });
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <span>Signature Placements & Coordinates</span>
            <span className="text-[11px] text-blue-700 font-normal bg-blue-50 px-2 py-0.5 rounded">
              পৃষ্ঠাৰ স্থান নিৰ্ধাৰণ
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            প্ৰতিটো পৃষ্ঠাত চহী বহুৱাব পাৰিব বা সুকীয়া সুকীয়া স্থান নিৰ্ধাৰণ কৰিব পাৰিব
          </p>
        </div>

        <button
          onClick={() => onAddPlacement()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Another Page (+ আন পৃষ্ঠা)</span>
        </button>
      </div>

      {/* Prominent Multi-Page 1-Click Action Bar */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>প্ৰতিটো পৃষ্ঠাত চহী বহুৱাবলৈ ক্লিক কৰক:</span>
          </div>

          <span className="text-[11px] text-blue-700 font-mono">
            {placements.length} of {pageCount} pages configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              const targetId = activePlacementId || placements[0]?.id;
              if (targetId) onApplyToAllPages(targetId);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sign All Pages (১ পৰা {pageCount} লৈকে সকলো পৃষ্ঠাত বহুৱাওক)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const targetId = activePlacementId || placements[0]?.id;
              if (targetId) onApplyToLastPage(targetId);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-blue-300 text-blue-900 font-medium rounded-lg shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign Last Page Only (কেৱল শেষৰ পৃষ্ঠাত {pageCount})</span>
          </button>
        </div>
      </div>

      {/* Placements Cards */}
      <div className="space-y-3">
        {placements.map((placement, index) => {
          const isActive = placement.id === activePlacementId;
          const { width: pageW, height: pageH } = getPageDimensions(placement.pageNumber);

          return (
            <div
              key={placement.id}
              onClick={() => onSelectPlacement(placement.id)}
              className={`p-3.5 rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Top row: Label, Page Selector, Delete */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Page {placement.pageNumber} Signature (পৃষ্ঠা {placement.pageNumber})
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-2 py-0.5 rounded">
                      Active (চিলেক্ট কৰা হৈছে)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePlacement(placement.id);
                    }}
                    title="Duplicate to another position"
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {placements.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlacement(placement.id);
                      }}
                      title="Remove signature from this page"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                {/* Page Number */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Select Page (পৃষ্ঠা)
                  </label>
                  <select
                    value={placement.pageNumber}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, { pageNumber: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Page {num} / {pageCount}
                      </option>
                    ))}
                  </select>
                </div>

                {/* X Coordinate */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    X Coordinate (pt)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={pageW}
                    step="5"
                    value={placement.x}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, {
                        x: Math.max(0, Math.min(pageW - 20, Number(e.target.value))),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Y Coordinate */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Y Coordinate (pt)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={pageH}
                    step="5"
                    value={placement.y}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, {
                        y: Math.max(0, Math.min(pageH - 20, Number(e.target.value))),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Width (pt) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Width (প্ৰস্থ)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max={pageW}
                    step="5"
                    value={placement.width}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, {
                        width: Math.max(30, Number(e.target.value)),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Height (pt) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Height (উচ্চতা)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max={pageH}
                    step="5"
                    value={placement.height}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, {
                        height: Math.max(15, Number(e.target.value)),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bottom Row: Coordinate Origin & Preset Alignments */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                {/* Origin Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Origin:</span>
                  <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => onUpdatePlacement(placement.id, { origin: 'bottom-left' })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        placement.origin === 'bottom-left'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                      <span>Bottom-Left (PDF Native)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePlacement(placement.id, { origin: 'top-left' })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        placement.origin === 'top-left'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowUpLeft className="w-3 h-3 text-emerald-600" />
                      <span>Top-Left (Screen)</span>
                    </button>
                  </div>
                </div>

                {/* Quick Align Presets */}
                <div className="flex items-center gap-1 text-slate-500">
                  <span>Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(placement.id, 'bottom-right')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-[10px] font-medium"
                  >
                    Bottom-Right (তলৰ সোঁফালে)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(placement.id, 'bottom-left')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-[10px] font-medium"
                  >
                    Bottom-Left (তলৰ বাওঁফালে)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(placement.id, 'bottom-center')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-[10px] font-medium"
                  >
                    Center (মাজত)
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
