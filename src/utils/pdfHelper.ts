import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { PdfDocumentInfo, SignaturePlacement, PageInfo } from '../types';

/**
 * Loads a PDF file and extracts page counts, rotation angles, and dimensions in points.
 */
export async function loadPdfDocument(fileOrBytes: File | ArrayBuffer | Uint8Array, fileName?: string): Promise<PdfDocumentInfo> {
  let bytes: Uint8Array;
  let name = fileName || 'document.pdf';
  let size = 0;

  if (fileOrBytes instanceof File) {
    name = fileOrBytes.name;
    size = fileOrBytes.size;
    const arrayBuffer = await fileOrBytes.arrayBuffer();
    bytes = new Uint8Array(arrayBuffer);
  } else if (fileOrBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBytes);
    size = bytes.byteLength;
  } else {
    bytes = fileOrBytes;
    size = bytes.byteLength;
  }

  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pages: PageInfo[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const isTransposed = rot === 90 || rot === 270;

    pages.push({
      pageNumber: i + 1,
      width: Math.round(isTransposed ? height : width),
      height: Math.round(isTransposed ? width : height),
      unrotatedWidth: Math.round(width),
      unrotatedHeight: Math.round(height),
      rotation: rot,
    });
  }

  return {
    name,
    size,
    pageCount,
    pages,
    rawBytes: bytes,
  };
}

/**
 * Rotates specific pages or all pages of the PDF by +90° (clockwise) or -90° (counter-clockwise).
 */
