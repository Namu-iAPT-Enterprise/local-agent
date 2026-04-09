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

// ── Feature definitions ────────────────────────────────────────────────────────

interface FeatureDef {
  featureKey: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Used for path-based fallback matching when featureKey is absent in response */
  pathPrefix: string;
  label: string;
  description: string;
  category: 'chat' | 'file' | 'knowledge' | 'notice' | 'admin';
  icon: React.ElementType;
  /** If true, visibility is based on accountRole === 'ADMIN', not allowedApis */
  adminOnly?: boolean;
}

const FEATURES: FeatureDef[] = [
  // ── 채팅 & 파일 ─────────────────────────────────────────────────────────────
  {
    featureKey: 'CHAT_MESSAGE',
    method: 'POST',
    pathPrefix: '/api/chat/message',
    label: '채팅 전송',
    description: '채팅 메시지 전송',
    category: 'chat',
    icon: MessageSquare,
  },
  {
    featureKey: 'FILE_UPLOAD',
    method: 'POST',
    pathPrefix: '/api/files',
    label: '파일 업로드',
    description: '파일 업로드',
    category: 'file',
    icon: Upload,
  },
  {
    featureKey: 'FILE_VIEW',
    method: 'GET',
    pathPrefix: '/api/files',
    label: '파일 조회',
    description: '파일 목록 및 다운로드',
    category: 'file',
    icon: FolderOpen,
  },
  // ── 지식 관리 ────────────────────────────────────────────────────────────────
  {
    featureKey: 'KNOWLEDGE_REGISTER',
    method: 'POST',
    pathPrefix: '/api/knowledge',
    label: '지식 등록',
    description: '지식 RAG 등록',
    category: 'knowledge',
    icon: BookPlus,
  },
  {
    featureKey: 'KNOWLEDGE_UPDATE',
    method: 'PUT',
    pathPrefix: '/api/knowledge',
    label: '지식 수정',
    description: '지식 항목 수정',
    category: 'knowledge',
    icon: FileEdit,
  },
  {
    featureKey: 'KNOWLEDGE_DELETE',
    method: 'DELETE',
    pathPrefix: '/api/knowledge',
    label: '지식 삭제',
    description: '지식 항목 삭제',
    category: 'knowledge',
    icon: Trash2,
  },
  // ── 공지 ─────────────────────────────────────────────────────────────────────
  {
    featureKey: 'NOTICE_SEND_ROLE',
    method: 'POST',
    pathPrefix: '/api/notice',
    label: '역할 공지 발송',
    description: '특정 역할 대상 공지 발송',
    category: 'notice',
    icon: Megaphone,
  },
  {
    featureKey: 'NOTICE_SEND_ALL',
    method: 'POST',
    pathPrefix: '/api/notice/all',
    label: '전체 공지 발송',
    description: '전체 사용자 공지 발송',
    category: 'notice',
    icon: Bell,
  },
  // ── 관리자 (계정 역할 ADMIN) ──────────────────────────────────────────────────
  {
    featureKey: 'ADMIN_USERS',
    method: 'GET',
    pathPrefix: '/api/admin/users',
    label: '계정 관리',
    description: '사용자 계정 조회 및 관리',
    category: 'admin',
    icon: Users,
    adminOnly: true,
  },
  {
    featureKey: 'ADMIN_BACKUP',
    method: 'GET',
    pathPrefix: '/api/backups',
    label: '백업 관리',
    description: '시스템 백업 조회',
    category: 'admin',
    icon: HardDrive,
    adminOnly: true,
  },
  {
    featureKey: 'ADMIN_LOG',
    method: 'GET',
    pathPrefix: '/api/log',
    label: '로그 조회',
    description: '시스템 운영 로그',
    category: 'admin',
    icon: ScrollText,
    adminOnly: true,
  },
];

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  FeatureDef['category'],
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
    },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isFeatureAllowed(feature: FeatureDef, allowedApis: AllowedApi[]): boolean {
  return allowedApis.some((api) => {
    // Prefer featureKey match if the gateway response includes it
    if (feature.featureKey && api.featureKey) {
      return api.featureKey === feature.featureKey;
    }
    // Fall back to method + path prefix match
    return (
      api.method.toUpperCase() === feature.method &&
      api.path.startsWith(feature.pathPrefix)
    );
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Single feature card button */
function FeatureCard({ feature }: { feature: FeatureDef }) {
  const meta = CATEGORY_META[feature.category];
  const Icon = feature.icon;
  const methodColors = meta.methodBadge[feature.method] ?? 'bg-gray-100 text-gray-500';

  return (
    <button
      type="button"
      title={feature.description}
      className="flex flex-col text-left border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all overflow-hidden group cursor-default"
    >
      <div className="px-3 pt-3 pb-2.5 flex flex-col gap-1.5">
        {/* Icon + label row */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.badgeClass} border`}>
            <Icon size={14} />
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
            {feature.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug pl-0.5">
          {feature.description}
        </p>

        {/* Method + path */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${methodColors}`}>
            {feature.method}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
            {feature.pathPrefix}
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
  categoryKey: FeatureDef['category'];
  features: FeatureDef[];
}

function FeatureSection({ categoryKey, features }: SectionProps) {
  const meta = CATEGORY_META[categoryKey];
  return (
    <div className="mb-4">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${meta.colorClass}`}>
        {meta.label}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
        {features.map((f) => (
          <FeatureCard key={f.featureKey} feature={f} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FeatureCardsProps {
  status: PermissionStatus;
  allowedApis: AllowedApi[];
  permissionRoles: string[];
  accountRole: string | null;
}

export default function FeatureCards({
  status,
  allowedApis,
  permissionRoles,
  accountRole,
}: FeatureCardsProps) {
  const isAdmin = accountRole === 'ADMIN';

  // Determine visible features
  const visibleFeatures = FEATURES.filter((f) => {
    if (f.adminOnly) return isAdmin;
    return isFeatureAllowed(f, allowedApis);
  });

  // Group by category order
  const categoryOrder: FeatureDef['category'][] = ['chat', 'file', 'knowledge', 'notice', 'admin'];

  const grouped = categoryOrder.reduce<Record<string, FeatureDef[]>>((acc, cat) => {
    const items = visibleFeatures.filter((f) => f.category === cat);
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
  if (status === 'loaded' && visibleFeatures.length === 0) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 text-center">
        사용 가능한 추가 기능이 없습니다.
      </div>
    );
  }

  // ── Idle (not yet logged in / no features to show yet) ─────────────────────
  if (status === 'idle' || visibleFeatures.length === 0) return null;

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header row: section label + permission role badges */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">사용 가능한 기능</p>
        {permissionRoles.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {permissionRoles.map((role) => (
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
