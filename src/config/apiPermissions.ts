import React from 'react';
import {
  Users, HardDrive, ScrollText,
  MessageSquare as ChatIcon, Upload, FolderOpen,
  BookPlus, FileEdit, Trash2 as TrashIcon,
  Megaphone, Bell, MailQuestion, Shield, Settings,
  Database, Server, ShieldAlert, FileText,
  BookOpen, Download, RefreshCw, RotateCcw,
  PenLine, UserMinus, Users2, Eye,
  SlidersHorizontal, Undo2, MessageCircleQuestion
} from 'lucide-react';

export type FeatureCategory = 'chat' | 'file' | 'knowledge' | 'notice' | 'admin' | 'request';

export interface AppFeatureDef {
  id: string; // Used for UI click handling
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

export interface ApiPermissionDef {
  method: string;
  pathPrefix: string;
  featureKey?: string; // Optional match by featureKey if returned by backend
  label: string;
  description?: string;
  category: FeatureCategory;
  icon: React.ElementType;
}

export const API_PERMISSIONS: ApiPermissionDef[] = [
  // Chat & File
  { featureKey: 'CHAT_MESSAGE', method: 'POST', pathPrefix: '/api/chat/message', label: '채팅 전송', description: '채팅 메시지 전송', category: 'chat', icon: ChatIcon },
  { featureKey: 'CHAT_STREAM', method: 'GET', pathPrefix: '/api/chat/stream', label: '채팅 스트림', description: '채팅 메시지 스트림 수신', category: 'chat', icon: ChatIcon },
  { featureKey: 'CHAT_HISTORY_READ', method: 'GET', pathPrefix: '/api/chat/history', label: '채팅 기록 조회', description: '과거 채팅 기록 조회', category: 'chat', icon: FolderOpen },
  { featureKey: 'CHAT_HISTORY_DELETE', method: 'DELETE', pathPrefix: '/api/chat/history', label: '채팅 기록 삭제', description: '채팅 기록 삭제', category: 'chat', icon: TrashIcon },
  { featureKey: 'FILE_UPLOAD', method: 'POST', pathPrefix: '/api/files', label: '파일 업로드', description: '파일 업로드', category: 'file', icon: Upload },
  { featureKey: 'FILE_LIST', method: 'GET', pathPrefix: '/api/files', label: '파일 목록 조회', description: '업로드된 파일 목록 조회', category: 'file', icon: FolderOpen },
  { featureKey: 'FILE_DOWNLOAD', method: 'GET', pathPrefix: '/api/files/', label: '파일 다운로드', description: '파일 다운로드', category: 'file', icon: Download },
  { featureKey: 'GLOBAL_FILE_DELETE', method: 'DELETE', pathPrefix: '/api/files/', label: '타인 파일 삭제', description: '타인이 업로드한 파일 삭제', category: 'file', icon: TrashIcon },
  
  // Knowledge
  { featureKey: 'KNOWLEDGE_CREATE', method: 'POST', pathPrefix: '/api/knowledge', label: '지식 등록', description: '지식 RAG 항목 추가', category: 'knowledge', icon: BookPlus },
  { featureKey: 'KNOWLEDGE_MODIFY', method: 'POST', pathPrefix: '/api/knowledge/update', label: '지식 수정', description: '기존 지식 RAG 항목 내용 수정', category: 'knowledge', icon: FileEdit },
  { featureKey: 'KNOWLEDGE_DELETE', method: 'POST', pathPrefix: '/api/knowledge/purge', label: '지식 삭제', description: '지식 RAG 항목 삭제', category: 'knowledge', icon: TrashIcon },
  
  // Notice
  { featureKey: 'GLOBAL_NOTICE_SEND_ROLE', method: 'POST', pathPrefix: '/api/notice', label: '역할 공지 발송', description: '특정 역할 대상 공지 발송', category: 'notice', icon: Megaphone },
  { featureKey: 'GLOBAL_NOTICE_UPDATE', method: 'POST', pathPrefix: '/api/notice/update', label: '공지 수정', description: '기존 공지 내용 수정', category: 'notice', icon: PenLine },
  { featureKey: 'GLOBAL_NOTICE_SEND_ALL', method: 'POST', pathPrefix: '/api/notice/all', label: '전체 공지 발송', description: '전체 사용자 대상 공지 발송', category: 'notice', icon: Bell },
  { featureKey: 'GLOBAL_NOTICE_UPDATE_ALL', method: 'POST', pathPrefix: '/api/notice/all/update', label: '전체 공지 수정', description: '전체 공지 내용 수정', category: 'notice', icon: PenLine },
  
  // Admin & Management
  { featureKey: 'ROLE_PROFILE_VIEW', method: 'GET', pathPrefix: '/api/management/role/profile', label: '본인 역할 프로필 조회', description: '로그인 사용자 본인의 역할 프로필 조회', category: 'admin', icon: Eye },
  { featureKey: 'ADMIN_USERS', method: 'GET', pathPrefix: '/api/admin/users', label: '계정 조회', description: '가입된 사용자 계정 조회', category: 'admin', icon: Users },
  { featureKey: 'ROLE_ASSIGN', method: 'POST', pathPrefix: '/api/management/role/assign', label: '역할 배정', description: '사용자에게 역할 배정', category: 'admin', icon: ShieldAlert },
  { featureKey: 'ROLE_REVOKE', method: 'DELETE', pathPrefix: '/api/management/role/revoke', label: '역할 제거', description: '사용자에게서 역할 제거', category: 'admin', icon: UserMinus },
  { featureKey: 'ROLE_VIEW', method: 'GET', pathPrefix: '/api/management/role/get', label: '역할 조회', description: '사용자별 역할 조회', category: 'admin', icon: Shield },
  { featureKey: 'ROLE_DEFINE_CREATE', method: 'POST', pathPrefix: '/api/management/role/define', label: '역할 정의', description: '역할 정의 생성', category: 'admin', icon: ShieldAlert },
  { featureKey: 'ROLE_DEFINE_MODIFY', method: 'PATCH', pathPrefix: '/api/management/role/define/', label: '역할 정의 수정', description: '역할 정의 태그·설명 수정', category: 'admin', icon: PenLine },
  { featureKey: 'ROLE_DEFINE_DELETE', method: 'DELETE', pathPrefix: '/api/management/role/define/', label: '역할 정의 삭제', description: '역할 정의 삭제', category: 'admin', icon: TrashIcon },
  // Team
  { featureKey: 'GLOBAL_TEAM_CREATE', method: 'POST', pathPrefix: '/api/management/team', label: '팀 생성', description: '신규 팀 생성', category: 'admin', icon: Users2 },
  { featureKey: 'TEAM_VIEW', method: 'GET', pathPrefix: '/api/management/team', label: '팀 목록 조회', description: '모든 팀 정보 조회', category: 'admin', icon: Eye },
  { featureKey: 'TEAM_MANAGE', method: 'PATCH', pathPrefix: '/api/management/team/', label: '팀 설정 변경', description: '팀 이름·색상 등 설정 수정', category: 'admin', icon: SlidersHorizontal },
  { featureKey: 'TEAM_DELETE', method: 'DELETE', pathPrefix: '/api/management/team/', label: '팀 삭제', description: '팀 삭제', category: 'admin', icon: TrashIcon },
  { featureKey: 'TEAM_NOTICE', method: 'POST', pathPrefix: '/api/management/team/notice', label: '팀 공지 발송', description: '팀 대상 공지 발송', category: 'admin', icon: Megaphone },
  // Cache & System
  { featureKey: 'GLOBAL_CACHE_RELOAD_USER', method: 'POST', pathPrefix: '/api/management/role/reload', label: '사용자 캐시 새로고침', description: '특정 사용자의 역할 캐시 무효화', category: 'admin', icon: RefreshCw },
  { featureKey: 'GLOBAL_CACHE_RELOAD_ALL', method: 'POST', pathPrefix: '/api/management/role/reload/all', label: '전체 캐시 새로고침', description: '전체 역할 캐시 무효화', category: 'admin', icon: RefreshCw },
  { featureKey: 'GLOBAL_BACKUP_CREATE', method: 'POST', pathPrefix: '/api/management/backups', label: '백업 관리', description: '시스템 백업 관리', category: 'admin', icon: HardDrive },
  { featureKey: 'GLOBAL_BACKUP_RESTORE', method: 'POST', pathPrefix: '/api/management/backups/', label: '백업 복구', description: '특정 백업본 복구 요청', category: 'admin', icon: RotateCcw },
  { featureKey: 'GLOBAL_LOG_VIEW', method: 'GET', pathPrefix: '/api/management/log', label: '로그 조회', description: '시스템 운영 및 접속 로그 열람', category: 'admin', icon: ScrollText },
  // Account

  
  // Requests
  { featureKey: 'GLOBAL_REQUEST_VIEW', method: 'GET', pathPrefix: '/api/management/request/list', label: '문의사항 조회', description: '접수된 문의사항 전체 조회', category: 'request', icon: MailQuestion },
  { featureKey: 'GLOBAL_REQUEST_VIEW_DETAIL', method: 'GET', pathPrefix: '/api/management/request/', label: '문의사항 상세', description: '문의사항 상세 내용 조회', category: 'request', icon: FileText },
  { featureKey: 'REQUEST_POST', method: 'POST', pathPrefix: '/api/management/request/post', label: '문의 등록', description: '문의사항 등록', category: 'request', icon: MessageCircleQuestion },
];

/** 
 * Backend API 매칭 헬퍼 
 */
export function getMappedApiInfo(api: { method: string, path: string, featureKey?: string }) {
  // 1. featureKey 우선 매칭
  if (api.featureKey) {
    const match = API_PERMISSIONS.find(p => p.featureKey === api.featureKey);
    if (match) return match;
  }
  // 2. method + pathPrefix 매칭
  const matches = API_PERMISSIONS.filter(p => p.method === api.method && api.path.startsWith(p.pathPrefix));
  if (matches.length > 0) {
    // 가장 긴 pathPrefix (가장 구체적인) 매칭
    return matches.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];
  }
  
  // 3. 매칭 안될 경우 기본값 생성
  return {
    label: api.featureKey || api.path,
    description: '기타 API',
    category: 'admin' as FeatureCategory,
    icon: Database
  };
}
