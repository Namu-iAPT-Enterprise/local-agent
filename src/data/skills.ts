export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;       // emoji
  color: string;      // tailwind bg class for fallback avatar
  source: 'builtin' | 'marketplace' | 'custom';
}

// ── Catalog ───────────────────────────────────────────────────────────────────
export const catalogSkills: Skill[] = [
  { id: 'docx',                    name: 'docx',                    icon: '📝', color: 'bg-orange-500', source: 'builtin',     description: 'Create, edit, and analyse Word documents. Reports, proposals, letters, memos, and more.' },
  { id: 'pptx',                    name: 'pptx',                    icon: '📊', color: 'bg-red-500',    source: 'builtin',     description: 'Create and edit PowerPoint presentations. Layouts, speaker notes, and visual slides.' },
  { id: 'xlsx',                    name: 'xlsx',                    icon: '📗', color: 'bg-green-500',  source: 'builtin',     description: 'Create and analyse Excel spreadsheets. Formulas, dashboards, trackers, and data analysis.' },
  { id: 'pdf',                     name: 'pdf',                     icon: '📄', color: 'bg-purple-500', source: 'builtin',     description: 'Extract, create, merge, and split PDF documents. Handles forms and text extraction.' },
  { id: 'mermaid',                 name: 'mermaid',                 icon: '🧜', color: 'bg-teal-500',   source: 'builtin',     description: 'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams.' },
  { id: 'skill-creator',           name: 'skill-creator',           icon: '⚙️', color: 'bg-orange-500', source: 'builtin',     description: 'Create, update, and optimise skills. Includes eval and performance benchmarking.' },
  { id: 'morph-ppt',               name: 'morph-ppt',               icon: '✨', color: 'bg-teal-500',   source: 'builtin',     description: 'Generate Morph-animated PowerPoint presentations with multiple visual styles.' },
  { id: 'officecli-pitch-deck',    name: 'officecli-pitch-deck',    icon: '🎯', color: 'bg-pink-600',   source: 'builtin',     description: 'Build investor pitch decks, product launch decks, and sales presentations.' },
  { id: 'officecli-financial-model', name: 'officecli-financial-model', icon: '💰', color: 'bg-orange-400', source: 'builtin', description: 'Build formula-driven financial models: 3-statement, DCF valuations, cap tables.' },
  { id: 'officecli-academic-paper', name: 'officecli-academic-paper', icon: '📚', color: 'bg-green-600',  source: 'builtin',  description: 'Write formally structured academic papers with TOC, LaTeX equations, footnotes, and endnotes.' },
  { id: 'officecli-data-dashboard', name: 'officecli-data-dashboard', icon: '📈', color: 'bg-blue-600',  source: 'builtin',   description: 'Turn CSV data into polished Excel dashboards with KPI cards, charts, and sparklines.' },
];

// ── Installed skills storage ───────────────────────────────────────────────────
const INSTALLED_SKILLS_KEY = 'namu_installed_skills';

export function getInstalledSkillIds(): string[] {
  try {
    const stored = localStorage.getItem(INSTALLED_SKILLS_KEY);
    if (stored) return JSON.parse(stored) as string[];
  } catch { /* ignore */ }
  // Built-in skills pre-installed by default
  return catalogSkills.filter((s) => s.source === 'builtin').map((s) => s.id);
}

export function isSkillInstalled(id: string): boolean {
  return getInstalledSkillIds().includes(id);
}

export function installSkill(id: string): void {
  try {
    const ids = getInstalledSkillIds();
    if (!ids.includes(id)) {
      localStorage.setItem(INSTALLED_SKILLS_KEY, JSON.stringify([...ids, id]));
    }
  } catch { /* ignore */ }
}

export function uninstallSkill(id: string): void {
  try {
    const ids = getInstalledSkillIds().filter((i) => i !== id);
    localStorage.setItem(INSTALLED_SKILLS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

export function getInstalledSkills(): Skill[] {
  const ids = getInstalledSkillIds();
  return catalogSkills.filter((s) => ids.includes(s.id));
}
