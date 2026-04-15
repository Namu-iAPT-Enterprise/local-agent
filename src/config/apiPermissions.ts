import React from 'react';
import {
  Users, HardDrive, ScrollText,
  MessageSquare as ChatIcon, Upload, FolderOpen,
  BookPlus, FileEdit, Trash2 as TrashIcon,
  Megaphone, Bell, MailQuestion, Shield,
  Database, ShieldAlert, FileText,
  BookOpen, Download, RefreshCw, RotateCcw,
  PenLine, UserMinus, Users2, Eye,
  SlidersHorizontal, MessageCircleQuestion,
  UsersIcon, Tag,
} from 'lucide-react';

export type FeatureCategory = 'chat' | 'file' | 'knowledge' | 'notice' | 'admin' | 'request';

export interface AppFeatureDef {
  id: string;
  label: string;
  description: string;
  category: FeatureCategory;
  icon: React.ElementType;
  /** To check if this app should be enabled, check if user has AT LEAST ONE of these feature keys */
  requiredFeatureKeys: string[];
}

/**
 * APP_FEATURES — 모든 기능은 RoleServer 권한 태그로만 접근을 제어합니다.
 * accountRole(USER/ADMIN) 기반 게이팅은 사용하지 않습니다.
 */
export const APP_FEATURES: AppFeatureDef[] = [
  // ── 일반 기능 (TEAM_SCOPED 권한으로 접근) ──
  { id: 'knowledge-manage', label: '지식 관리', description: '지식 RAG 등록 및 수정', category: 'knowledge', icon: BookOpen, requiredFeatureKeys: ['KNOWLEDGE_CREATE', 'KNOWLEDGE_MODIFY', 'KNOWLEDGE_DELETE'] },
  { id: 'notice-role', label: '역할 공지', description: '특정 역할 대상 공지 발송', category: 'notice', icon: Megaphone, requiredFeatureKeys: ['GLOBAL_NOTICE_SEND_ROLE'] },
  { id: 'notice-all', label: '전체 공지', description: '전체 사용자 공지 발송', category: 'notice', icon: Bell, requiredFeatureKeys: ['GLOBAL_NOTICE_SEND_ALL'] },
  // ── 역할/팀 관리 (GLOBAL 또는 TEAM_SCOPED 권한으로 접근) ──
  { id: 'admin-users', label: '역할 · 팀 관리', description: '역할 배정 · 정의 · 팀 관리', category: 'admin', icon: Users, requiredFeatureKeys: ['ADMIN_USERS', 'ROLE_ASSIGN', 'ROLE_DEFINE_CREATE', 'GLOBAL_TEAM_CREATE', 'TEAM_MANAGE', 'TEAM_VIEW', 'TEAM_MEMBER_VIEW'] },
  { id: 'admin-requests', label: '문의사항', description: '사용자 문의사항 열람', category: 'request', icon: MailQuestion, requiredFeatureKeys: ['GLOBAL_REQUEST_VIEW'] },
  // ── Admin 탭 전용 (GLOBAL 권한으로만 접근) ──
  { id: 'admin-backup', label: '백업 관리', description: '시스템 백업 관리', category: 'admin', icon: HardDrive, requiredFeatureKeys: ['GLOBAL_BACKUP_CREATE'] },
  { id: 'admin-log', label: '로그 조회', description: '시스템 운영 로그', category: 'admin', icon: ScrollText, requiredFeatureKeys: ['GLOBAL_LOG_VIEW'] },
];

// ── featureKey → UI 메타데이터 맵 ────────────────────────────────────────────
//
// 서버(RoleServer)가 반환하는 allowedApis에는 featureKey와 description이 포함됩니다.
// label은 서버의 description을 그대로 사용하고, 아이콘과 카테고리만 여기서 정의합니다.

export interface FeatureUiMeta {
  icon: React.ElementType;
  category: FeatureCategory;
}

