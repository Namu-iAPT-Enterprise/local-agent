import React from 'react';
import {
  Users, HardDrive, ScrollText,
  MessageSquare as ChatIcon, Upload, FolderOpen,
  BookPlus, FileEdit, Trash2 as TrashIcon,
  Megaphone, Bell, MailQuestion, Shield, Settings,
  Database, Server, ShieldAlert, FileText,
  BookOpen
} from 'lucide-react';

export type FeatureCategory = 'chat' | 'file' | 'knowledge' | 'notice' | 'admin' | 'request';

export interface AppFeatureDef {
  id: string; // Used for UI click handling
  label: string;
  description: string;
  category: FeatureCategory;
  icon: React.ElementType;
  adminOnly?: boolean;
  /** To check if this app should be enabled, check if user has AT LEAST ONE of these feature keys */
  requiredFeatureKeys: string[];
}

export const APP_FEATURES: AppFeatureDef[] = [
  { id: 'knowledge-manage', label: '지식 관리', description: '지식 RAG 등록 및 수정', category: 'knowledge', icon: BookOpen, requiredFeatureKeys: ['KNOWLEDGE_REGISTER', 'KNOWLEDGE_UPDATE', 'KNOWLEDGE_DELETE'] },
  { id: 'notice-role', label: '역할 공지', description: '특정 역할 대상 공지 발송', category: 'notice', icon: Megaphone, requiredFeatureKeys: ['NOTICE_SEND_ROLE'] },
  { id: 'notice-all', label: '전체 공지', description: '전체 사용자 공지 발송', category: 'notice', icon: Bell, requiredFeatureKeys: ['NOTICE_SEND_ALL'] },
  { id: 'admin-users', label: '계정 관리', description: '사용자 역할 관리', category: 'admin', icon: Users, adminOnly: true, requiredFeatureKeys: ['ADMIN_USERS'] },
  { id: 'admin-backup', label: '백업 관리', description: '시스템 백업 조회', category: 'admin', icon: HardDrive, adminOnly: true, requiredFeatureKeys: ['ADMIN_BACKUP'] },
  { id: 'admin-log', label: '로그 조회', description: '시스템 운영 로그', category: 'admin', icon: ScrollText, adminOnly: true, requiredFeatureKeys: ['ADMIN_LOG'] },
  { id: 'admin-requests', label: '문의사항', description: '사용자 문의사항 열람', category: 'request', icon: MailQuestion, adminOnly: true, requiredFeatureKeys: ['ADMIN_REQUESTS'] },
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
  { featureKey: 'FILE_UPLOAD', method: 'POST', pathPrefix: '/api/files', label: '파일 업로드', description: '파일 업로드', category: 'file', icon: Upload },
  { featureKey: 'FILE_VIEW', method: 'GET', pathPrefix: '/api/files', label: '파일 조회', description: '파일 목록 및 다운로드', category: 'file', icon: FolderOpen },
  
  // Knowledge
  { featureKey: 'KNOWLEDGE_REGISTER', method: 'POST', pathPrefix: '/api/knowledge', label: '지식 등록', description: '지식 RAG 항목 추가', category: 'knowledge', icon: BookPlus },
  { featureKey: 'KNOWLEDGE_UPDATE', method: 'PUT', pathPrefix: '/api/knowledge', label: '지식 수정', description: '기존 지식 RAG 항목 내용 수정', category: 'knowledge', icon: FileEdit },
  { featureKey: 'KNOWLEDGE_DELETE', method: 'DELETE', pathPrefix: '/api/knowledge', label: '지식 삭제', description: '지식 RAG 항목 삭제', category: 'knowledge', icon: TrashIcon },
  
  // Notice
  { featureKey: 'NOTICE_SEND_ROLE', method: 'POST', pathPrefix: '/api/notice', label: '역할 공지 발송', description: '특정 역할 대상 공지 발송', category: 'notice', icon: Megaphone },
  { featureKey: 'NOTICE_SEND_ALL', method: 'POST', pathPrefix: '/api/notice/all', label: '전체 공지 발송', description: '전체 사용자 대상 공지 발송', category: 'notice', icon: Bell },
  
  // Admin & Management
  { featureKey: 'ADMIN_USERS', method: 'GET', pathPrefix: '/api/admin/users', label: '계정 조회', description: '가입된 사용자 계정 조회', category: 'admin', icon: Users },
  { method: 'POST', pathPrefix: '/api/management/role', label: '권한 역할 등록', description: '새 사용자 권한(역할) 등록', category: 'admin', icon: ShieldAlert },
  { method: 'GET', pathPrefix: '/api/management/role', label: '권한 역할 조회', description: '사용자별 권한(역할) 상세 조회', category: 'admin', icon: Shield },
  { method: 'PATCH', pathPrefix: '/api/management/role', label: '권한 역할 수정', description: '사용자별 권한(역할) 덮어쓰기', category: 'admin', icon: ShieldAlert },
  { featureKey: 'ADMIN_BACKUP', method: 'GET', pathPrefix: '/api/backups', label: '백업 관리', description: '시스템 백업 목록 조회', category: 'admin', icon: HardDrive },
  { featureKey: 'ADMIN_LOG', method: 'GET', pathPrefix: '/api/log', label: '로그 조회', description: '시스템 운영 및 접속 로그 열람', category: 'admin', icon: ScrollText },
  
  // Requests
  { featureKey: 'ADMIN_REQUESTS', method: 'GET', pathPrefix: '/api/management/request/list', label: '문의사항 조회', description: '접수된 문의사항 전체 조회', category: 'request', icon: MailQuestion },
  { method: 'GET', pathPrefix: '/api/management/request/', label: '문의사항 상세', description: '문의사항 상세 내용 조회', category: 'request', icon: FileText },
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
