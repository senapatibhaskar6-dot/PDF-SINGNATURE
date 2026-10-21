import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RotateCw,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  FileSignature,
  Wand2,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  HelpCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  DocumentFilterType,
  ScannedPageItem,
  processScannedImage,
  createPdfFromScannedPages,
  playShutterSound,
} from '../utils/documentScannerHelper';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndOpenInEditor: (file: File) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveAndOpenInEditor,
}) => {
  // Video and stream states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

  // Scanned pages state
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);

  // Export settings
  const [documentTitle, setDocumentTitle] = useState<string>('Scanned_Document');
  const [pageSizeFormat, setPageSizeFormat] = useState<'A4' | 'fit'>('A4');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Start camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support direct camera capture. Please use file upload below.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access failed:', err);
      setCameraActive(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setCameraError('কেমেৰা ব্যৱহাৰৰ অনুমতি দিয়া নাই (Camera permission not granted). অনুগ্ৰহ কৰি অনুমতি দিয়ক বা তলৰ ফাইল আপলোড ব্যৱহাৰ কৰক।');
      } else {
        setCameraError('কেমেৰা সংযুক্ত কৰিব পৰা নগʼল (Unable to access camera). আপুনি তলৰ "ফটো বাছক" বুটাম ব্যৱহাৰ কৰি স্কেন কৰিব পাৰিব।');
      }
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Init or stop camera on modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  // Handle switching front/rear camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Add new captured page helper
  const addCapturedPage = async (dataUrl: string) => {
    try {
      const pageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      // Process with default 'magic' clean filter
      const processed = await processScannedImage(dataUrl, 0, 'magic');
      const newPage: ScannedPageItem = {
        id: pageId,
        originalDataUrl: dataUrl,
        processedDataUrl: processed.processedDataUrl,
        width: processed.width,
        height: processed.height,
        rotation: 0,
        filter: 'magic',
      };

      setPages((prev) => {
        const next = [...prev, newPage];
        setSelectedPageIndex(next.length - 1);
        return next;
      });
    } catch (e) {
      console.error('Failed to process captured page:', e);
    }
  };

  // Capture frame from live video feed
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !cameraActive) return;

    playShutterSound();
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    await addCapturedPage(dataUrl);
  };

  // Handle file picker upload / camera capture fallback
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);

    for (const file of fileList) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        await addCapturedPage(dataUrl);
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update selected page rotation
  const handleRotateCurrentPage = async (deltaDegrees: number) => {
    const page = pages[selectedPageIndex];
    if (!page) return;

    setIsProcessingFilter(true);
    try {
      const nextRot = ((page.rotation + deltaDegrees) % 360 + 360) % 360;
      const updated = await processScannedImage(page.originalDataUrl, nextRot, page.filter);

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === selectedPageIndex
            ? {
                ...p,
                rotation: nextRot,
                processedDataUrl: updated.processedDataUrl,
                width: updated.width,
                height: updated.height,
              }
            : p
        )
      );
    } catch (e) {
      console.error('Failed to rotate scanned page:', e);
    } finally {
      setIsProcessingFilter(false);
    }
  };

  // Update selected page filter
  const handleChangeCurrentPageFilter = async (filter: DocumentFilterType) => {
    const page = pages[selectedPageIndex];
    if (!page) return;

    setIsProcessingFilter(true);
    try {
      const updated = await processScannedImage(page.originalDataUrl, page.rotation, filter);

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === selectedPageIndex
            ? {
                ...p,
                filter,
                processedDataUrl: updated.processedDataUrl,
                width: updated.width,
                height: updated.height,
              }
            : p
        )
      );
    } catch (e) {
      console.error('Failed to apply filter:', e);
    } finally {
      setIsProcessingFilter(false);
    }
  };

  // Reorder or delete pages
  const handleDeletePage = (indexToDelete: number) => {
    setPages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToDelete);
      if (selectedPageIndex >= filtered.length) {
        setSelectedPageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    setPages((prev) => {
      const newPages = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPages.length) return prev;
      const temp = newPages[index];
      newPages[index] = newPages[targetIndex];
      newPages[targetIndex] = temp;
      setSelectedPageIndex(targetIndex);
      return newPages;
    });
  };

  // Export / Save PDF and Download to Device
  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;
    setIsExportingPdf(true);
    setExportSuccessMessage(null);
    try {
      const { blob, file } = await createPdfFromScannedPages(pages, pageSizeFormat, documentTitle);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMessage(`PDF সফলভাৱে সংৰক্ষণ আৰু ডাউনলোড হ'ল (${pages.length} পৃষ্ঠা)!`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (e) {
      console.error('Download PDF error:', e);
      alert('Failed to generate PDF from scanned pages.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save PDF and Immediately Open in Signature Editor
  const handleOpenInSignatureEditor = async () => {
    if (pages.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { file } = await createPdfFromScannedPages(pages, pageSizeFormat, documentTitle);
      stopCamera();
      onSaveAndOpenInEditor(file);
      onClose();
    } catch (e) {
      console.error('Open in editor error:', e);
      alert('Failed to open scanned PDF in signature editor.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  const currentPage = pages[selectedPageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/90 text-white flex items-center justify-center shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  ডকুমেণ্ট স্কেনাৰ (Document Scanner to PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                কেমেৰাৰে পৃষ্ঠা স্কেন কৰক, চিধা কৰক আৰু PDF হিচাপে সংৰক্ষণ কৰক
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message Banner */}
        {exportSuccessMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{exportSuccessMessage}</span>
            </div>
            <button
              onClick={() => setExportSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body: Split View */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-slate-100/70">
          {/* Left Column: Camera / Live Viewfinder (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>কেমেৰা ভিউফাইণ্ডাৰ (Camera)</span>
              </span>

              {cameraActive && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                  title="Switch between front and back camera"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{facingMode === 'environment' ? 'Rear Camera (পিছৰ কেমেৰা)' : 'Front Camera (সন্মুখ)'}</span>
                </button>
              )}
            </div>

            {/* Video Viewfinder Container */}
            <div className="relative aspect-[3/4] w-full max-w-[340px] mx-auto rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-md flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Document Framing Guide overlay */}
                  <div className="absolute inset-4 sm:inset-5 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between items-start">
                      <span className="w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                      <span className="w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    <div className="text-center">
                      <span className="bg-black/60 text-white/90 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        ডকুমেণ্ট এই ফ্ৰেমত ৰাখক
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                      <span className="w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Shutter flash animation overlay */}
                  {isShutterFlashing && (
                    <div className="absolute inset-0 bg-white opacity-85 transition-opacity duration-150 pointer-events-none" />
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      কেমেৰা সক্ৰিয় নাই বা অনুমতি প্ৰয়োজন
                    </p>
                    {cameraError && (
                      <p className="text-[11px] text-amber-300 mt-1 max-w-[260px] mx-auto">
                        {cameraError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    পুনৰ চেষ্টা কৰক (Retry Camera)
                  </button>
                </div>
              )}
            </div>

            {/* Shutter & Capture Controls */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={!cameraActive}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>পৃষ্ঠাৰ ফটো তোলক (Snap Page)</span>
                </button>
              </div>

              {/* Upload alternative */}
              <div className="w-full text-center pt-2 border-t border-slate-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1.5 hover:underline"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>বা ফোন/গেলাৰীৰ পৰা ফটো আপলোড কৰক (Upload Image/Photo)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Scanned Pages Preview & Adjustments (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>স্কেন কৰা পৃষ্ঠা আৰু ফিল্টাৰ ({pages.length} Pages)</span>
              </span>

              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('সকলো পৃষ্ঠা মচিব বিচাৰে নেকি? (Clear all scanned pages?)')) {
                      setPages([]);
                      setSelectedPageIndex(0);
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>সকলো মচক (Clear All)</span>
                </button>
              )}
            </div>

            {pages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400 min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">
                  কোনো পৃষ্ঠা এতিয়ালৈ স্কেন কৰা হোৱা নাই
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  বাওঁফালৰ কেমেৰাৰে পৃষ্ঠাৰ ফটো তোলক বা গেলাৰীৰ পৰা ফটো বাছক। আপুনি একেলগে বহুতো পৃষ্ঠা স্কেন কৰি সম্পূৰ্ণ PDF বনাব পাৰিব।
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>গেলাৰীৰ পৰা ফটো বাছক</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Horizontal Pages Thumbnail Ribbon */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPageIndex(idx)}
                      className={`relative cursor-pointer shrink-0 rounded-lg p-1 transition-all border-2 ${
                        selectedPageIndex === idx
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="w-16 h-22 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={p.processedDataUrl}
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-center mt-1 text-[11px] font-bold text-slate-700">
                        পৃষ্ঠা {idx + 1}
                      </div>

                      {/* Delete badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(idx);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs hover:bg-rose-700"
                        title="Delete this page"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 w-16 h-22 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600 bg-white text-center cursor-pointer transition-colors"
                    title="Add more pages"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-semibold leading-tight">আৰু যোগ কৰক</span>
                  </button>
                </div>

                {/* Active Page Editor Card */}
                {currentPage && (
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col gap-3 min-h-0 shadow-2xs">
                    {/* Page Sub-Header & Ordering */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          পৃষ্ঠা {selectedPageIndex + 1} / {pages.length}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {currentPage.width} × {currentPage.height} px ({currentPage.rotation}°)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePage(selectedPageIndex, 'up')}
                          disabled={selectedPageIndex === 0}
                          className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                          title="Move page up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePage(selectedPageIndex, 'down')}
                          disabled={selectedPageIndex === pages.length - 1}
                          className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                          title="Move page down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePage(selectedPageIndex)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50"
                          title="Delete current page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview & Zoom Area */}
                    <div className="flex-1 relative bg-slate-950/5 rounded-lg flex items-center justify-center p-2 min-h-[180px] max-h-[300px] overflow-hidden border border-slate-100">
                      <img
                        src={currentPage.processedDataUrl}
                        alt="Current page preview"
                        className="max-h-full max-w-full object-contain rounded shadow-xs"
                      />

                      {isProcessingFilter && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-800">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>ফিল্টাৰ প্ৰয়োগ হৈ আছে...</span>
                        </div>
                      )}
                    </div>

                    {/* Toolbar: Rotation & Flip 180° (Directly answering user's rotation & upside down issue) */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-slate-700">
                          পৃষ্ঠাৰ দিশ (Rotation & Flip):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleRotateCurrentPage(-90)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                            title="Rotate 90 degrees counter-clockwise"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                            <span>-90° ⟲</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateCurrentPage(90)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                            title="Rotate 90 degrees clockwise"
                          >
                            <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                            <span>+90° ⟳</span>
                          </button>
                          {/* 180° Flip button for upside down scans */}
                          <button
                            type="button"
                            onClick={() => handleRotateCurrentPage(180)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-md border border-amber-300 transition-colors shadow-2xs"
                            title="Instant 180 flip to fix upside-down scanned page"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                            <span>চিধা কৰক (Flip 180°)</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter Buttons */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          ফিল্টাৰ (Document Enhancement):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleChangeCurrentPageFilter('magic')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors ${
                              currentPage.filter === 'magic'
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>ম্যাজিক ক্লিয়াৰ (Magic Clean)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeCurrentPageFilter('bw')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors ${
                              currentPage.filter === 'bw'
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>ক'লা-বগা (B&W)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeCurrentPageFilter('color')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors ${
                              currentPage.filter === 'color'
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>ৰঙীন (Color)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeCurrentPageFilter('original')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors ${
                              currentPage.filter === 'original'
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>প্ৰকৃত ফটো (Original)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* File Name & Format */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">ফাইল নাম:</span>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Document Name"
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:border-blue-500 outline-hidden w-40 font-mono"
              />
              <span className="text-slate-400 font-mono">.pdf</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">আকাৰ:</span>
              <select
                value={pageSizeFormat}
                onChange={(e) => setPageSizeFormat(e.target.value as 'A4' | 'fit')}
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-slate-50 focus:bg-white text-slate-700 font-medium outline-hidden"
              >
                <option value="A4">A4 Printable (আটাইতকৈ উপযুক্ত)</option>
                <option value="fit">Original Page Aspect Ratio</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              বাতিল কৰক (Cancel)
            </button>

            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pages.length === 0 || isExportingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {isExportingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF সংৰক্ষণ কৰক (Download PDF)</span>
            </button>

            {/* Save & Open in Signature Editor */}
            <button
              type="button"
              onClick={handleOpenInSignatureEditor}
              disabled={pages.length === 0 || isExportingPdf}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <FileSignature className="w-4 h-4" />
              <span>চিধাই চহী বহুৱাবলৈ খোলক (Open & Sign)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
