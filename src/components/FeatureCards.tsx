import React from 'react';
import {
  MessageSquare, Upload, FolderOpen,
  BookPlus, FileEdit, Trash2,
  Megaphone, Bell,
  Users, HardDrive, ScrollText,
  Loader2,
} from 'lucide-react';
import type { AllowedApi } from '../api/gateway';
import type { PermissionStatus } from '../hooks/usePermissions';
import { getMappedApiInfo, FeatureCategory } from '../config/apiPermissions';

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  FeatureCategory,
  { label: string; colorClass: string; badgeClass: string; methodBadge: Record<string, string> }
> = {
  chat: {
    label: '채팅 & 파일',
    colorClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    methodBadge: {
      GET:    'bg-sky-100  dark:bg-sky-900/30  text-sky-600  dark:text-sky-400',
      POST:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      PUT:    'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      DELETE: 'bg-red-100  dark:bg-red-900/30  text-red-600  dark:text-red-400',
      PATCH:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  },
  file: {
    label: '채팅 & 파일',
    colorClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    methodBadge: {
      GET:    'bg-sky-100  dark:bg-sky-900/30  text-sky-600  dark:text-sky-400',
      POST:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      PUT:    'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      DELETE: 'bg-red-100  dark:bg-red-900/30  text-red-600  dark:text-red-400',
      PATCH:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  },
  knowledge: {
    label: '지식 관리',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    methodBadge: {
      GET:    'bg-sky-100    dark:bg-sky-900/30    text-sky-600    dark:text-sky-400',
      POST:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      PUT:    'bg-violet-100  dark:bg-violet-900/30  text-violet-600  dark:text-violet-400',
      DELETE: 'bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400',
      PATCH:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  },
  notice: {
    label: '공지',
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    methodBadge: {
      GET:    'bg-sky-100   dark:bg-sky-900/30   text-sky-600   dark:text-sky-400',
      POST:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      PUT:    'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      DELETE: 'bg-red-100   dark:bg-red-900/30   text-red-600   dark:text-red-400',
      PATCH:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
  },
  admin: {
    label: '관리자',
    colorClass: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    methodBadge: {
      GET:    'bg-sky-100  dark:bg-sky-900/30  text-sky-600  dark:text-sky-400',
      POST:   'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
      PUT:    'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      DELETE: 'bg-red-100  dark:bg-red-900/30  text-red-600  dark:text-red-400',
      PATCH:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  },
  request: {
    label: '문의사항',
    colorClass: 'text-violet-600 dark:text-violet-400',
    badgeClass: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    methodBadge: {
      GET:    'bg-sky-100  dark:bg-sky-900/30  text-sky-600  dark:text-sky-400',
      POST:   'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      PUT:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      DELETE: 'bg-red-100  dark:bg-red-900/30  text-red-600  dark:text-red-400',
      PATCH:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── Sub-components ────────────────────────────────────────────────────────────

/** Single feature card button */
function FeatureCard({ apiItem }: { apiItem: ReturnType<typeof getMappedApiInfo> & AllowedApi }) {
  const meta = CATEGORY_META[apiItem.category];
  const Icon = apiItem.icon;
  const methodColors = meta.methodBadge[apiItem.method] ?? 'bg-gray-100 text-gray-500';

  return (
    <button
      type="button"
      title={apiItem.description ?? apiItem.label}
      className="flex flex-col text-left border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all overflow-hidden group cursor-default"
    >
      <div className="px-3 pt-3 pb-2.5 flex flex-col gap-1.5">
        {/* Icon + label row */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.badgeClass} border`}>
            <Icon size={14} />
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
            {apiItem.label}
          </span>
        </div>

        {/* Method + path */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${methodColors}`}>
            {apiItem.method}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate" title={apiItem.path}>
            {apiItem.path}
          </span>
        </div>
      </div>
    </button>
  );
}

/** Skeleton card shown while permissions are loading */
function SkeletonCard() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden animate-pulse">
      <div className="px-3 pt-3 pb-2.5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-3/4" />
        <div className="flex gap-1.5 mt-0.5">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-28" />
        </div>
      </div>
    </div>
  );
}

// ── Section group ─────────────────────────────────────────────────────────────

interface SectionProps {
  categoryKey: FeatureCategory;
  features: (ReturnType<typeof getMappedApiInfo> & AllowedApi)[];
}

function FeatureSection({ categoryKey, features }: SectionProps) {
  const meta = CATEGORY_META[categoryKey];
  if (!meta) return null;
  return (
    <div className="mb-4">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${meta.colorClass}`}>
        {meta.label}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
        {features.map((f, idx) => (
          <FeatureCard key={`${f.method}-${f.path}-${idx}`} apiItem={f} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FeatureCardsProps {
  status: PermissionStatus;
  allowedApis: AllowedApi[];
  roleIds: string[];
  accountRole: string | null;
}

export default function FeatureCards({
  status,
  allowedApis,
  roleIds,
  accountRole,
}: FeatureCardsProps) {
  const isAdmin = accountRole === 'ADMIN';

  // Determine visible features mapped from allowedApis
  const mappedApis = allowedApis.map(api => ({ ...api, ...getMappedApiInfo(api) }));

  // Group by category order
  const categoryOrder: FeatureCategory[] = ['chat', 'file', 'knowledge', 'notice', 'admin', 'request'];

  const grouped = categoryOrder.reduce<Record<string, typeof mappedApis>>((acc, cat) => {
    const items = mappedApis.filter((f) => f.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 size={13} className="text-gray-400 animate-spin flex-shrink-0" />
          <p className="text-xs text-gray-400 dark:text-gray-500">권한 정보를 불러오는 중…</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state — render nothing inline (toast is shown by parent) ──────────
  if (status === 'error') return null;

  // ── Loaded — nothing visible ───────────────────────────────────────────────
  if (status === 'loaded' && mappedApis.length === 0) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 text-center">
        사용 가능한 추가 기능이 없습니다.
      </div>
    );
  }

  // ── Idle (not yet logged in / no features to show yet) ─────────────────────
  if (status === 'idle' || mappedApis.length === 0) return null;

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header row: section label + permission role badges */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">사용 가능한 기능</p>
        {roleIds.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {roleIds.map((role) => (
              <span
                key={role}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 uppercase tracking-wide"
              >
                {role}
              </span>
            ))}
            {isAdmin && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-800 uppercase tracking-wide">
                ADMIN
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grouped sections */}
      {categoryOrder.map((cat) => {
        const items = grouped[cat];
        if (!items) return null;
        return <FeatureSection key={cat} categoryKey={cat} features={items} />;
      })}
    </div>
  );
}
