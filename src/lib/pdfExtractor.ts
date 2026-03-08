import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

// ==============================
// REGEX PATTERNS (ported from Python)
// ==============================

// Q2. (a) text
const Q_WITH_SUB_RE = /^\s*(Q[0-9]+|Q[IVXLCDM]+)\.?\s*(\([a-z]\))(.*)/i;
// Standalone Q
const MAIN_Q_RE = /^\s*(Q[0-9]+|Q[IVXLCDM]+)\.?\s*$/i;
// (a)
const LETTER_RE = /^\(\s*[a-z]\s*\)$/i;
// (i)
const ROMAN_RE = /^\(\s*(i{1,4}|v|x)\s*\)$/i;
// Page number (only number in whole line)
const PAGE_NUMBER_RE = /^\d+$/;

// ==============================
// NORMALIZE FUNCTION
// ==============================

function normalizeQLabel(text: string): string {
  const match = text.match(/^Q([IVXLCDM]+)$/i);
  if (!match) return text;

  const roman = match[1].toUpperCase();
  const romanMap: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5,
    VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  };

  if (roman in romanMap) {
    return `Q${romanMap[roman]}`;
  }
  return text;
}

// ==============================
// MAIN EXTRACT FUNCTION
// ==============================

/**
 * Extract structured lines from a PDF file, replicating the Python fitz-based
 * extraction logic. Uses pdf.js getTextContent() which provides items with
 * position data, allowing us to reconstruct lines.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const result: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items into lines by Y position (similar to fitz blocks/lines/spans)
    const lines = groupItemsIntoLines(content.items as PdfTextItem[]);

    for (const lineText of lines) {
      let text = lineText.trim();
      if (!text) continue;

      // Skip "(Continued)" lines
      if (text.includes("(Continued)")) continue;

      // Clean multiple spaces
      text = text.replace(/\s+/g, " ");

      // Remove page numbers
      if (PAGE_NUMBER_RE.test(text)) continue;

      // Remove trailing dot like "Q2."
      text = text.replace(/\.$/, "");

      // Normalize QI -> Q1
      text = normalizeQLabel(text);

      // Case 1: Q2 (a) text
      const qWithSub = text.match(Q_WITH_SUB_RE);
      if (qWithSub) {
        const qPart = qWithSub[1].replace(/\.$/, "");
        const subPart = qWithSub[2];
        const remaining = qWithSub[3].trim();
        result.push(qPart.toUpperCase());
        result.push(subPart.toLowerCase() + (remaining ? " " + remaining : ""));
        continue;
      }

      // Case 2: Standalone Q
      if (MAIN_Q_RE.test(text)) {
        result.push(text.toUpperCase());
        continue;
      }

      // Case 3: (a)
      if (LETTER_RE.test(text)) {
        result.push(text.toLowerCase());
        continue;
      }

      // Case 4: (i)
      if (ROMAN_RE.test(text)) {
        result.push(text.toLowerCase());
        continue;
      }

      result.push(text);
    }
  }

  return result.join("\n");
}

// ==============================
// HELPERS
// ==============================

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Groups PDF text items into lines based on their Y-coordinate,
 * similar to how fitz groups spans into lines within blocks.
 */
function groupItemsIntoLines(items: PdfTextItem[]): string[] {
  if (items.length === 0) return [];

  const LINE_Y_TOLERANCE = 3; // items within 3 units of Y are same line
  const lines: { y: number; items: { x: number; str: string }[] }[] = [];

  for (const item of items) {
    if (!item.str && !item.hasEOL) continue;

    const x = item.transform[4];
    const y = item.transform[5];

    // Find existing line with similar Y
    let found = false;
    for (const line of lines) {
      if (Math.abs(line.y - y) < LINE_Y_TOLERANCE) {
        line.items.push({ x, str: item.str });
        found = true;
        break;
      }
    }

    if (!found) {
      lines.push({ y, items: [{ x, str: item.str }] });
    }
  }

  // Sort lines top-to-bottom (higher Y = higher on page in PDF coords)
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line left-to-right, then join
  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);
    return line.items.map((i) => i.str).join(" ");
  });
}