export async function rotatePdfDocument(
  pdfInfo: PdfDocumentInfo,
  targetPageNumber: number | 'all',
  deltaDegrees: number
): Promise<PdfDocumentInfo> {
  const pdfDoc = await PDFDocument.load(pdfInfo.rawBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    if (targetPageNumber === 'all' || targetPageNumber === i + 1) {
      const page = pdfDoc.getPage(i);
      const currentAngle = page.getRotation().angle;
      const newAngle = ((currentAngle + deltaDegrees) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  const newBytes = await pdfDoc.save();
  return loadPdfDocument(newBytes, pdfInfo.name);
}

/**
 * Embeds the transparent signature onto the specified pages and coordinates,
 * taking into account page rotation so signatures appear upright and in the exact position.
 */
export async function applySignaturesAndExport(
  pdfDocInfo: PdfDocumentInfo,
  signaturePngBytes: Uint8Array,
  placements: SignaturePlacement[]
): Promise<{ bytes: Uint8Array; blob: Blob; url: string }> {
  const pdfDoc = await PDFDocument.load(pdfDocInfo.rawBytes);
  const totalPages = pdfDoc.getPageCount();

  const pngImage = await pdfDoc.embedPng(signaturePngBytes);

  for (const placement of placements) {
    const pageIndex = placement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) {
      continue;
    }

    const page = pdfDoc.getPage(pageIndex);
    const { width: W0, height: H0 } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;

    // Determine visual dimensions
    const visualHeight = rot === 90 || rot === 270 ? W0 : H0;

    // Calculate visual top-left coordinates (xScreen, yScreen)
    let xScreen = placement.x;
    let yScreen = placement.y;
    if (placement.origin === 'bottom-left') {
      yScreen = visualHeight - placement.y - placement.height;
    }

    // Map screen top-left coordinates to PDF user space depending on page rotation
    let drawParams: any;

    if (rot === 0) {
      drawParams = {
        x: xScreen,
        y: H0 - yScreen - placement.height,
        width: placement.width,
        height: placement.height,
        rotate: degrees(0),
      };
    } else if (rot === 90) {
      drawParams = {
        x: yScreen + placement.height,
        y: xScreen,
        width: placement.width,
        height: placement.height,
        rotate: degrees(90),
      };
    } else if (rot === 180) {
      drawParams = {
        x: W0 - xScreen,
        y: yScreen + placement.height,
        width: placement.width,
        height: placement.height,
        rotate: degrees(180),
      };
    } else {
      // rot === 270
      drawParams = {
        x: W0 - yScreen - placement.height,
        y: H0 - xScreen,
        width: placement.width,
        height: placement.height,
        rotate: degrees(270),
      };
    }

    page.drawImage(pngImage, drawParams);
  }

  const signedBytes = await pdfDoc.save();
  const blob = new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    bytes: signedBytes,
    blob,
    url,
  };
}

/**
 * Creates a clean, realistic multi-page demo PDF (Master Services Agreement)
 * so users can test multi-page signatures immediately.
 */
export async function createSamplePdf(): Promise<PdfDocumentInfo> {
  const pdfDoc = await PDFDocument.create();
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.1, 0.15, 0.25);
  const mutedColor = rgb(0.4, 0.45, 0.5);
  const lineColor = rgb(0.85, 0.88, 0.92);

  // PAGE 1: Agreement Overview & Recitals
  const page1 = pdfDoc.addPage([612, 792]); // Standard US Letter
  page1.drawText('MASTER SERVICES AGREEMENT', {
    x: 54,
    y: 720,
    size: 18,
    font: helveticaBold,
    color: primaryColor,
  });

  page1.drawText('Document ID: MSA-2026-0849  ·  Execution Copy', {
    x: 54,
    y: 700,
    size: 10,
    font: helvetica,
    color: mutedColor,
  });

  page1.drawLine({
    start: { x: 54, y: 685 },
    end: { x: 558, y: 685 },
    thickness: 1,
    color: lineColor,
  });

  const p1Text = [
    'This Master Services Agreement ("Agreement") is entered into as of the Effective Date by and between',
    'Acrobatix Cloud Inc., a Delaware corporation ("Provider"), and the undersigned client entity ("Client").',
    '',
    '1. SCOPE OF SERVICES & DELIVERABLES',
    'Provider shall furnish professional digital solutions, document processing workflows, and verification',
    'services described in associated Statements of Work. All deliverables shall adhere to rigorous security',
    'and compliance specifications set forth in Schedule A.',
    '',
    '2. TERM AND TERMINATION',
    'This Agreement shall commence on the Effective Date and remain in full force for twelve (12) months,',
    'automatically renewing unless either party delivers written notice of non-renewal at least thirty (30) days',
    'prior to expiration.',
    '',
    '3. CONFIDENTIAL INFORMATION',
    'Each party acknowledges that during the engagement it may receive non-public, proprietary information.',
    'Both parties agree to hold all Confidential Information in strict confidence using no less than reasonable care.',
  ];

  let currentY = 650;
  for (const line of p1Text) {
    if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
      page1.drawText(line, { x: 54, y: currentY, size: 11, font: timesBold, color: primaryColor });
      currentY -= 16;
    } else if (line === '') {
      currentY -= 10;
    } else {
      page1.drawText(line, { x: 54, y: currentY, size: 10, font: timesFont, color: rgb(0.2, 0.2, 0.2) });
      currentY -= 14;
    }
  }

  // Initial block on page 1 footer
  page1.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page1.drawText('Page 1 of 3  ·  Client Initial:', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });
  page1.drawRectangle({ x: 180, y: 52, width: 90, height: 22, borderColor: rgb(0.7, 0.75, 0.8), borderWidth: 1 });
  page1.drawText('Authorized Initial', { x: 190, y: 58, size: 8, font: helvetica, color: rgb(0.7, 0.75, 0.8) });

  // PAGE 2: Representations & Warranties
  const page2 = pdfDoc.addPage([612, 792]);
  page2.drawText('MASTER SERVICES AGREEMENT (Continued)', {
    x: 54,
    y: 720,
    size: 14,
    font: helveticaBold,
    color: primaryColor,
  });

  page2.drawLine({
    start: { x: 54, y: 700 },
    end: { x: 558, y: 700 },
    thickness: 1,
    color: lineColor,
  });

  const p2Text = [
    '4. INTELLECTUAL PROPERTY & OWNERSHIP',
    'All right, title, and interest in and to pre-existing technology and work product shall remain solely',
    'with Provider. Upon receipt of full payment, Client receives a non-exclusive license to use deliverables',
    'for its internal business operations.',
    '',
    '5. INDEMNIFICATION AND LIMITATION OF LIABILITY',
    'Neither party shall be liable for indirect, incidental, special, or consequential damages arising out of',
    'or in connection with this agreement. Provider total liability under this contract shall not exceed fees',
    'paid in the preceding six (6) month period.',
    '',
    '6. GOVERNING LAW AND DISPUTE RESOLUTION',
    'This Agreement shall be governed by and construed in accordance with the laws of the State of California,',
    'without reference to conflict of laws principles. Any arbitration shall take place in San Francisco.',
  ];

  currentY = 660;
  for (const line of p2Text) {
    if (line.startsWith('4.') || line.startsWith('5.') || line.startsWith('6.')) {
      page2.drawText(line, { x: 54, y: currentY, size: 11, font: timesBold, color: primaryColor });
      currentY -= 16;
    } else if (line === '') {
      currentY -= 10;
    } else {
      page2.drawText(line, { x: 54, y: currentY, size: 10, font: timesFont, color: rgb(0.2, 0.2, 0.2) });
      currentY -= 14;
    }
  }

  page2.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page2.drawText('Page 2 of 3  ·  Client Initial:', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });
  page2.drawRectangle({ x: 180, y: 52, width: 90, height: 22, borderColor: rgb(0.7, 0.75, 0.8), borderWidth: 1 });
  page2.drawText('Authorized Initial', { x: 190, y: 58, size: 8, font: helvetica, color: rgb(0.7, 0.75, 0.8) });

  // PAGE 3: Execution and Signatures
  const page3 = pdfDoc.addPage([612, 792]);
  page3.drawText('EXECUTION AND SIGNATURE ATTESTATION', {
    x: 54,
    y: 720,
    size: 14,
    font: helveticaBold,
    color: primaryColor,
  });

  page3.drawLine({
    start: { x: 54, y: 700 },
    end: { x: 558, y: 700 },
    thickness: 1,
    color: lineColor,
  });

  page3.drawText(
    'IN WITNESS WHEREOF, the parties hereto have caused this Agreement to be executed by their duly authorized representatives.',
    { x: 54, y: 660, size: 10, font: timesFont, color: rgb(0.2, 0.2, 0.2) }
  );

  // Provider Signature block (Left)
  page3.drawText('PROVIDER:', { x: 54, y: 580, size: 11, font: helveticaBold, color: primaryColor });
  page3.drawText('Acrobatix Cloud Inc.', { x: 54, y: 560, size: 10, font: helvetica, color: primaryColor });
  page3.drawLine({ start: { x: 54, y: 490 }, end: { x: 260, y: 490 }, thickness: 1, color: primaryColor });
  page3.drawText('Authorized Signature (Pre-signed)', { x: 54, y: 475, size: 9, font: helvetica, color: mutedColor });
  page3.drawText('Name: Sarah Jenkins, VP Operations', { x: 54, y: 455, size: 9, font: helvetica, color: primaryColor });
  page3.drawText('Date: October 20, 2026', { x: 54, y: 435, size: 9, font: helvetica, color: primaryColor });

  // Client Signature block (Right) -> Where user places signature!
  page3.drawText('CLIENT (Sign Below):', { x: 310, y: 580, size: 11, font: helveticaBold, color: primaryColor });
  page3.drawText('Client Organization Entity', { x: 310, y: 560, size: 10, font: helvetica, color: primaryColor });
  page3.drawRectangle({
    x: 310,
    y: 485,
    width: 210,
    height: 60,
    borderColor: rgb(0.2, 0.4, 0.8),
    borderWidth: 1,
    borderDashArray: [4, 4],
  });
  page3.drawText('Recommended Signature Placement Area', { x: 320, y: 512, size: 8, font: helvetica, color: rgb(0.3, 0.4, 0.7) });
  page3.drawLine({ start: { x: 310, y: 480 }, end: { x: 520, y: 480 }, thickness: 1, color: primaryColor });
  page3.drawText('Authorized Representative Signature', { x: 310, y: 465, size: 9, font: helvetica, color: mutedColor });
  page3.drawText('Name: Alexander Wright, Chief Legal Officer', { x: 310, y: 445, size: 9, font: helvetica, color: primaryColor });
  page3.drawText('Date: October 21, 2026', { x: 310, y: 425, size: 9, font: helvetica, color: primaryColor });

  page3.drawLine({ start: { x: 54, y: 80 }, end: { x: 558, y: 80 }, thickness: 0.5, color: lineColor });
  page3.drawText('Page 3 of 3  ·  Final Attestation', { x: 54, y: 60, size: 9, font: helvetica, color: mutedColor });

  const rawBytes = await pdfDoc.save();

  return {
    name: 'Master_Services_Agreement_Execution.pdf',
    size: rawBytes.byteLength,
    pageCount: 3,
    pages: [
      { pageNumber: 1, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
      { pageNumber: 2, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
      { pageNumber: 3, width: 612, height: 792, unrotatedWidth: 612, unrotatedHeight: 792, rotation: 0 },
    ],
    rawBytes,
  };
}
