import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, Info, X, Maximize2, FileText, Trash2 } from 'lucide-react';

const agents = ['Gemini CLI', 'OpenAI', 'Anthropic', 'Ollama'];

function CreateAssistantModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agent, setAgent] = useState('Gemini CLI');
  const [rules, setRules] = useState('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[680px] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Assistant</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4 flex flex-col gap-5 bg-gray-50 dark:bg-gray-800">
          {/* Name & Avatar */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> Name & Avatar
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2.5">
              <button className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xl flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                🤖
              </button>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this agent"
                className="flex-1 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Assistant Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assistant Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this assistant help with?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Main Agent */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Main Agent</label>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2 L14.5 12 L12 22 L9.5 12 Z" fill="#4285F4" />
                <path d="M2 12 L12 9.5 L22 12 L12 14.5 Z" fill="#EA4335" />
                <path d="M12 2 L14.5 12 L12 14.5 L9.5 12 Z" fill="#FBBC05" />
                <path d="M12 14.5 L14.5 12 L22 12 L12 22 Z" fill="#34A853" />
              </svg>
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="flex-1 text-sm text-gray-800 dark:text-gray-200 outline-none bg-transparent appearance-none cursor-pointer"
              >
                {agents.map((a) => <option key={a}>{a}</option>)}
              </select>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>Main Agent:</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium">gemini</span>
              <span>Skills:</span>
              <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium">22</span>
            </div>
          </div>

          {/* Rules */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rules</label>
              <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 transition-colors">
                <Maximize2 size={12} /> Expand
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
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {rulesTab === 'edit' ? (
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Enter rules in Markdown format..."
                  rows={8}
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none bg-transparent"
                />
              ) : (
                <div className="px-4 py-3 min-h-[180px] text-sm text-gray-500 dark:text-gray-400 italic">
                  {rules || 'Nothing to preview.'}
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={12} /> Add Skills
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
                  Custom Skills
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${skills.length > 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-400">{skills.length}</span>
                </div>
              </div>
              {skills.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-gray-400">
                  No custom skills added
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
          <button className="px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white text-sm font-medium transition-colors">
            Create
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

const initialAssistants: Assistant[] = [
  { id: 'word', name: 'Word Creator', icon: '📝', enabled: true, description: 'Create, edit, and analyze professional Word documents with officecli. Reports, proposals, letters, memos, and more.' },
  { id: 'ppt', name: 'PPT Creator', icon: '📊', enabled: true, description: 'Create, edit, and analyze professional PowerPoint presentations with officecli. Bold designs, varied layouts, and visual impact.' },
  { id: 'excel', name: 'Excel Creator', icon: '📗', enabled: true, description: 'Create, edit, and analyze professional Excel spreadsheets with officecli. Financial models, dashboards, trackers, and data analysis.' },
  { id: 'morph', name: 'Morph PPT', icon: '✨', enabled: true, description: 'Create professional Morph-animated presentations with officecli. Supports multiple visual styles and end-to-end workflow.' },
  { id: 'pitch', name: 'Pitch Deck Creator', icon: '🎯', enabled: false, description: 'Build investor pitch decks, product launch presentations, and enterprise sales decks with gradient designs, data charts, and more.' },
  { id: 'dashboard', name: 'Dashboard Creator', icon: '📈', enabled: false, description: 'Turn CSV or tabular data into polished Excel dashboards with KPI cards, charts linked to live data, sparklines, and conditional formatting.' },
  { id: 'academic', name: 'Academic Paper', icon: '📚', enabled: true, description: 'Create formally structured academic papers, research papers, and white papers with native Word TOC, LaTeX-to-OMML equations.' },
  { id: 'financial', name: 'Financial Model Creator', icon: '💰', enabled: false, description: 'Build formula-driven financial models from text prompts: 3-statement models, DCF valuations, cap tables, scenario analyses.' },
  { id: 'staroffice', name: 'Star Office Helper', icon: '🖥️', enabled: true, description: 'Install, connect, and troubleshoot Star-Office-UI visualization for Aion preview.' },
  { id: 'openclaw', name: 'OpenClaw Setup Expert', icon: '🦞', enabled: true, description: 'Expert guide for installing, deploying, configuring, and troubleshooting OpenClaw. Proactively helps with setup and diagnoses issues.' },
  { id: 'cowork', name: 'Cowork', icon: '⚡', enabled: true, description: 'Autonomous task execution with file operations, document processing, and multi-step workflow planning.' },
  { id: '3dgame', name: '3D Game', icon: '🎮', enabled: false, description: 'Generate a complete 3D platform collection game in one HTML file.' },
  { id: 'uiux', name: 'UI/UX Pro Max', icon: '🎨', enabled: false, description: 'Professional UI/UX design intelligence with 57 styles, 95 color palettes, 56 font pairings, and stack-specific best practices.' },
  { id: 'planning', name: 'Planning with Files', icon: '📋', enabled: false, description: 'Manus-style file-based planning for complex tasks. Uses task_plan.md, findings.md, and progress.md to maintain persistent context.' },
  { id: 'human', name: 'HUMAN 3.0 Coach', icon: '🧭', enabled: false, description: 'Personal development coach based on HUMAN 3.0 framework: 4 Quadrants (Mind/Body/Spirit/Vocation), 3 Levels, 3 Growth Phases.' },
  { id: 'socialjob', name: 'Social Job Publisher', icon: '📢', enabled: false, description: 'Expand hiring requests into a full JD, images, and publish to social platforms via connectors.' },
  { id: 'moltbook', name: 'moltbook', icon: '🦞', enabled: true, description: 'The social network for AI agents. Post, comment, upvote, and create communities.' },
  { id: 'mermaid', name: 'Beautiful Mermaid', icon: '🧜', enabled: true, description: 'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams with beautiful themes.' },
  { id: 'story', name: 'Story Roleplay', icon: '📖', enabled: true, description: 'Immersive story roleplay. Start by: 1) Natural language to create characters, 2) Paste PNG images, or 3) Open folder with characters.' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? 'bg-gray-800 dark:bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function Assistants() {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [showCreate, setShowCreate] = useState(false);

  const toggle = (id: string) => {
    setAssistants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1.5 text-base font-semibold text-gray-800 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ChevronDown size={16} />
          Assistants
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Plus size={14} />
          Create Assistant
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-gray-400 mb-2 px-1">Available assistants</p>
        {assistants.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
          >
            <span className="text-xl w-8 text-center flex-shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{a.description}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Toggle enabled={a.enabled} onChange={() => toggle(a.id)} />
              <button className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                <Info size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateAssistantModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