export const FEATURE_UI_MAP: Record<string, FeatureUiMeta> = {
  // Chat
  CHAT_MESSAGE:              { icon: ChatIcon,             category: 'chat'      },
  CHAT_STREAM:               { icon: ChatIcon,             category: 'chat'      },
  CHAT_HISTORY_READ:         { icon: FolderOpen,           category: 'chat'      },
  CHAT_HISTORY_DELETE:       { icon: TrashIcon,            category: 'chat'      },
  // File
  FILE_UPLOAD:               { icon: Upload,               category: 'file'      },
  FILE_LIST:                 { icon: FolderOpen,           category: 'file'      },
  FILE_DOWNLOAD:             { icon: Download,             category: 'file'      },
  GLOBAL_FILE_DELETE:        { icon: TrashIcon,            category: 'file'      },
  // Knowledge
  KNOWLEDGE_CREATE:          { icon: BookPlus,             category: 'knowledge' },
  KNOWLEDGE_MODIFY:          { icon: FileEdit,             category: 'knowledge' },
  KNOWLEDGE_DELETE:          { icon: TrashIcon,            category: 'knowledge' },
  // Notice
  GLOBAL_NOTICE_SEND_ROLE:   { icon: Megaphone,            category: 'notice'    },
  GLOBAL_NOTICE_UPDATE:      { icon: PenLine,              category: 'notice'    },
  GLOBAL_NOTICE_SEND_ALL:    { icon: Bell,                 category: 'notice'    },
  GLOBAL_NOTICE_UPDATE_ALL:  { icon: PenLine,              category: 'notice'    },
  // Role management
  ROLE_PROFILE_VIEW:         { icon: Eye,                  category: 'admin'     },
  ADMIN_USERS:               { icon: Users,                category: 'admin'     },
  ROLE_ASSIGN:               { icon: ShieldAlert,          category: 'admin'     },
  ROLE_REVOKE:               { icon: UserMinus,            category: 'admin'     },
  ROLE_VIEW:                 { icon: Shield,               category: 'admin'     },
  ROLE_TAGS_VIEW:            { icon: Tag,                  category: 'admin'     },
  ROLE_DEFINE_CREATE:        { icon: ShieldAlert,          category: 'admin'     },
  ROLE_DEFINE_MODIFY:        { icon: PenLine,              category: 'admin'     },
  ROLE_DEFINE_DELETE:        { icon: TrashIcon,            category: 'admin'     },
  // Team management
  GLOBAL_TEAM_CREATE:        { icon: Users2,               category: 'admin'     },
  TEAM_VIEW:                 { icon: Eye,                  category: 'admin'     },
  TEAM_MEMBER_VIEW:          { icon: UsersIcon,            category: 'admin'     },
  TEAM_MANAGE:               { icon: SlidersHorizontal,    category: 'admin'     },
  TEAM_DELETE:               { icon: TrashIcon,            category: 'admin'     },
  TEAM_NOTICE:               { icon: Megaphone,            category: 'admin'     },
  // Cache & system
  GLOBAL_CACHE_RELOAD_USER:  { icon: RefreshCw,            category: 'admin'     },
  GLOBAL_CACHE_RELOAD_ALL:   { icon: RefreshCw,            category: 'admin'     },
  GLOBAL_BACKUP_CREATE:      { icon: HardDrive,            category: 'admin'     },
  GLOBAL_BACKUP_RESTORE:     { icon: RotateCcw,            category: 'admin'     },
  GLOBAL_LOG_VIEW:           { icon: ScrollText,           category: 'admin'     },
  // Requests
  GLOBAL_REQUEST_VIEW:        { icon: MailQuestion,        category: 'request'   },
  GLOBAL_REQUEST_VIEW_DETAIL: { icon: FileText,            category: 'request'   },
  REQUEST_POST:               { icon: MessageCircleQuestion, category: 'request' },
};

/** featureKey 접두사로부터 카테고리를 추론합니다 (FEATURE_UI_MAP 미등록 항목 fallback). */
function deriveCategory(featureKey?: string): FeatureCategory {
  if (!featureKey) return 'admin';
  if (featureKey.startsWith('CHAT_'))                                       return 'chat';
  if (featureKey.startsWith('FILE_') || featureKey.startsWith('GLOBAL_FILE_')) return 'file';
  if (featureKey.startsWith('KNOWLEDGE_'))                                  return 'knowledge';
  if (featureKey.includes('NOTICE_'))                                       return 'notice';
  if (featureKey.startsWith('REQUEST_') || featureKey.startsWith('GLOBAL_REQUEST_')) return 'request';
  return 'admin';
}

/**
 * 서버가 반환한 allowedApi 항목에 UI 메타데이터(icon, category, label)를 보강합니다.
 *
 * - label   : 서버의 description 필드를 그대로 사용
 * - icon    : FEATURE_UI_MAP 조회 → 없으면 Database 기본값
 * - category: FEATURE_UI_MAP 조회 → 없으면 featureKey 접두사로 추론
 */
export function getMappedApiInfo(api: { method?: string; featureKey?: string; description?: string }) {
  const ui = api.featureKey ? FEATURE_UI_MAP[api.featureKey] : undefined;
  return {
    label:       api.description ?? api.featureKey ?? '알 수 없는 API',
    description: api.description,
    category:    (ui?.category ?? deriveCategory(api.featureKey)) as FeatureCategory,
    icon:        ui?.icon ?? Database,
  };
}
