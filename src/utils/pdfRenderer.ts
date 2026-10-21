import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure local bundled worker URL (zero external network requests, zero CORS errors!)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function renderPdfPageToCanvas(
  pdfBytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth?: number
): Promise<{ width: number; height: number }> {
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

  const originalViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth ? targetWidth / originalViewport.width : 1.5;
  const viewport = page.getViewport({ scale });

  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: originalViewport.width,
    height: originalViewport.height,
  };
}
