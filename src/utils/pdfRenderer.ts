import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure local bundled worker URL (zero external network requests, zero CORS errors!)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Extend canvas element to track active render task and avoid collisions
type CanvasWithTask = HTMLCanvasElement & {
  _activeRenderTask?: { cancel: () => void } | null;
};

export async function renderPdfPageToCanvas(
  pdfBytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth?: number
): Promise<{ width: number; height: number }> {
  const canvasWithTask = canvas as CanvasWithTask;

  // Cancel any ongoing render task on this canvas
  if (canvasWithTask._activeRenderTask) {
    try {
      canvasWithTask._activeRenderTask.cancel();
    } catch {
      // Ignore cancellation exceptions
    }
    canvasWithTask._activeRenderTask = null;
  }

  // Use a copy of bytes so we don't detach buffers
  const data = new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);

  // Read page's internal rotation
  const originalViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth ? targetWidth / originalViewport.width : 1.5;
  const viewport = page.getViewport({ scale });

  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');

  // Clear previous pixels completely
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };

  const renderTask = page.render(renderContext);
  canvasWithTask._activeRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      return { width: originalViewport.width, height: originalViewport.height };
    }
    throw err;
  } finally {
    if (canvasWithTask._activeRenderTask === renderTask) {
      canvasWithTask._activeRenderTask = null;
    }
  }

  return {
    width: originalViewport.width,
    height: originalViewport.height,
  };
}
