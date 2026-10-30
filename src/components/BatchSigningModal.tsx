import React, { useState } from 'react';
import { PageInfo, SignaturePlacement, ProcessedSignature, BatchSigningConfig } from '../types';
import { batchApplySignaturesToDocument } from '../utils/pdfHelper';
import {
  Zap,
  CheckCircle2,
  X,
  Layers,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowUpRight,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

interface BatchSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageInfo[];
  signature: ProcessedSignature | null;
  currentPlacements: SignaturePlacement[];
  activePlacementId: string | null;
  onApplyBatchPlacements: (newPlacements: SignaturePlacement[]) => void;
}

export const BatchSigningModal: React.FC<BatchSigningModalProps> = ({
  isOpen,
  onClose,
  pages,
  signature,
  currentPlacements,
  activePlacementId,
  onApplyBatchPlacements,
}) => {
  const totalPages = pages.length;
  const [scope, setScope] = useState<'all' | 'range' | 'odd' | 'even' | 'last_only'>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(200, totalPages));
  const [positionPreset, setPositionPreset] = useState<
    'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'same_as_current'
  >('bottom-right');
  const [sizePreset, setSizePreset] = useState<'compact' | 'standard' | 'large'>('standard');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

  if (!isOpen) return null;

  // Calculate target page count
  let targetPagesCount = 0;
  if (scope === 'all') {
    targetPagesCount = totalPages;
  } else if (scope === 'range') {
    const s = Math.max(1, rangeStart);
    const e = Math.min(totalPages, Math.max(s, rangeEnd));
    targetPagesCount = Math.max(1, e - s + 1);
  } else if (scope === 'odd') {
    targetPagesCount = Math.ceil(totalPages / 2);
  } else if (scope === 'even') {
    targetPagesCount = Math.floor(totalPages / 2);
  } else if (scope === 'last_only') {
    targetPagesCount = 1;
  }

  // Get current active placement
  const activePlacement = currentPlacements.find((p) => p.id === activePlacementId) || currentPlacements[0];

  const handleApply = () => {
    let width = 160;
    let height = signature ? Math.round(width / signature.aspectRatio) : 55;

    if (sizePreset === 'compact') {
      width = 110;
      height = signature ? Math.round(width / signature.aspectRatio) : 38;
    } else if (sizePreset === 'large') {
      width = 200;
      height = signature ? Math.round(width / signature.aspectRatio) : 70;
    }

    const config: BatchSigningConfig = {
      scope,
      rangeStart,
      rangeEnd,
      positionPreset,
      width,
      height,
    };

    const newBatch = batchApplySignaturesToDocument(
      pages,
      config,
      signature?.aspectRatio || 2.8,
      activePlacement
    );

    if (mode === 'replace') {
      onApplyBatchPlacements(newBatch);
    } else {
      // Append without duplicate on same page
      const existingOtherPages = currentPlacements.filter(
        (cp) => !newBatch.some((nb) => nb.pageNumber === cp.pageNumber)
      );
      onApplyBatchPlacements([...existingOtherPages, ...newBatch]);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Batch Sign 200+ Pages</span>
                <span className="text-[11px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                  একেলগে ২০০খন পৃষ্ঠাত চহী
                </span>
              </h3>
              <p className="text-xs text-blue-100">
                নিমিষতে সকলো পৃষ্ঠা বা ২০০খন পৃষ্ঠাত একে স্থানত চহী বহুৱাওক
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800">
          {/* Target Page Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>১. চহী বহিবলগীয়া পৃষ্ঠাসমূহ বাছক (Select Target Pages)</span>
              <span className="text-blue-600 font-mono text-xs">
                Total: {totalPages} Pages
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${scope === 'all' ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <span>All {totalPages} Pages</span>
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  সকলো পৃষ্ঠাত (১ৰ পৰা {totalPages})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('range')}
                className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                  scope === 'range'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Sliders
                    className={`w-3.5 h-3.5 ${scope === 'range' ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <span>Page Range</span>
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  পৰিসৰ (e.g. ১ৰ পৰা ২০০)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('odd')}
                className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                  scope === 'odd'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Odd Pages</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  অযুগ্ম পৃষ্ঠা (১, ৩, ৫...)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('even')}
                className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                  scope === 'even'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Even Pages</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  যুগ্ম পৃষ্ঠা (২, ৪, ৬...)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('last_only')}
                className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                  scope === 'last_only'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Last Page Only</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  কেৱল শেষৰ পৃষ্ঠাত
                </span>
              </button>
            </div>

            {/* Range Inputs */}
            {scope === 'range' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3 text-xs">
                <span className="font-medium text-blue-950">পৃষ্ঠাৰ পৰিসৰ নিৰ্ধাৰণ কৰক:</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-900"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(Math.min(totalPages, parseInt(e.target.value) || totalPages))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Position Presets */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ২. পৃষ্ঠাৰ কোন স্থানত চহী বহুৱাব (Position on Every Page)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPositionPreset('bottom-right')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  positionPreset === 'bottom-right'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <ArrowDownRight className="w-5 h-5 text-blue-600" />
                <span>Bottom Right</span>
                <span className="text-[10px] text-slate-500">তলত সোঁফালে (সচৰাচৰ)</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionPreset('bottom-left')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  positionPreset === 'bottom-left'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                <span>Bottom Left</span>
                <span className="text-[10px] text-slate-500">তলত বাওঁফালে</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionPreset('bottom-center')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  positionPreset === 'bottom-center'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <ArrowDown className="w-5 h-5 text-blue-600" />
                <span>Bottom Center</span>
                <span className="text-[10px] text-slate-500">তলৰ মাজত</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionPreset('top-right')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  positionPreset === 'top-right'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                <span>Top Right</span>
                <span className="text-[10px] text-slate-500">ওপৰত সোঁফালে</span>
              </button>
            </div>
          </div>

          {/* Size Preset */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ৩. চহীৰ আকাৰ (Signature Size)
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSizePreset('compact')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                  sizePreset === 'compact'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Compact (110pt) · ইনিচিয়েল
              </button>
              <button
                type="button"
                onClick={() => setSizePreset('standard')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                  sizePreset === 'standard'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Standard (160pt) · প্ৰামাণিক
              </button>
              <button
                type="button"
                onClick={() => setSizePreset('large')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                  sizePreset === 'large'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Large (200pt) · ডাঙৰ
              </button>
            </div>
          </div>

          {/* Summary Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-950">
                  মুঠ {targetPagesCount} খন পৃষ্ঠাত একেলগে চহী বহিব
                </p>
                <p className="text-emerald-800 text-[11px]">
                  Position: {positionPreset.replace('-', ' ').toUpperCase()} · One-Click Instant Layout
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <label className="text-[11px] text-slate-600 cursor-pointer flex items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={mode === 'replace'}
                  onChange={(e) => setMode(e.target.checked ? 'replace' : 'append')}
                  className="rounded text-blue-600"
                />
                <span>পুৰণি স্থানসমূহ সলনি কৰক</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            বাতিল কৰক (Cancel)
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>একেলগে {targetPagesCount} খন পৃষ্ঠাত চহী বহুৱাওক (Apply to {targetPagesCount} Pages)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
