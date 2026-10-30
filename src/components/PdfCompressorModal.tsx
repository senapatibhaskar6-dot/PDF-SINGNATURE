import React, { useState } from 'react';
import { PdfDocumentInfo, PdfCompressionOptions, CompressionResult, CompressionPreset } from '../types';
import {
  compressPdfDocument,
  formatBytes,
  calculateAdaptiveParams,
  CompressionProgressInfo,
} from '../utils/pdfCompressor';
import {
  FileText,
  Zap,
  Sparkles,
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Maximize2,
  FileDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PdfCompressorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfInfo: PdfDocumentInfo | null;
  onCompressedPdfReady?: (file: File) => void;
}

export const PdfCompressorModal: React.FC<PdfCompressorModalProps> = ({
  isOpen,
  onClose,
  pdfInfo,
  onCompressedPdfReady,
}) => {
  const [preset, setPreset] = useState<CompressionPreset>('extreme_800kb');
  const [targetSizeKb, setTargetSizeKb] = useState<number>(800);
  const [useGrayscale, setUseGrayscale] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<CompressionProgressInfo | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pdfInfo) return null;

  const handleStartCompression = async () => {
    setIsCompressing(true);
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const options: PdfCompressionOptions = {
        enabled: true,
        preset,
        targetSizeKb,
        quality: 0.72,
        maxDimension: 1400,
        useGrayscale,
        removeMetadata: true,
      };

      const res = await compressPdfDocument(
        pdfInfo.rawBytes,
        options,
        (prog) => setProgress(prog)
      );

      setResult(res);
    } catch (err: any) {
      console.error('Compression failed:', err);
      setError(err?.message || 'Compression failed. Please try a different preset.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const downloadName = pdfInfo.name.replace(/\.pdf$/i, '') + '_compressed_800kb.pdf';
    const link = document.createElement('a');
    link.href = result.url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInEditor = () => {
    if (!result || !onCompressedPdfReady) return;
    const downloadName = pdfInfo.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
    const file = new File([result.blob], downloadName, { type: 'application/pdf' });
    onCompressedPdfReady(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  High-Regulation PDF Compressor (উচ্চ মানৰ PDF সংকোচন)
                </h3>
                <span className="text-[11px] bg-emerald-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                  350 MB ➔ 800 KB
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                স্পষ্ট পাঠ্য আৰু ছীল অক্ষুণ্ণ ৰাখি ডাঙৰ PDF ফাইল ৮০০ KB লৈ কম্প্ৰেছ কৰক
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isCompressing}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800">
          {/* File Metrics Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                PDF
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 truncate max-w-[240px] sm:max-w-xs">
                  {pdfInfo.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {pdfInfo.pageCount} Pages (পৃষ্ঠা) · Current Size: {formatBytes(pdfInfo.size)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">লক্ষ্য আকাৰ (Target Goal):</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono">
                ~{targetSizeKb} KB ({preset === 'extreme_800kb' ? 'Ultra Compact' : 'Selected'})
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>সংকোচনৰ মান নিৰ্বাচন কৰক (Select Compression Goal)</span>
              <span className="text-emerald-700 text-xs font-medium">100% Client-Side Privacy</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Preset 1: 350 MB to 800 KB (User requested) */}
              <button
                type="button"
                onClick={() => {
                  setPreset('extreme_800kb');
                  setTargetSizeKb(800);
                }}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                  preset === 'extreme_800kb'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-800">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Extreme 800 KB</span>
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                    প্ৰস্তাবিত
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  350 MB ফাইল ৮০০ KB লৈ সংকোচন কৰক। চৰকাৰী পৰ্টেল আৰু চাকৰিৰ বাবে শ্ৰেষ্ঠ।
                </p>
                <span className="text-[10px] font-mono font-bold text-emerald-700 mt-2">
                  Target: ~800 KB
                </span>
              </button>

              {/* Preset 2: Balanced 1 MB */}
              <button
                type="button"
                onClick={() => {
                  setPreset('balanced_1mb');
                  setTargetSizeKb(1024);
                }}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  preset === 'balanced_1mb'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Balanced 1 MB</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  ১ মেগাবাইটৰ ভিতৰত উচ্চ মানৰ স্পষ্টতা সহ ডাউনলোড কৰক।
                </p>
                <span className="text-[10px] font-mono font-bold text-slate-700 mt-2">
                  Target: ~1,000 KB (1 MB)
                </span>
              </button>

              {/* Preset 3: Crisp HD */}
              <button
                type="button"
                onClick={() => {
                  setPreset('crisp_hd');
                  setTargetSizeKb(2048);
                }}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  preset === 'crisp_hd'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Crisp HD (2 MB)</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  প্ৰিণ্ট কৰিবলৈ উপযুক্ত ১৮০ DPI উচ্চ ৰিজলিউচন।
                </p>
                <span className="text-[10px] font-mono font-bold text-slate-700 mt-2">
                  Target: ~2,000 KB (2 MB)
                </span>
              </button>
            </div>
          </div>

          {/* Target Slider & Options */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>Custom Target Size (নিৰ্দিষ্ট আকাৰ নিৰ্ধাৰণ কৰক):</span>
              </span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                {targetSizeKb} KB ({formatBytes(targetSizeKb * 1024)})
              </span>
            </div>

            <input
              type="range"
              min={300}
              max={3000}
              step={50}
              value={targetSizeKb}
              onChange={(e) => {
                setTargetSizeKb(parseInt(e.target.value));
                setPreset('custom');
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>300 KB (Extreme)</span>
              <span className="text-emerald-700 font-bold">800 KB (প্ৰস্তাবিত)</span>
              <span>1500 KB</span>
              <span>3000 KB (High HD)</span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                <input
                  type="checkbox"
                  checked={useGrayscale}
                  onChange={(e) => setUseGrayscale(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Grayscale (বগা-কলা ডকুমেণ্টলৈ ৰূপান্তৰ কৰক, অধিক সৰু ফাইলৰ বাবে)</span>
              </label>
            </div>
          </div>

          {/* Progress Bar (Visible while compressing) */}
          {isCompressing && progress && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>{progress.statusText}</span>
                </span>
                <span className="font-mono text-emerald-700">{progress.percentage}%</span>
              </div>

              <div className="w-full h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Results Card */}
          {result && (
            <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>সংকোচন সফলভাৱে সম্পূৰ্ণ হ'ল! (Compression Successful)</span>
                </span>
                <span className="text-xs font-mono font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                  -{result.reductionPercentage}% Size Saved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Original Size (পুৰণি আকাৰ):</span>
                  <span className="text-base font-extrabold text-slate-800 font-mono line-through">
                    {formatBytes(result.originalBytes)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[11px] text-emerald-700 block font-semibold">
                    New Compressed Size (নতুন আকাৰ):
                  </span>
                  <span className="text-lg font-extrabold text-emerald-800 font-mono">
                    {formatBytes(result.compressedBytes)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Compressed PDF (ডাউনলোড কৰক)</span>
                </button>

                {onCompressedPdfReady && (
                  <button
                    type="button"
                    onClick={handleOpenInEditor}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors"
                  >
                    <span>Open in Editor & Sign (চহী কৰিবলৈ খোলক)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isCompressing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
          >
            বন্ধ কৰক (Close)
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handleStartCompression}
              disabled={isCompressing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compressing to ~{targetSizeKb} KB...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Compress PDF to ~{targetSizeKb} KB (সংকোচন আৰম্ভ কৰক)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download {formatBytes(result.compressedBytes)} PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
