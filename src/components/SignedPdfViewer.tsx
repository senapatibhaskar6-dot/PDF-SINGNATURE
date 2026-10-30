import React from 'react';
import { Download, ExternalLink, CheckCircle2, RotateCcw, FileText, Zap, Sparkles } from 'lucide-react';
import { formatBytes } from '../utils/pdfCompressor';

interface SignedPdfViewerProps {
  signedBlobUrl: string;
  originalFileName: string;
  placementsCount: number;
  originalSize?: number;
  finalSize?: number;
  reductionPercentage?: number;
  isCompressed?: boolean;
  onEditMore: () => void;
  onResetAll: () => void;
}

export const SignedPdfViewer: React.FC<SignedPdfViewerProps> = ({
  signedBlobUrl,
  originalFileName,
  placementsCount,
  originalSize,
  finalSize,
  reductionPercentage,
  isCompressed,
  onEditMore,
  onResetAll,
}) => {
  const downloadFileName = originalFileName.replace(/\.pdf$/i, '') + (isCompressed ? '_signed_800kb.pdf' : '_signed.pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = signedBlobUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewWindow = () => {
    window.open(signedBlobUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Success Notification Bar */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                PDF Signed Successfully! (চহীযুক্ত PDF প্ৰস্তুত)
              </h3>
              {isCompressed && finalSize && (
                <span className="text-[11px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Compressed to {formatBytes(finalSize)} (-{reductionPercentage}%)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Embedded {placementsCount} signature {placementsCount === 1 ? 'instance' : 'instances'} across pages without server transmission
              {originalSize && finalSize && (
                <span className="font-mono ml-1 font-semibold text-emerald-900">
                  · Size: {formatBytes(originalSize)} ➔ {formatBytes(finalSize)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Signed PDF</span>
          </button>

          <button
            onClick={onEditMore}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
          >
            Adjust Positions
          </button>
        </div>
      </div>

      {/* In-Browser PDF Preview Frame (Native browser PDF engine, no external workers or CORS errors) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800">{downloadFileName}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">Local Browser Render</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewWindow}
              className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>
        </div>

        <div className="w-full h-[620px] bg-slate-100 relative">
          <iframe
            src={signedBlobUrl}
            title="Signed PDF Preview"
            className="w-full h-full border-none"
          />
        </div>
      </div>

      {/* Footer secondary action */}
      <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
        <span>File generated and saved on device via pure WebAssembly / client-side pdf-lib.</span>
        <button
          onClick={onResetAll}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Start with New Document</span>
        </button>
      </div>
    </div>
  );
};
