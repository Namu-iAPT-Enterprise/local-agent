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
  { id: 'pdf',                     name: 'pdf',                     icon: '📄', color: 'bg-purple-500', source: 'builtin',     description: 'PDF operations: extract text/tables, merge/split/rotate, watermarks, forms, OCR, encrypt/decrypt, create or export PDFs (Anthropic pdf skill).' },
  { id: 'hwpx',                    name: 'hwpx',                    icon: '🔤', color: 'bg-sky-600',    source: 'builtin',     description: '한글 HWPX documents: reports, 공문, 기안문. Agent uses gonggong_hwpxskills; chat export is real .hwpx via hwpx-server (run npm run hwpx-server in dev).' },
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
