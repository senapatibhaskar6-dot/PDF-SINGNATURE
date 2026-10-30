import React, { useState } from 'react';
import { SignaturePlacement, PageInfo, PageNumberingOptions } from '../types';
import {
  Copy,
  Trash2,
  Sparkles,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Sliders,
  ArrowDownLeft,
  ArrowUpLeft,
  ClipboardPaste,
  Layers,
  Zap,
  Hash,
} from 'lucide-react';

interface PlacementListProps {
  placements: SignaturePlacement[];
  pages: PageInfo[];
  activePlacementId: string | null;
  pageNumbering?: PageNumberingOptions;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (id: string, updates: Partial<SignaturePlacement>) => void;
  onAddPlacement: (pageNumber?: number) => void;
  onRemovePlacement: (id: string) => void;
  onDuplicatePlacement: (id: string) => void;
  onApplyToAllPages: (basePlacementId: string) => void;
  onApplyToLastPage: (basePlacementId: string) => void;
  onOpenBatchModal?: () => void;
  onOpenPageNumberModal?: () => void;
}

export const PlacementList: React.FC<PlacementListProps> = ({
  placements,
  pages,
  activePlacementId,
  pageNumbering,
  onSelectPlacement,
  onUpdatePlacement,
  onAddPlacement,
  onRemovePlacement,
  onDuplicatePlacement,
  onApplyToAllPages,
  onApplyToLastPage,
  onOpenBatchModal,
  onOpenPageNumberModal,
}) => {
  const pageCount = pages.length;
  const [showAdvancedCoords, setShowAdvancedCoords] = useState<boolean>(false);

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
    const margin = 54;

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
            <span>Copy & Paste Signatures on Pages</span>
            <span className="text-[11px] text-blue-700 font-normal bg-blue-50 px-2 py-0.5 rounded">
              চহী কপি-পেষ্ট
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            PDF খনত পোনপটীয়াকৈ চহী কপি আৰু পেষ্ট কৰক (যিকোনো পৃষ্ঠাত বহুৱাওক)
          </p>
        </div>

        <button
          onClick={() => onAddPlacement()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>+ Paste New Signature (+ চহী পেষ্ট কৰক)</span>
        </button>
      </div>

      {/* Main Copy-Paste Bar */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>১-ক্লিকত চহী সকলো পৃষ্ঠাত কপি-পেষ্ট কৰক:</span>
          </div>

          <span className="text-[11px] text-blue-700 font-mono font-medium">
            {placements.length} of {pageCount} pages signed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              const targetId = activePlacementId || placements[0]?.id;
              if (targetId) onApplyToAllPages(targetId);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy & Paste to All Pages (সকলো পৃষ্ঠাত পেষ্ট)</span>
          </button>

          {onOpenBatchModal && (
            <button
              type="button"
              onClick={onOpenBatchModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-xs transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Batch Sign 200 Pages (২০০ পৃষ্ঠাত চহী)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const targetId = activePlacementId || placements[0]?.id;
              if (targetId) onApplyToLastPage(targetId);
            }}
            className="w-full sm:col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-blue-300 text-blue-900 font-medium rounded-lg shadow-2xs transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Paste on Last Page (কেৱল শেষৰ পৃষ্ঠাত পেষ্ট কৰক)</span>
          </button>
        </div>
      </div>

      {/* PDF Page Numbering Quick Bar */}
      {onOpenPageNumberModal && (
        <div
          onClick={onOpenPageNumberModal}
          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs ${
            pageNumbering?.enabled
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                pageNumbering?.enabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>PDF পেজ নম্বৰিং (Page Numbers)</span>
                {pageNumbering?.enabled ? (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                    সক্ৰিয় (Active)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    বন্ধ (Off)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {pageNumbering?.enabled
                  ? `ফৰ্মেট: ${pageNumbering.format} • স্থান: ${
                      pageNumbering.positionMode === 'manual_drag'
                        ? 'কেনভাচত ড্ৰেগ (Manual Drag)'
                        : pageNumbering.position
                    }`
                  : 'প্ৰতিটো পৃষ্ঠাত ১, ২, ৩ বা Page 1 of 200 বহুৱাবলৈ ক্লিক কৰক'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            {pageNumbering?.enabled ? 'ছেটিংছ ⚙️' : '+ নম্বৰ যোগ কৰক'}
          </button>
        </div>
      )}

      {/* Placements Cards */}
      <div className="space-y-2.5">
        {placements.map((placement, index) => {
          const isActive = placement.id === activePlacementId;
          const { width: pageW, height: pageH } = getPageDimensions(placement.pageNumber);

          return (
            <div
              key={placement.id}
              onClick={() => onSelectPlacement(placement.id)}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Header: Page selection and Quick Copy-Paste actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Page {placement.pageNumber} Signature
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      (পৃষ্ঠা {placement.pageNumber} ৰ চহী)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePlacement(placement.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    title="Copy and paste a duplicate"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy (কপি কৰক)</span>
                  </button>

                  {placements.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlacement(placement.id);
                      }}
                      title="Delete this signature"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Placement Presets (Click and it automatically positions) */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Page (পৃষ্ঠা সলাওক):</span>
                  <select
                    value={placement.pageNumber}
                    onChange={(e) =>
                      onUpdatePlacement(placement.id, { pageNumber: Number(e.target.value) })
                    }
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Page {num} / {pageCount}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(placement.id, 'bottom-right')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                  >
                    Bottom-Right (তলৰ সোঁফালে)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(placement.id, 'bottom-left')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                  >
                    Bottom-Left (তলৰ বাওঁফালে)
                  </button>
                </div>
              </div>

              {/* Optional Collapsible Advanced Coordinates */}
              {showAdvancedCoords && (
                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-500 block mb-0.5">X (pt):</label>
                    <input
                      type="number"
                      value={placement.x}
                      onChange={(e) =>
                        onUpdatePlacement(placement.id, {
                          x: Math.max(0, Math.min(pageW - 20, Number(e.target.value))),
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Y (pt):</label>
                    <input
                      type="number"
                      value={placement.y}
                      onChange={(e) =>
                        onUpdatePlacement(placement.id, {
                          y: Math.max(0, Math.min(pageH - 20, Number(e.target.value))),
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Width (pt):</label>
                    <input
                      type="number"
                      value={placement.width}
                      onChange={(e) =>
                        onUpdatePlacement(placement.id, {
                          width: Math.max(30, Number(e.target.value)),
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Height (pt):</label>
                    <input
                      type="number"
                      value={placement.height}
                      onChange={(e) =>
                        onUpdatePlacement(placement.id, {
                          height: Math.max(15, Number(e.target.value)),
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Toggle Advanced Coordinates Accordion */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          {showAdvancedCoords ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span>Advanced Numeric Coordinates (প্ৰয়োজন অনুসৰি স্থানাংক নম্বৰ চাওক)</span>
        </button>
      </div>
    </div>
  );
};
