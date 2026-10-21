import React, { useRef } from 'react';
import { PdfDocumentInfo } from '../types';
import { FileText, Sparkles, CheckCircle2, RefreshCw, RotateCw, RotateCcw } from 'lucide-react';

interface PdfUploaderProps {
  pdfInfo: PdfDocumentInfo | null;
  isLoading: boolean;
  onPdfSelected: (file: File) => void;
  onLoadSample: () => void;
  onResetPdf: () => void;
  onRotatePdf?: (targetPage: number | 'all', angleDelta: number) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  pdfInfo,
  isLoading,
  onPdfSelected,
  onLoadSample,
  onResetPdf,
  onRotatePdf,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onPdfSelected(file);
      } else {
        alert('Please drop a valid PDF file.');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">PDF Document</h3>
          <p className="text-xs text-slate-500">
            Upload any PDF and rotate pages as needed
          </p>
        </div>

        {pdfInfo && (
          <button
            onClick={onResetPdf}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Change File</span>
          </button>
        )}
      </div>

      {!pdfInfo ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onPdfSelected(e.target.files[0]);
              }
            }}
          />

          <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2.5 transition-colors">
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>

          <p className="text-xs font-semibold text-slate-800 mb-1">
            Click to upload PDF or drag and drop
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            Pure client-side processing — your files never leave your device
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLoadSample();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200 shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Sample 3-Page Agreement</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-slate-900 truncate">
                  {pdfInfo.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>{pdfInfo.pageCount} {pdfInfo.pageCount === 1 ? 'Page' : 'Pages'}</span>
                  <span>·</span>
                  <span>{formatFileSize(pdfInfo.size)}</span>
                  <span>·</span>
                  <span>
                    {pdfInfo.pages[0]?.width} × {pdfInfo.pages[0]?.height} pt
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shrink-0 shadow-2xs font-medium"
            >
              Replace
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onPdfSelected(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Quick PDF Rotation Toolbar */}
          {onRotatePdf && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>PDF ওলোটা (Upside down) হৈছে নেকি? চিধা কৰক:</span>
                </span>
                <span className="text-[11px] text-amber-700 font-medium">১-ক্লিকতে চিধা হব</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <button
                  type="button"
                  onClick={() => onRotatePdf('all', 180)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all text-xs shadow-xs hover:shadow"
                  title="Flip upside-down PDF 180° right-side up"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>🔄 Flip 180° (ওলোটা চিধা কৰক)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRotatePdf('all', 90)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-300 rounded-lg font-semibold transition-colors text-xs shadow-2xs"
                  title="Rotate all pages 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>৯০° সোঁফালে (90° ⟳)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRotatePdf('all', -90)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold transition-colors text-xs shadow-2xs"
                  title="Rotate all pages 90° Counter-Clockwise"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>৯০° বাওঁফালে (⟲)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
