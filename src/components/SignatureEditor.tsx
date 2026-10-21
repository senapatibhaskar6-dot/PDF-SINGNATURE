import React, { useState, useRef, useEffect } from 'react';
import { BackgroundRemovalOptions, ProcessedSignature } from '../types';
import {
  processSignatureImage,
  generateSampleSignatureDataUrl,
} from '../utils/imageProcessor';
import {
  Upload,
  Sliders,
  Check,
  RefreshCw,
  PenTool,
  Eraser,
  Wand2,
  Sparkles,
  SunMedium,
} from 'lucide-react';

interface SignatureEditorProps {
  signature: ProcessedSignature | null;
  onSignatureProcessed: (sig: ProcessedSignature) => void;
}

export const SignatureEditor: React.FC<SignatureEditorProps> = ({
  signature,
  onSignatureProcessed,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawImageSource, setRawImageSource] = useState<string | null>(null);

  const [options, setOptions] = useState<BackgroundRemovalOptions>({
    threshold: 215,
    feather: 25,
    shadowRemoval: 45,
    inkMode: 'darken',
    autoTrim: true,
  });

  // Canvas drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [, setHasDrawnContent] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger processing when image source or options change
  const reprocess = async (source: string, customOptions?: BackgroundRemovalOptions) => {
    setIsProcessing(true);
    try {
      const opts = customOptions || options;
      const processed = await processSignatureImage(source, opts);
      onSignatureProcessed(processed);
    } catch (err) {
      console.error('Error processing signature:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick preset applicator
  const applyPreset = (presetName: 'crystal' | 'phone_photo' | 'high_contrast') => {
    let newOpts: BackgroundRemovalOptions;

    if (presetName === 'crystal') {
      newOpts = {
        threshold: 210,
        feather: 20,
        shadowRemoval: 55,
        inkMode: 'darken',
        autoTrim: true,
      };
    } else if (presetName === 'phone_photo') {
      newOpts = {
        threshold: 195,
        feather: 20,
        shadowRemoval: 75,
        inkMode: 'high_contrast',
        autoTrim: true,
      };
    } else {
      // high_contrast
      newOpts = {
        threshold: 220,
        feather: 15,
        shadowRemoval: 60,
        inkMode: 'high_contrast',
        autoTrim: true,
      };
    }

    setOptions(newOpts);
    if (rawImageSource) {
      reprocess(rawImageSource, newOpts);
    }
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্ৰহ কৰি ফটো বা স্কেন কৰা ছবি (JPG / PNG) আপলোড কৰক।');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setRawImageSource(dataUrl);
      await reprocess(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Load sample signature
  const handleLoadSample = async () => {
    const sampleDataUrl = generateSampleSignatureDataUrl();
    setRawImageSource(sampleDataUrl);
    await reprocess(sampleDataUrl);
  };

  // Drawing pad handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnContent(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setRawImageSource(dataUrl);
    reprocess(dataUrl);
  };

  const clearDrawingCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawnContent(false);
  };

  useEffect(() => {
    if (activeTab === 'draw') {
      clearDrawingCanvas();
    }
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Header & Mode Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <span>Signature & Background Removal</span>
            <span className="text-[11px] text-blue-700 font-normal bg-blue-50 px-2 py-0.5 rounded">
              বগা কাগজ পৰিষ্কাৰ
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Automatically erases white paper & phone shadows, leaving crisp, transparent ink
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo / Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'draw'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw Directly</span>
          </button>
        </div>
      </div>

      {/* Input area */}
      {activeTab === 'upload' ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2.5 transition-colors">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-xs font-semibold text-slate-800 mb-1">
            Click to upload your signature photo or drag image here
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            কাগজত চহী কৰি মʼবাইলত ফটো তুলি ইয়াত আপলোড কৰক (JPG / PNG)
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadSample();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200 shadow-2xs transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Use Sample Cursive Signature (নমুনা চহী)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
            <canvas
              ref={drawCanvasRef}
              width={560}
              height={180}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-36 touch-none cursor-crosshair bg-white"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              তলত আঙুলি বা মাউচৰ সহায়ত চহী কৰক
            </span>
            <button
              onClick={clearDrawingCanvas}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-red-600 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Clear Pad (মচি পেলাওক)</span>
            </button>
          </div>
        </div>
      )}

      {/* Signature Previews & Background Removal Tuning */}
      {signature && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          {/* Quick Presets for crystal clean background */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Crystal Clear Presets (পৰিষ্কাৰ মোড):</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('crystal')}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md shadow-2xs transition-colors"
              >
                Ultra Clear (অধিক স্বচ্ছ)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('phone_photo')}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md shadow-2xs transition-colors"
              >
                Mobile Photo (ছাঁ আঁতৰাওক)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('high_contrast')}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md shadow-2xs transition-colors"
              >
                Crisp Black (গাঢ় চহী)
              </button>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Original Preview */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Original Upload (মূল ছবি)</span>
                <div className="h-24 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={signature.originalDataUrl}
                    alt="Original Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Transparent PNG Preview on Checkerboard */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Transparent PNG (স্বচ্ছ আৰু পৰিষ্কাৰ)
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {signature.width}×{signature.height}px
                  </span>
                </div>
                <div className="h-24 bg-checkerboard border border-emerald-300 rounded-lg p-2 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={signature.processedDataUrl}
                    alt="Transparent Signature"
                    className="max-h-full max-w-full object-contain drop-shadow-xs"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Removal Tuning Controls */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Fine-Tune Sliders (প্ৰয়োজন অনুসৰি এডজাষ্ট কৰক)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* White Threshold */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>White Cutoff (বগা ৰং কাটোৰ)</span>
                  <span className="font-mono">{options.threshold}</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="250"
                  value={options.threshold}
                  onChange={(e) => {
                    const newOpts = { ...options, threshold: Number(e.target.value) };
                    setOptions(newOpts);
                    if (rawImageSource) reprocess(rawImageSource, newOpts);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Shadow / Phone Paper Tint Remover */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                  <span className="flex items-center gap-1">
                    <SunMedium className="w-3 h-3 text-amber-500" />
                    <span>Shadow Remover (ছাঁ আঁতৰোৱা)</span>
                  </span>
                  <span className="font-mono">{options.shadowRemoval}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.shadowRemoval}
                  onChange={(e) => {
                    const newOpts = { ...options, shadowRemoval: Number(e.target.value) };
                    setOptions(newOpts);
                    if (rawImageSource) reprocess(rawImageSource, newOpts);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Edge Smoothness */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Edge Smoothness (মসৃণতা)</span>
                  <span className="font-mono">{options.feather}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={options.feather}
                  onChange={(e) => {
                    const newOpts = { ...options, feather: Number(e.target.value) };
                    setOptions(newOpts);
                    if (rawImageSource) reprocess(rawImageSource, newOpts);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Ink Style & Auto-trim Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              {/* Ink Style */}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-[11px]">Ink Color (চহীৰ ৰং):</span>
                <div className="inline-flex rounded-md bg-white p-0.5 border border-slate-200 shadow-2xs">
                  {[
                    { id: 'darken', label: 'Darken Ink' },
                    { id: 'high_contrast', label: 'Solid Black (গাঢ় কʼলা)' },
                    { id: 'navy', label: 'Deep Blue (নীলা)' },
                    { id: 'original', label: 'Original' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        const newOpts = { ...options, inkMode: mode.id as any };
                        setOptions(newOpts);
                        if (rawImageSource) reprocess(rawImageSource, newOpts);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        options.inkMode === mode.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Trim Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={options.autoTrim}
                  onChange={(e) => {
                    const newOpts = { ...options, autoTrim: e.target.checked };
                    setOptions(newOpts);
                    if (rawImageSource) reprocess(rawImageSource, newOpts);
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Auto-crop empty borders (অলাগতিয়াল বৰ্ডাৰ কাটোৰ)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
