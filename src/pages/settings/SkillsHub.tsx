import React, { useState } from 'react';
import { Search, FolderOpen, RefreshCw, Info } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  color: string;
}

const skills: Skill[] = [
  { id: 'docx', name: 'docx', color: 'bg-orange-500', description: 'Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing...' },
  { id: 'pptx', name: 'pptx', color: 'bg-orange-500', description: 'Presentation creation, editing, and analysis. When Claude needs to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layouts, (4) Adding comments or speaker notes, or any other presentation tasks' },
  { id: 'xlsx', name: 'xlsx', color: 'bg-green-500', description: 'Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2)...' },
  { id: 'aionui-webui-setup', name: 'aionui-webui-setup', color: 'bg-blue-500', description: 'AionUI WebUI configuration expert: Helps users configure AionUI WebUI mode for remote access through the settings interface. Supports LAN connection, Tailscale VPN, and server deployment. Use when users need to set up AionUi WebUI, configure remote access,...' },
  { id: 'mermaid', name: 'mermaid', color: 'bg-green-500', description: 'Render Mermaid diagrams as SVG or ASCII art using beautiful-mermaid. Use when users need to create flowcharts, sequence diagrams, state diagrams, class diagrams, or ER diagrams. Supports both graphical SVG output and terminal-friendly ASCII/Unicode output.' },
  { id: 'moltbook', name: 'moltbook', color: 'bg-green-600', description: 'The social network for AI agents. Post, comment, upvote, and create communities.' },
  { id: 'morph-ppt', name: 'morph-ppt', color: 'bg-teal-500', description: 'Generate Morph-animated PPTs with officecli' },
  { id: 'officecli-academic-paper', name: 'officecli-academic-paper', color: 'bg-green-500', description: 'Use this skill when the user wants to create an academic paper, research paper, white paper, technical report, policy brief, or any formally structured document with TOC, equations, footnotes, endnotes, or scholarly formatting. Trigger on: \'academic paper\', \'research paper\',...' },
  { id: 'officecli-data-dashboard', name: 'officecli-data-dashboard', color: 'bg-blue-600', description: 'Use this skill when the user wants to create a data dashboard, analytics dashboard, KPI dashboard, or executive summary from CSV/tabular data in Excel format. Trigger on: \'dashboard\', \'KPI report\', \'analytics summary\', \'data visualization\', \'CSV to Excel dashboard\', \'executive...' },
  { id: 'officecli-docx', name: 'officecli-docx', color: 'bg-pink-500', description: 'Use this skill any time a .docx file is involved -- as input, output, or both. This includes: creating Word documents, reports, letters, memos, or proposals; reading, parsing, or extracting text from any .docx file; editing, modifying, or updating existing documents; working with...' },
  { id: 'officecli-financial-model', name: 'officecli-financial-model', color: 'bg-orange-400', description: 'Use this skill when the user wants to build a financial model.' },
  { id: 'officecli-pitch-deck', name: 'officecli-pitch-deck', color: 'bg-pink-600', description: 'Use this skill when the user wants to create a pitch deck, investor presentation, product launch deck, sales presentation, or business proposal in PowerPoint format. Trigger on: \'pitch deck\', \'investor deck\', \'Series A deck\', \'product launch presentation\', \'sales deck\',...' },
  { id: 'officecli-pptx', name: 'officecli-pptx', color: 'bg-pink-500', description: 'Use this skill any time a .pptx file is involved -- as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file; editing, modifying, or updating existing presentations; combining or splitting slide...' },
  { id: 'officecli-xlsx', name: 'officecli-xlsx', color: 'bg-blue-500', description: 'Use this skill any time a .xlsx file is involved -- as input, output, or both. This includes: creating spreadsheets, financial models, dashboards, or trackers; reading, parsing, or extracting data from any .xlsx file; editing, modifying, or updating existing workbooks; working with formula...' },
  { id: 'openclaw-setup', name: 'openclaw-setup', color: 'bg-pink-500', description: 'OpenClaw usage expert: Helps you install, deploy, configure, and use OpenClaw personal AI assistant. Can diagnose issues, create bots, execute automated tasks, etc. Use when users need to install OpenClaw, configure Gateway, set up Channels, create Agents, troubleshoot...' },
  { id: 'pdf', name: 'pdf', color: 'bg-purple-500', description: 'Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.' },
  { id: 'skill-creator', name: 'skill-creator', color: 'bg-orange-500', description: 'Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude\'s capabilities with specialized knowledge, workflows, or tool integrations.' },
  { id: 'star-office-helper', name: 'star-office-helper', color: 'bg-orange-400', description: 'Install, start, connect, and troubleshoot visualization companion projects for Aion/OpenClaw, with Star-Office-UI as the default recommendation. Use when users ask for Star Office setup, URL/port connection, Unauthorized page diagnosis, Python venv/pip issues (P...' },
  { id: 'story-roleplay', name: 'story-roleplay', color: 'bg-purple-500', description: 'Parse and apply character cards and world info files in multiple formats (PNG, WebP, JSON), fully compatible with SillyTavern format. Supports automatic parsing, keyword triggering, and dynamic updates.' },
  { id: 'weixin-file-send', name: 'weixin-file-send', color: 'bg-purple-600', description: '|' },
  { id: 'x-recruiter', name: 'x-recruiter', color: 'bg-orange-500', description: '用于在 X (x.com) 发布招聘帖子。包含文案规范、图片生成提示和自动化发布脚本。发布 AI 相关岗位或设计类岗位时优先使用。' },
  { id: 'xiaohongshu-recruiter', name: 'xiaohongshu-recruiter', color: 'bg-teal-500', description: '用于在小红书上发布高质量的 AI 相关岗位招聘帖子。包含自动生成极客风格的招聘封面图和详情图，并提供自动化发布脚本。当用户需要发布招聘信息、寻找 Agent 设计师或其他 AI 领域人才时使用。' },
];

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

export default function SkillsHub() {
  const [search, setSearch] = useState('');

  const filtered = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">My Skills</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">{skills.length}</span>
          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-400 w-48">
            <Search size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="flex-1 outline-none bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 text-sm"
            />
          </div>
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <FolderOpen size={14} />
            Import from Folder
          </button>
        </div>
      </div>

      {/* Path */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <FolderOpen size={13} />
        <span>/Users/zinko/.aionui-config/skills</span>
      </div>

      {/* Skills list */}
      <div className="flex flex-col gap-3">
        {filtered.map((skill) => (
          <div key={skill.id} className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${skill.color} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
              {getInitial(skill.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{skill.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800 font-medium">Built-in</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{skill.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Usage tip */}
      <div className="flex items-start gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Info size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usage Tip: </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Skills configured here can be enabled for any assistant in the "Assistants" setup page; skills are imported and exported using symbolic links.</span>
        </div>
      </div>
    </div>
  );
}
