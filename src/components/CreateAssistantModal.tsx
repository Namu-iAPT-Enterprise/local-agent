import React, { useState, useRef } from 'react';
import { ChevronDown, X, Maximize2, FileText, Trash2, Activity } from 'lucide-react';
import type { OfficeAssistant } from '../data/officeAssistants';

interface CreateAssistantModalProps {
  onClose: () => void;
  onCreate: (assistant: OfficeAssistant) => void;
  initialValues?: Pick<OfficeAssistant, 'id' | 'name' | 'description' | 'systemPrompt'>;
}

export default function CreateAssistantModal({ onClose, onCreate, initialValues }: CreateAssistantModalProps) {
  const isEditMode = !!initialValues;
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [rules, setRules] = useState(initialValues?.systemPrompt ?? '');
  const [rulesTab, setRulesTab] = useState<'edit' | 'preview'>('edit');
  const [skills, setSkills] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setSkills((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    const assistant: OfficeAssistant = {
      id: initialValues?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || '사용자 정의 어시스턴트',
      icon: Activity,
      promptPrefix: `[${name.trim()}] `,
      systemPrompt: rules.trim() || 'You are a helpful assistant.',
      color: 'bg-blue-500',
      isDefault: false,
    };

    onCreate(assistant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[680px] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEditMode ? '어시스턴트 수정' : '어시스턴트 만들기'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4 flex flex-col gap-5 bg-gray-50 dark:bg-gray-800">
          {/* Name & Avatar */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> 이름 및 아바타
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="어시스턴트 이름을 입력하세요"
                className="flex-1 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Assistant Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 어시스턴트가 어떤 도움을 줄 수 있나요?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Rules - System Prompt */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">시스템 프롬프트</label>
              <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 transition-colors">
                <Maximize2 size={12} /> 확대
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden">
              <div className="flex border-b border-gray-100 dark:border-gray-600 px-4 pt-2 gap-4">
                {(['edit', 'preview'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRulesTab(t)}
                    className={`pb-2 text-sm capitalize border-b-2 transition-colors ${rulesTab === t ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                  >
                    {t === 'edit' ? '편집' : '미리보기'}
                  </button>
                ))}
              </div>
              {rulesTab === 'edit' ? (
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="마크다운 형식으로 규칙을 입력하세요..."
                  rows={8}
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none bg-transparent"
                />
              ) : (
                <div className="px-4 py-3 min-h-[180px] text-sm text-gray-500 dark:text-gray-400 italic">
                  {rules || '미리보기할 내용이 없습니다.'}
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">스킬</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                추가
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-600">
                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <ChevronDown size={14} />
                  사용자 정의 스킬
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${skills.length > 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-400">{skills.length}</span>
                </div>
              </div>
              {skills.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-gray-400">
                  추가된 스킬이 없습니다
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-600">
                  {skills.map((file, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <FileText size={15} className="text-blue-400 flex-shrink-0" />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => removeSkill(i)}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditMode ? '수정' : '만들기'}
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
