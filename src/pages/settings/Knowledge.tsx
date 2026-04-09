import React, { useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { Database, Upload, FileText, Plus, Trash2, CheckCircle, AlertCircle, Loader, FolderOpen } from 'lucide-react';
import { RAG_INGEST_URL, RAG_INGEST_BATCH_URL } from '../../config/apiBase';

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

export default function Knowledge() {
  const { tr } = useLang();
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'files'>('single');

  // Single document state
  const [singleDoc, setSingleDoc] = useState<Document>({ text: '', metadata: {} });
  const [singleMetadataStr, setSingleMetadataStr] = useState('');
  const [singleResult, setSingleResult] = useState<IngestResult>({ status: 'idle' });
  const [singleLoading, setSingleLoading] = useState(false);

  // Batch documents state
  const [batchDocs, setBatchDocs] = useState<Document[]>([]);
  const [batchInput, setBatchInput] = useState('');
  const [batchResult, setBatchResult] = useState<IngestResult>({ status: 'idle' });
  const [batchLoading, setBatchLoading] = useState(false);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [fileMetadataStr, setFileMetadataStr] = useState('');
  const [fileResult, setFileResult] = useState<IngestResult>({ status: 'idle' });
  const [fileLoading, setFileLoading] = useState(false);

  const parseMetadata = (str: string): Record<string, unknown> => {
    if (!str.trim()) return {};
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  };

  const handleSingleIngest = async () => {
    if (!singleDoc.text.trim()) return;

    setSingleLoading(true);
    setSingleResult({ status: 'idle' });

    try {
      const metadata = singleMetadataStr ? parseMetadata(singleMetadataStr) : {};
      const response = await fetch(RAG_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: singleDoc.text, metadata }),
      });

      if (response.ok) {
        setSingleResult({ status: 'success', message: tr.ingestSuccess });
        setSingleDoc({ text: '', metadata: {} });
        setSingleMetadataStr('');
      } else {
        const error = await response.text();
        setSingleResult({ status: 'error', message: `${tr.ingestError}: ${error}` });
      }
    } catch (err) {
      setSingleResult({ status: 'error', message: `${tr.ingestError}: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setSingleLoading(false);
    }
  };

  const handleAddBatchDoc = () => {
    if (!batchInput.trim()) return;
    setBatchDocs([...batchDocs, { text: batchInput, metadata: {} }]);
    setBatchInput('');
  };

  const handleRemoveBatchDoc = (index: number) => {
    setBatchDocs(batchDocs.filter((_, i) => i !== index));
  };

  const handleBatchIngest = async () => {
    if (batchDocs.length === 0) return;

    setBatchLoading(true);
    setBatchResult({ status: 'idle' });

    try {
      const response = await fetch(RAG_INGEST_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchDocs.map(doc => ({ text: doc.text, metadata: doc.metadata }))),
      });

      if (response.ok) {
        const data = await response.json();
        setBatchResult({ status: 'success', message: `${tr.documentsIngested}: ${data.count}`, count: data.count });
        setBatchDocs([]);
      } else {
        const error = await response.text();
        setBatchResult({ status: 'error', message: `${tr.ingestError}: ${error}` });
      }
    } catch (err) {
      setBatchResult({ status: 'error', message: `${tr.ingestError}: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const result = await window.electronAPI.openFileDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedFiles(result.filePaths);
        setFileResult({ status: 'idle' });
      }
    } catch (err) {
      setFileResult({ status: 'error', message: `Failed to open file dialog: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const handleIngestFiles = async () => {
    if (selectedFiles.length === 0) return;

    setFileLoading(true);
    setFileResult({ status: 'idle' });

    try {
      const docsToIngest: { text: string; metadata: Record<string, unknown> }[] = [];
      const baseMetadata = fileMetadataStr ? parseMetadata(fileMetadataStr) : {};

      for (const filePath of selectedFiles) {
        const result = await window.electronAPI.readFile(filePath);
        if (result.success && result.content) {
          const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
          docsToIngest.push({
            text: result.content,
            metadata: { ...baseMetadata, source: fileName, filePath },
          });
        }
      }

      if (docsToIngest.length === 0) {
        setFileResult({ status: 'error', message: 'No files could be read' });
        setFileLoading(false);
        return;
      }

      const response = await fetch(RAG_INGEST_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docsToIngest),
      });

      if (response.ok) {
        const data = await response.json();
        setFileResult({ status: 'success', message: `${tr.documentsIngested}: ${data.count}`, count: data.count });
        setSelectedFiles([]);
        setFileContents(new Map());
        setFileMetadataStr('');
      } else {
        const error = await response.text();
        setFileResult({ status: 'error', message: `${tr.ingestError}: ${error}` });
      }
    } catch (err) {
      setFileResult({ status: 'error', message: `${tr.ingestError}: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{tr.knowledge}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{tr.injectDataDescription}</p>
      </div>

      {/* Tab row */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'single'
              ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <FileText size={14} />
          {tr.injectData}
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'batch'
              ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Plus size={14} />
          {tr.batchIngest}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'files'
              ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Upload size={14} />
          {tr.uploadFiles}
        </button>
      </div>

      {activeTab === 'single' && (
        <div className="flex flex-col gap-4">
          {/* Main card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Info banner */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-400">
              <Database size={14} />
              {tr.injectData}
            </div>

            {/* Document text */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                {tr.documentText}
              </label>
              <textarea
                value={singleDoc.text}
                onChange={(e) => setSingleDoc({ ...singleDoc, text: e.target.value })}
                placeholder="Enter or paste document content..."
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            {/* Metadata */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                {tr.documentMetadata}
              </label>
              <input
                type="text"
                value={singleMetadataStr}
                onChange={(e) => setSingleMetadataStr(e.target.value)}
                placeholder={tr.metadataHelp}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Result message */}
            {singleResult.status !== 'idle' && (
              <div className={`px-5 py-3 border-b border-gray-100 dark:border-gray-700 ${
                singleResult.status === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }`}>
                <div className={`flex items-start gap-2.5 text-sm ${
                  singleResult.status === 'success'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {singleResult.status === 'success' ? (
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  )}
                  <span>{singleResult.message}</span>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="px-5 py-4">
              <button
                onClick={handleSingleIngest}
                disabled={!singleDoc.text.trim() || singleLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-800 dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {singleLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {tr.ingest}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'batch' && (
        <div className="flex flex-col gap-4">
          {/* Description */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {tr.batchIngestDescription}
          </div>

          {/* Add document input */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                Add Document
              </label>
              <div className="flex gap-2">
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="Enter document content..."
                  rows={3}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
                <button
                  onClick={handleAddBatchDoc}
                  disabled={!batchInput.trim()}
                  className="self-end px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Document list */}
            {batchDocs.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {batchDocs.length} document{batchDocs.length !== 1 ? 's' : ''} queued
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {batchDocs.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {doc.text.slice(0, 100)}{doc.text.length > 100 ? '...' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveBatchDoc(index)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-3"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result message */}
            {batchResult.status !== 'idle' && (
              <div className={`px-5 py-3 border-b border-gray-100 dark:border-gray-700 ${
                batchResult.status === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }`}>
                <div className={`flex items-start gap-2.5 text-sm ${
                  batchResult.status === 'success'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {batchResult.status === 'success' ? (
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  )}
                  <span>{batchResult.message}</span>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="px-5 py-4">
              <button
                onClick={handleBatchIngest}
                disabled={batchDocs.length === 0 || batchLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-800 dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {batchLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {tr.batchIngest} ({batchDocs.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="flex flex-col gap-4">
          {/* Description */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Select text files from your local filesystem to ingest into ChromaDB.
          </div>

          {/* File upload card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Info banner */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-400">
              <FolderOpen size={14} />
              {tr.uploadFromFolder}
            </div>

            {/* File selection */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                Select Files
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectFiles}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FolderOpen size={16} />
                  {tr.selectFiles}
                </button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedFiles.length} {selectedFiles.length === 1 ? tr.fileSelected : tr.filesSelected}
                  </span>
                )}
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                  {selectedFiles.map((filePath, index) => (
                    <div key={index} className="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
                      {filePath}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                {tr.documentMetadata} <span className="text-gray-400 font-normal">(optional, applied to all files)</span>
              </label>
              <input
                type="text"
                value={fileMetadataStr}
                onChange={(e) => setFileMetadataStr(e.target.value)}
                placeholder={tr.metadataHelp}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Result message */}
            {fileResult.status !== 'idle' && (
              <div className={`px-5 py-3 border-b border-gray-100 dark:border-gray-700 ${
                fileResult.status === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }`}>
                <div className={`flex items-start gap-2.5 text-sm ${
                  fileResult.status === 'success'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {fileResult.status === 'success' ? (
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  )}
                  <span>{fileResult.message}</span>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="px-5 py-4">
              <button
                onClick={handleIngestFiles}
                disabled={selectedFiles.length === 0 || fileLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-800 dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {fileLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {tr.ingest} ({selectedFiles.length} files)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
