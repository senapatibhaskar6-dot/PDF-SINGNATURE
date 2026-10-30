import React, { useState, useEffect } from 'react';
import { PageNumberingOptions, PageNumberTargetScope } from '../types';
import {
  formatPageNumberText,
  parsePageRangeString,
  isPageTargeted,
} from '../utils/pageNumberHelper';
import {
  Hash,
  X,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  CheckCircle2,
  Move,
  ListFilter,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';

interface PageNumberingModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: PageNumberingOptions;
  onChangeOptions: (opts: PageNumberingOptions) => void;
  totalPages: number;
}

export const PageNumberingModal: React.FC<PageNumberingModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
  totalPages,
}) => {
  const [localOptions, setLocalOptions] = useState<PageNumberingOptions>(options);
  const [activeTab, setActiveTab] = useState<'pages' | 'position' | 'style'>('pages');

  // Sync when props open
  useEffect(() => {
    if (isOpen) {
      setLocalOptions(options);
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const handleToggleEnabled = (enabled: boolean) => {
    setLocalOptions((prev) => ({ ...prev, enabled }));
  };

  const handleSave = () => {
    onChangeOptions(localOptions);
    onClose();
  };

  // Helper for toggling individual page selection
  const handleTogglePage = (pageNum: number) => {
    const currentList = localOptions.selectedPages || [];
    let updated: number[];
    if (currentList.includes(pageNum)) {
      updated = currentList.filter((p) => p !== pageNum);
    } else {
      updated = [...currentList, pageNum].sort((a, b) => a - b);
    }
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: updated,
      pageRangeText: updated.join(', '),
    }));
  };

  // Preset page selections
  const handleSelectAllPages = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: all,
      pageRangeText: `1-${totalPages}`,
    }));
  };

  const handleDeselectAllPages = () => {
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: [],
      pageRangeText: '',
    }));
  };

  const handleSelectOddPages = () => {
    const odds = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: odds,
      pageRangeText: odds.join(', '),
    }));
  };

  const handleSelectEvenPages = () => {
    const evens = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: evens,
      pageRangeText: evens.join(', '),
    }));
  };

  const handleSelectFirstNPages = (n: number) => {
    const limit = Math.min(totalPages, n);
    const list = Array.from({ length: limit }, (_, i) => i + 1);
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      selectedPages: list,
      pageRangeText: `1-${limit}`,
    }));
  };

  const handlePageRangeTextChange = (text: string) => {
    const parsed = parsePageRangeString(text, totalPages);
    setLocalOptions((prev) => ({
      ...prev,
      targetScope: 'custom_selection',
      pageRangeText: text,
      selectedPages: parsed,
    }));
  };

  // Count how many pages are currently targeted
  const targetedCount = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) =>
    isPageTargeted(p, totalPages, localOptions)
  ).length;

  const samplePreview1 =
    formatPageNumberText(0, totalPages || 200, localOptions) ||
    formatPageNumberText(0, totalPages || 200, { ...localOptions, targetScope: 'all', startPage: 1 }) ||
    '1 / 200';

  const samplePreview2 =
    formatPageNumberText(1, totalPages || 200, localOptions) || '2 / 200';

  const formatOptions: Array<{
    id: PageNumberingOptions['format'];
    title: string;
    assameseTitle: string;
  }> = [
    { id: 'page_n_of_total', title: 'Page 1 of 200', assameseTitle: 'মানক ইংৰাজী' },
    { id: 'n_slash_total', title: '1 / 200', assameseTitle: 'মিনিমাল শ্লেশ্ব' },
    { id: 'dash_n_dash', title: '- 1 -', assameseTitle: 'অফিচিয়েল ডেশ্ব' },
    { id: 'page_n', title: 'Page 1', assameseTitle: 'সৰল পৃষ্ঠা' },
    { id: 'just_n', title: '1', assameseTitle: 'কেৱল সংখ্যা' },
    { id: 'assamese_page_n_of_total', title: 'পৃষ্ঠা ১ / ২০০', assameseTitle: 'অসমীয়া পৃষ্ঠা ফৰ্মেট' },
    { id: 'assamese_just_n', title: '১, ২, ৩...', assameseTitle: 'কেৱল অসমীয়া সংখ্যা' },
    { id: 'custom', title: 'Custom Template', assameseTitle: 'কাষ্টম আৰ্হি' },
  ];

  const positions: Array<{
    id: PageNumberingOptions['position'];
    label: string;
    assamese: string;
  }> = [
    { id: 'top-left', label: 'Top-Left', assamese: 'ওপৰত বাঁওফালে' },
    { id: 'top-center', label: 'Top-Center', assamese: 'ওপৰত সোঁমাজত' },
    { id: 'top-right', label: 'Top-Right', assamese: 'ওপৰত সোঁফালে' },
    { id: 'bottom-left', label: 'Bottom-Left', assamese: 'তলত বাঁওফালে' },
    { id: 'bottom-center', label: 'Bottom-Center', assamese: 'তলত সোঁমাজত (প্ৰস্তাবিত)' },
    { id: 'bottom-right', label: 'Bottom-Right', assamese: 'তলত সোঁফালে' },
  ];

  const colors = [
    { label: 'Slate Dark', hex: '#334155', bgClass: 'bg-slate-700' },
    { label: 'Deep Charcoal', hex: '#111827', bgClass: 'bg-slate-900' },
    { label: 'Navy Blue', hex: '#1e3a8a', bgClass: 'bg-blue-900' },
    { label: 'Crimson', hex: '#991b1b', bgClass: 'bg-red-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight">
                PDF Page Numbering (পেজ নম্বৰ ব্যৱস্থা)
              </h2>
              <p className="text-xs text-blue-100">
                ম্যানুৱেলী যিকোনো স্থানত ড্ৰেগ কৰক আৰু যিমান ইচ্ছা সিমান পৃষ্ঠাত নম্বৰ বহুৱাওক
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Enable/Disable Bar */}
        <div className="px-5 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div
            onClick={() => handleToggleEnabled(!localOptions.enabled)}
            className="cursor-pointer flex items-center gap-2.5 select-none"
          >
            <div
              className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                localOptions.enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              {localOptions.enabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">
                পেজ নম্বৰ সক্ৰিয় কৰক (Enable Page Numbers)
              </span>
              <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {targetedCount} of {totalPages} pages selected
              </span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'pages'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 পৃষ্ঠা বাছনি ({targetedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('position')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'position'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📍 স্থান (Position & Drag)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('style')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'style'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎨 ফৰ্মেট আৰু ৰং
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: TARGET PAGES SELECTION (যিমান ইচ্ছা সিমান পৃষ্ঠা বাছক) */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <ListFilter className="w-4 h-4 text-blue-600" />
                    <span>কোন কোন পৃষ্ঠাত নম্বৰ বহুৱাব বিচাৰে (Target Pages):</span>
                  </span>
                  <span className="text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono">
                    মুঠ {targetedCount} খন পৃষ্ঠা
                  </span>
                </div>
                <p className="text-[11px] text-blue-800">
                  আপুনি সকলো পৃষ্ঠা, নিৰ্দিষ্ট পৃষ্ঠা (যেনে ১-১০, ১৫), বা তলৰ তালিকাত টিক মাৰ্ক কৰি যিমান ইচ্ছা সিমান পৃষ্ঠা বাছি ল'ব পাৰিব।
                </p>
              </div>

              {/* Target Scope Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalOptions((prev) => ({ ...prev, targetScope: 'all', startPage: 1 }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localOptions.targetScope === 'all' && localOptions.startPage === 1
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">সকলো পৃষ্ঠা (All)</div>
                  <div className={`text-[10px] ${localOptions.targetScope === 'all' && localOptions.startPage === 1 ? 'text-blue-100' : 'text-slate-500'}`}>
                    ১ ৰ পৰা {totalPages} লৈকে
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLocalOptions((prev) => ({ ...prev, targetScope: 'all', startPage: 2 }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localOptions.targetScope === 'all' && localOptions.startPage === 2
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">কাভাৰ বাদ (Skip Cover)</div>
                  <div className={`text-[10px] ${localOptions.targetScope === 'all' && localOptions.startPage === 2 ? 'text-blue-100' : 'text-slate-500'}`}>
                    ২ ৰ পৰা {totalPages} লৈকে
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectOddPages();
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localOptions.targetScope === 'odd'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">অযুগ্ম পৃষ্ঠা (Odd)</div>
                  <div className={`text-[10px] ${localOptions.targetScope === 'odd' ? 'text-blue-100' : 'text-slate-500'}`}>
                    ১, ৩, ৫, ৭...
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectEvenPages();
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localOptions.targetScope === 'even'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">যুগ্ম পৃষ্ঠা (Even)</div>
                  <div className={`text-[10px] ${localOptions.targetScope === 'even' ? 'text-blue-100' : 'text-slate-500'}`}>
                    ২, ৪, ৬, ৮...
                  </div>
                </button>
              </div>

              {/* Custom Page Selection Input */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    নিৰ্দিষ্ট পৃষ্ঠা টাইপ কৰক (Enter Page Range):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    উদাহৰণ: 1-10, 15, 20-50
                  </span>
                </div>

                <input
                  type="text"
                  value={localOptions.pageRangeText || ''}
                  onChange={(e) => handlePageRangeTextChange(e.target.value)}
                  placeholder="যেনে: 1-5, 8, 12, 14-25"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />

                {/* Quick Selection Helper Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllPages}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold"
                  >
                    সকলো বাছক (All)
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllPages}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold"
                  >
                    খালি কৰক (Clear)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFirstNPages(10)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold"
                  >
                    প্ৰথম ১০ খন (First 10)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFirstNPages(50)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold"
                  >
                    প্ৰথম ৫০ খন
                  </button>
                </div>
              </div>

              {/* Interactive Page Pills Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    প্ৰতিটো পৃষ্ঠাত ক্লিক কৰি অন/অফ কৰক (Click to toggle any page):
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {targetedCount} Selected
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-6 sm:grid-cols-10 gap-1.5 text-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isSelected = isPageTargeted(p, totalPages, localOptions);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleTogglePage(p)}
                        className={`py-1 px-1 rounded-md text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                        }`}
                        title={`Page ${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POSITION & MANUAL DRAG (স্থান নিৰ্ধাৰণ আৰু ড্ৰেগ) */}
          {activeTab === 'position' && (
            <div className="space-y-4">
              {/* Position Mode Selector: Preset vs Manual Drag */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalOptions((prev) => ({ ...prev, positionMode: 'preset' }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    localOptions.positionMode === 'preset'
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>১. ষ্টেণ্ডাৰ্ড স্থানসমূহ (Presets)</span>
                    {localOptions.positionMode === 'preset' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    তলত সোঁমাজত, সোঁফালে, বা ওপৰত নিখুঁত এলাইনমেন্ট।
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLocalOptions((prev) => ({
                      ...prev,
                      positionMode: 'manual_drag',
                      manualXPercent: prev.manualXPercent ?? 50,
                      manualYPercent: prev.manualYPercent ?? 94,
                    }))
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    localOptions.positionMode === 'manual_drag'
                      ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20 text-purple-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-purple-600" />
                      <span>২. কেনভাচত ড্ৰেগ কৰক (Free Drag)</span>
                    </span>
                    {localOptions.positionMode === 'manual_drag' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    কেনভাচত নিজৰ হাতেৰে পেজ নম্বৰটো টানি যিকোনো ঠাইত বহুৱাওক।
                  </p>
                </button>
              </div>

              {localOptions.positionMode === 'preset' ? (
                /* Preset Grid */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    পৃষ্ঠাৰ স্থান বাছক (Position on Page):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {positions.map((pos) => {
                      const isSelected = localOptions.position === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setLocalOptions((prev) => ({ ...prev, position: pos.id }))}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{pos.label}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {pos.assamese}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Manual Drag Mode Controls */
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                    <Move className="w-4 h-4 text-purple-700" />
                    <span>ম্যানুৱেল স্থান নিয়ন্ত্ৰণ (Manual Position Sliders):</span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    আপুনি এই স্লাইডাৰ ব্যৱহাৰ কৰিব পাৰে নাইবা প্ৰধান কেনভাচ স্ক্ৰীনত পেজ নম্বৰটো পোনে পোনে হাত বা মাউচেৰে টানি যিকোনো স্থানত বহুৱাব পাৰিব।
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">পথালি স্থান (Horizontal X):</span>
                      <span className="font-mono text-purple-900 font-bold">
                        {Math.round(localOptions.manualXPercent ?? 50)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      value={localOptions.manualXPercent ?? 50}
                      onChange={(e) =>
                        setLocalOptions((prev) => ({
                          ...prev,
                          manualXPercent: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-purple-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">থিয় স্থান (Vertical Y):</span>
                      <span className="font-mono text-purple-900 font-bold">
                        {Math.round(localOptions.manualYPercent ?? 94)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="96"
                      value={localOptions.manualYPercent ?? 94}
                      onChange={(e) =>
                        setLocalOptions((prev) => ({
                          ...prev,
                          manualYPercent: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-purple-600"
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalOptions((prev) => ({
                          ...prev,
                          manualXPercent: 50,
                          manualYPercent: 94,
                        }))
                      }
                      className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>তলৰ সোঁমাজলৈ ঘূৰাই আনক (Reset to bottom center)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Margins */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    কাষৰ মাৰ্জিন (Side Margin):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={localOptions.sideMargin}
                    onChange={(e) =>
                      setLocalOptions((prev) => ({
                        ...prev,
                        sideMargin: Math.max(10, Number(e.target.value)),
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    তলৰ মাৰ্জিন (Bottom Margin):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={localOptions.bottomMargin}
                    onChange={(e) =>
                      setLocalOptions((prev) => ({
                        ...prev,
                        bottomMargin: Math.max(10, Number(e.target.value)),
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STYLE & FORMAT (ফৰ্মেট আৰু শৈলী) */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Formats Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ফৰ্মেট বাছক (Choose Number Format):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {formatOptions.map((fmt) => {
                    const isSelected = localOptions.format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setLocalOptions((prev) => ({ ...prev, format: fmt.id }))}
                        className={`p-2.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold font-mono">{fmt.title}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">{fmt.assameseTitle}</span>
                      </button>
                    );
                  })}
                </div>

                {localOptions.format === 'custom' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                    <div className="text-xs font-semibold text-slate-800">
                      কাষ্টম আৰ্হি লিখক (Tags: {'{n}'}, {'{total}'}, {'{assamese_n}'}, {'{assamese_total}'}):
                    </div>
                    <input
                      type="text"
                      value={localOptions.customTemplate || 'Page {n} of {total}'}
                      onChange={(e) =>
                        setLocalOptions((prev) => ({ ...prev, customTemplate: e.target.value }))
                      }
                      placeholder="e.g. Doc Page {n} of {total}"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Start Number and Background Pill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    গণনা আৰম্ভ কৰক (Starting Number):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localOptions.startNumber}
                    onChange={(e) =>
                      setLocalOptions((prev) => ({
                        ...prev,
                        startNumber: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    ডিফল্ট ১। যিকোনো সংখ্যাৰ পৰা আৰম্ভ কৰিব পাৰিব।
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>বগা বেজ (White Pill Badge)</span>
                    <input
                      type="checkbox"
                      checked={localOptions.includeBackgroundPill}
                      onChange={(e) =>
                        setLocalOptions((prev) => ({
                          ...prev,
                          includeBackgroundPill: e.target.checked,
                        }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500">
                    লিখাৰ ওপৰত নম্বৰটো স্পষ্টকৈ দেখা পাবলৈ পাতল বগা বেকগ্ৰাউণ্ড।
                  </p>
                </div>
              </div>

              {/* Font Size & Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    আখৰৰ আকাৰ (Font Size):
                  </label>
                  <div className="flex gap-1.5">
                    {[8, 9, 10, 11, 12, 14].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setLocalOptions((prev) => ({ ...prev, fontSize: size }))}
                        className={`flex-1 py-1 text-xs rounded-lg border font-semibold ${
                          localOptions.fontSize === size
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {size}pt
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    ৰং (Color):
                  </label>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setLocalOptions((prev) => ({ ...prev, fontColor: c.hex }))}
                        className={`flex-1 py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                          localOptions.fontColor === c.hex
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${c.bgClass}`} />
                        <span className="text-[10px] text-slate-700 hidden sm:inline">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini Live Preview Banner */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>নম্বৰ কেনেকৈ প্ৰিন্ট হ'ব:</span>
            </span>
            <span
              style={{ color: localOptions.fontColor }}
              className="bg-white/95 px-3 py-1 rounded-full font-mono text-xs font-bold text-slate-900 shadow-sm"
            >
              {samplePreview1}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setLocalOptions((prev) => ({ ...prev, enabled: false }));
              onChangeOptions({ ...localOptions, enabled: false });
              onClose();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            বন্ধ কৰক (Turn Off)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>প্ৰয়োগ কৰক ({targetedCount} খন পৃষ্ঠাত)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
