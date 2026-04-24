import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { markdownToDocxBlob, extractMarkdownTitle, downloadBlob } from '../../utils/markdownToDocx';
import { markdownToPptxBlob, extractPresentationTitle } from '../../utils/markdownToPptx';
import { markdownToXlsxBlob } from '../../utils/markdownToXlsx';
import { markdownToHwpxBlob } from '../../utils/markdownToHwpx';
import { normalizeLlmMarkdownForExport } from '../../utils/llmMarkdownNormalize';

interface SkillDownloadCardProps {
  content: string;
  skillType: 'docx' | 'pptx' | 'xlsx' | 'pdf' | 'hwpx';
}

const SKILL_META = {
  docx: {
    icon: '📝',
    label: 'Word Document',
    ext: '.docx',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/50',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
  },
  pptx: {
    icon: '📊',
    label: 'PowerPoint Presentation',
    ext: '.pptx',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/50',
    btnBg: 'bg-red-600 hover:bg-red-700',
  },
  xlsx: {
    icon: '📗',
    label: 'Excel Spreadsheet',
    ext: '.xlsx',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800/50',
    btnBg: 'bg-green-600 hover:bg-green-700',
  },
  pdf: {
    icon: '📄',
    label: 'PDF Document',
    ext: '.pdf',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800/50',
    btnBg: 'bg-purple-600 hover:bg-purple-700',
  },
  hwpx: {
    icon: '🔤',
    label: '한글 HWPX (.hwpx)',
    ext: '.hwpx',
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800/50',
    btnBg: 'bg-sky-600 hover:bg-sky-700',
  },
} as const;

export function SkillDownloadCard({ content, skillType }: SkillDownloadCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = SKILL_META[skillType];

  // Titles from normalized markdown so filenames match exported structure
  const normalized = normalizeLlmMarkdownForExport(content);
  const rawTitle =
    skillType === 'pptx'
      ? extractPresentationTitle(normalized, 'presentation')
      : extractMarkdownTitle(normalized, 'document');

  const safeFilename = rawTitle
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || skillType;

  const filename =
    skillType === 'pdf' ? `${safeFilename}.docx` : `${safeFilename}${meta.ext}`;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      let blob: Blob;

      if (skillType === 'docx') {
        blob = await markdownToDocxBlob(content);
      } else if (skillType === 'hwpx') {
        blob = await markdownToHwpxBlob(content);
      } else if (skillType === 'pptx') {
        blob = await markdownToPptxBlob(content);
      } else if (skillType === 'xlsx') {
        blob = await markdownToXlsxBlob(content);
      } else {
        // pdf: still generated as Word until a PDF renderer is added
        blob = await markdownToDocxBlob(content);
      }

      downloadBlob(blob, filename);
      setDone(true);
    } catch (err) {
      console.error('[SkillDownloadCard] generation failed:', err);
      setError('Generation failed — try again');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${meta.bg} ${meta.border} max-w-md`}
    >
      {/* File icon */}
      <div className="text-3xl flex-shrink-0 select-none">{meta.icon}</div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${meta.color}`}>{rawTitle}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {error ?? meta.label}
        </p>
      </div>

      {/* Download button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors flex-shrink-0 disabled:opacity-60 ${
          error ? 'bg-gray-400' : meta.btnBg
        }`}
      >
        {downloading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        {done ? 'Saved' : downloading ? 'Building…' : 'Download'}
      </button>
    </div>
  );
}
