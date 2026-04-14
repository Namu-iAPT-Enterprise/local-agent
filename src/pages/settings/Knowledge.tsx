import React, { useState, useRef, useCallback } from 'react';
import { useLang } from '../../context/LanguageContext';
import {
  BookOpen, Upload, FileText, Plus, CheckCircle,
  AlertCircle, Loader, FolderOpen, X, Tag, AlignLeft,
} from 'lucide-react';
import { RAG_INGEST_URL, RAG_INGEST_BATCH_URL } from '../../config/apiBase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Document {
  text: string;
  metadata: Record<string, unknown>;
  fileName?: string;
}

interface IngestResult {
  status: 'success' | 'error' | 'idle';
  message?: string;
  count?: number;
}

declare global {
  interface Window {
    electronAPI: {
      getLocalIP: () => Promise<string>;
      openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    };
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: '',         label: 'No category'   },
  { value: 'hr',       label: 'HR & People'   },
  { value: 'finance',  label: 'Finance'        },
  { value: 'legal',    label: 'Legal'          },
  { value: 'operations', label: 'Operations'  },
  { value: 'product',  label: 'Product'        },
  { value: 'general',  label: 'General'        },
  { value: 'other',    label: 'Custom…'        },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function buildMetadata(category: string, customCategory: string, extra?: Record<string, unknown>) {
  const cat = category === 'other' ? customCategory.trim() : category;
  return { ...(cat ? { category: cat } : {}), ...(extra ?? {}) };
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function ResultBanner({ result }: { result: IngestResult }) {
  if (result.status === 'idle') return null;
  const ok = result.status === 'success';
  return (
    <div className={`flex items-start gap-2.5 px-5 py-3 text-sm border-b border-gray-100 dark:border-gray-700 ${
      ok ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
         : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
    }`}>
      {ok
        ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
        : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      }
      <span>{result.message}</span>
    </div>
  );
}

function CategoryField({
  value, customValue, onChange, onCustomChange,
}: {
  value: string; customValue: string;
  onChange: (v: string) => void; onCustomChange: (v: string) => void;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Tag size={13} />
        Label this document
        <span className="text-gray-400 font-normal ml-1">(optional)</span>
      </label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {value === 'other' && (
          <input
            type="text"
            placeholder="e.g. IT Support"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        )}
      </div>
    </div>
  );
}

function SubmitButton({
  onClick, disabled, loading, label,
}: { onClick: () => void; disabled: boolean; loading: boolean; label: string }) {
  return (
    <div className="px-5 py-4">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-800 dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
        {loading ? 'Saving…' : label}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Knowledge() {
  const { tr } = useLang();
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'files'>('single');

  // Single document
  const [singleText,           setSingleText]           = useState('');
  const [singleCategory,       setSingleCategory]       = useState('');
  const [singleCustomCategory, setSingleCustomCategory] = useState('');
  const [singleResult,         setSingleResult]         = useState<IngestResult>({ status: 'idle' });
  const [singleLoading,        setSingleLoading]        = useState(false);

  // Batch
  const [batchDocs,    setBatchDocs]    = useState<Document[]>([]);
  const [batchInput,   setBatchInput]   = useState('');
  const [batchResult,  setBatchResult]  = useState<IngestResult>({ status: 'idle' });
  const [batchLoading, setBatchLoading] = useState(false);

  // File upload
  const [selectedFiles,       setSelectedFiles]       = useState<string[]>([]);
  const [fileContents,        setFileContents]        = useState<Map<string, string>>(new Map());
  const [fileCategory,        setFileCategory]        = useState('');
  const [fileCustomCategory,  setFileCustomCategory]  = useState('');
  const [fileResult,          setFileResult]          = useState<IngestResult>({ status: 'idle' });
  const [fileLoading,         setFileLoading]         = useState(false);
  const [isDragging,          setIsDragging]          = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File reading helpers ────────────────────────────────────────────────────

  const readBrowserFiles = async (files: File[]) => {
    const names: string[] = [];
    const map = new Map<string, string>();
    for (const file of files) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      names.push(file.name);
      map.set(file.name, content);
    }
    setSelectedFiles(prev => [...prev, ...names]);
    setFileContents(prev => new Map([...prev, ...map]));
    setFileResult({ status: 'idle' });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await readBrowserFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await readBrowserFiles(files);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver  = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleSelectFiles = async () => {
    if (window.electronAPI?.openFileDialog) {
      try {
        const result = await window.electronAPI.openFileDialog();
        if (!result.canceled && result.filePaths.length > 0) {
          setSelectedFiles(result.filePaths);
          setFileResult({ status: 'idle' });
        }
      } catch {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const removeFile = (filePath: string) => {
    const name = filePath.split(/[\\/]/).pop() || filePath;
    setSelectedFiles(prev => prev.filter(f => f !== filePath));
    setFileContents(prev => {
      const m = new Map(prev);
      m.delete(filePath);
      m.delete(name);
      return m;
    });
  };

  // ── API handlers ────────────────────────────────────────────────────────────

  const handleSingleIngest = async () => {
    if (!singleText.trim()) return;
    setSingleLoading(true);
    setSingleResult({ status: 'idle' });
    try {
      const metadata = buildMetadata(singleCategory, singleCustomCategory);
      const res = await fetch(RAG_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: singleText, metadata }),
      });
      if (res.ok) {
        setSingleResult({ status: 'success', message: 'Document added to your knowledge base!' });
        setSingleText('');
        setSingleCategory('');
        setSingleCustomCategory('');
      } else {
        const err = await res.text();
        setSingleResult({ status: 'error', message: `Something went wrong: ${err}` });
      }
    } catch (err) {
      setSingleResult({ status: 'error', message: `Could not connect to server: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setSingleLoading(false);
    }
  };

  const handleAddBatchDoc = () => {
    if (!batchInput.trim()) return;
    setBatchDocs(prev => [...prev, { text: batchInput, metadata: {} }]);
    setBatchInput('');
  };

  const handleRemoveBatchDoc = (index: number) =>
    setBatchDocs(prev => prev.filter((_, i) => i !== index));

  const handleBatchIngest = async () => {
    if (batchDocs.length === 0) return;
    setBatchLoading(true);
    setBatchResult({ status: 'idle' });
    try {
      const res = await fetch(RAG_INGEST_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchDocs.map(d => ({ text: d.text, metadata: d.metadata }))),
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResult({ status: 'success', message: `${data.count} document${data.count !== 1 ? 's' : ''} added successfully!`, count: data.count });
        setBatchDocs([]);
      } else {
        const err = await res.text();
        setBatchResult({ status: 'error', message: `Something went wrong: ${err}` });
      }
    } catch (err) {
      setBatchResult({ status: 'error', message: `Could not connect to server: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleIngestFiles = async () => {
    if (selectedFiles.length === 0) return;
    setFileLoading(true);
    setFileResult({ status: 'idle' });
    try {
      const baseMetadata = buildMetadata(fileCategory, fileCustomCategory);
      const docs: { text: string; metadata: Record<string, unknown> }[] = [];

      for (const filePath of selectedFiles) {
        const fileName = filePath.split(/[\\/]/).pop() || filePath;

        // Browser upload: content already read into fileContents map
        const browserContent = fileContents.get(filePath) ?? fileContents.get(fileName);
        if (browserContent !== undefined) {
          docs.push({ text: browserContent, metadata: { ...baseMetadata, source: fileName } });
          continue;
        }

        // Electron: read via native API
        if (window.electronAPI?.readFile) {
          const result = await window.electronAPI.readFile(filePath);
          if (result.success && result.content) {
            docs.push({ text: result.content, metadata: { ...baseMetadata, source: fileName, filePath } });
          }
        }
      }

      if (docs.length === 0) {
        setFileResult({ status: 'error', message: 'No files could be read. Make sure they are plain text files (.txt, .md, .csv, etc.).' });
        setFileLoading(false);
        return;
      }

      const res = await fetch(RAG_INGEST_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docs),
      });

      if (res.ok) {
        const data = await res.json();
        setFileResult({ status: 'success', message: `${data.count} file${data.count !== 1 ? 's' : ''} added successfully!`, count: data.count });
        setSelectedFiles([]);
        setFileContents(new Map());
        setFileCategory('');
        setFileCustomCategory('');
      } else {
        const err = await res.text();
        setFileResult({ status: 'error', message: `Something went wrong: ${err}` });
      }
    } catch (err) {
      setFileResult({ status: 'error', message: `Could not connect to server: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setFileLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'single' as const, icon: FileText,  label: 'Add Text'      },
    { id: 'batch'  as const, icon: AlignLeft, label: 'Add Multiple'  },
    { id: 'files'  as const, icon: Upload,    label: 'Upload Files'  },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          {tr.knowledge}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Teach the AI by adding documents, notes, or files. It will use this information when answering questions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Add Text ─────────────────────────────────────────────────────── */}
      {activeTab === 'single' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
              Document Content
            </label>
            <textarea
              value={singleText}
              onChange={(e) => setSingleText(e.target.value)}
              placeholder="Paste or type your content here — meeting notes, policies, reports, anything you want the AI to reference."
              rows={7}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
            {singleText.trim() && (
              <p className="mt-1.5 text-xs text-gray-400 text-right">
                {countWords(singleText).toLocaleString()} words
              </p>
            )}
          </div>

          <CategoryField
            value={singleCategory}
            customValue={singleCustomCategory}
            onChange={setSingleCategory}
            onCustomChange={setSingleCustomCategory}
          />

          <ResultBanner result={singleResult} />

          <SubmitButton
            onClick={handleSingleIngest}
            disabled={!singleText.trim()}
            loading={singleLoading}
            label="Add to Knowledge Base"
          />
        </div>
      )}

      {/* ── Tab: Add Multiple ─────────────────────────────────────────────────── */}
      {activeTab === 'batch' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add several pieces of text one at a time, then save them all together in one go.
          </p>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Input row */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                Add a piece of text
              </label>
              <div className="flex gap-2 items-end">
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddBatchDoc(); }}
                  placeholder="Type or paste text here…"
                  rows={3}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
                <button
                  onClick={handleAddBatchDoc}
                  disabled={!batchInput.trim()}
                  title="Add (⌘ Enter)"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Queue */}
            {batchDocs.length === 0 ? (
              <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                <BookOpen size={26} className="text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No items queued yet — add some text above.</p>
              </div>
            ) : (
              <div className="border-b border-gray-100 dark:border-gray-700">
                <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {batchDocs.length} item{batchDocs.length !== 1 ? 's' : ''} queued
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {batchDocs.map((doc, index) => (
                    <div key={index} className="flex items-start justify-between px-5 py-3">
                      <p className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 line-clamp-2 pr-3">
                        {doc.text}
                      </p>
                      <button
                        onClick={() => handleRemoveBatchDoc(index)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ResultBanner result={batchResult} />

            <SubmitButton
              onClick={handleBatchIngest}
              disabled={batchDocs.length === 0}
              loading={batchLoading}
              label={`Save ${batchDocs.length > 0 ? batchDocs.length + ' ' : ''}item${batchDocs.length !== 1 ? 's' : ''} to Knowledge Base`}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Upload Files ─────────────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload text files to add their contents to the knowledge base. Supported: .txt, .md, .csv, and other plain-text formats.
          </p>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Drop zone */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleSelectFiles}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 cursor-pointer select-none transition-colors ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <FolderOpen size={28} className={isDragging ? 'text-blue-400' : 'text-gray-300 dark:text-gray-600'} />
                <div className="text-center">
                  <p className={`text-sm font-medium ${isDragging ? 'text-blue-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {isDragging ? 'Drop your files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">or click to browse your computer</p>
                </div>
              </div>
              {/* Hidden file input */}
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileInputChange}
              />
            </div>

            {/* File list */}
            {selectedFiles.length > 0 && (
              <div className="border-b border-gray-100 dark:border-gray-700">
                <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {selectedFiles.map((filePath, index) => {
                    const name = filePath.split(/[\\/]/).pop() || filePath;
                    return (
                      <div key={index} className="flex items-center justify-between px-5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={filePath}>{name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(filePath)}
                          className="p-1 ml-2 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <CategoryField
              value={fileCategory}
              customValue={fileCustomCategory}
              onChange={setFileCategory}
              onCustomChange={setFileCustomCategory}
            />

            <ResultBanner result={fileResult} />

            <SubmitButton
              onClick={handleIngestFiles}
              disabled={selectedFiles.length === 0}
              loading={fileLoading}
              label={`Upload ${selectedFiles.length > 0 ? selectedFiles.length + ' ' : ''}file${selectedFiles.length !== 1 ? 's' : ''} to Knowledge Base`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
