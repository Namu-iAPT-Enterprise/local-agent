/**
 * Converts markdown (GFM tables) to a real .xlsx Blob using SheetJS (xlsx).
 */
import * as XLSX from 'xlsx';
import { fixGfmTableGlue } from './markdownTableNormalize';

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (!s.startsWith('|')) return [];
  s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isSeparatorCells(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((c) => {
    const x = c.trim().replace(/\s/g, '');
    return /^:?-{1,}:?$/.test(x);
  });
}

/** Parse one contiguous block of lines starting with | */
function parseTableBlock(lines: string[]): string[][] | null {
  const rows = lines.map((l) => splitTableRow(l)).filter((r) => r.length > 0);
  if (rows.length < 2) return null;

  const header = rows[0];
  let body: string[][];
  if (rows.length >= 2 && isSeparatorCells(rows[1])) {
    body = rows.slice(2);
  } else {
    body = rows.slice(1);
  }

  const colCount = Math.max(header.length, ...body.map((r) => r.length));
  const pad = (r: string[]) => {
    const out = [...r];
    while (out.length < colCount) out.push('');
    return out;
  };

  return [pad(header), ...body.map(pad)];
}

function extractTables(markdown: string): string[][][] {
  const normalized = fixGfmTableGlue(markdown);
  const lines = normalized.split(/\r?\n/);
  const tables: string[][][] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t.startsWith('|')) {
      i++;
      continue;
    }
    const block: string[] = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      block.push(lines[i].trim());
      i++;
    }
    const parsed = parseTableBlock(block);
    if (parsed && parsed.length > 0) tables.push(parsed);
  }
  return tables;
}

export async function markdownToXlsxBlob(markdown: string): Promise<Blob> {
  const tables = extractTables(markdown);
  const wb = XLSX.utils.book_new();

  if (tables.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([[markdown.slice(0, 8000)]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  } else {
    tables.forEach((data, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const name = tables.length === 1 ? 'Sheet1' : `Sheet${idx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
