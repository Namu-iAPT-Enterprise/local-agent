// src/api/notice.ts
//
// 공지(Notice) 관리 서버 API 클라이언트.
// Management Server: /api/management/notice/**
//
// 데이터 모델 — 백엔드 NoticeResponse와 1:1.

import { API_BASE } from '../config/apiBase';
import { fetchWithAuth } from './auth';

// ── 타입 ───────────────────────────────────────────────────────────────────

export type NoticePriority = 'NORMAL' | 'URGENT';
export type NoticeTargetType = 'USER' | 'ROLE' | 'TEAM' | 'TEAM_ROLE' | 'GLOBAL';

export interface NoticeResponse {
  id: string;
  publisherId: string;
  title: string;
  contentHtml: string;
  priority: NoticePriority;
  targetType: NoticeTargetType;
  targetIds: string[];
  snapshotMode: boolean;
  pinned: boolean;
  pinnedTeamId: string | null;
  createdAt: string;
  updatedAt: string;
  /** 한 번이라도 편집되었으면 채워짐 — UI에서 "편집됨" 라벨 */
  editedAt: string | null;
  /** 사용자가 아직 읽지 않은 공지 (수정으로 read가 무효화된 경우 포함) */
  unread: boolean;
  /** 본인이 발행자이거나 GLOBAL_NOTICE 권한 보유 */
  editable: boolean;
}

export interface NoticeCreateRequest {
  title: string;
  contentHtml: string;
  priority: NoticePriority;
  targetType: NoticeTargetType;
  /** USER/ROLE/TEAM은 ID 배열, TEAM_ROLE은 "{teamId}:{roleId}" 페어, GLOBAL은 빈 배열 */
  targetIds: string[];
  snapshotMode: boolean;
  pinned: boolean;
  /** pinned=true & 팀 슬롯이면 teamId, 글로벌 슬롯이면 null */
  pinnedTeamId: string | null;
}

export interface NoticeUpdateRequest {
  title: string;
  contentHtml: string;
  priority: NoticePriority;
  targetType: NoticeTargetType;
  targetIds: string[];
  snapshotMode: boolean;
}

export interface NoticePinRequest {
  pinned: boolean;
  pinnedTeamId: string | null;
}

// ── API 호출 ────────────────────────────────────────────────────────────────

const BASE = `${API_BASE}/api/management/notice`;

export async function listNotices(): Promise<NoticeResponse[]> {
  const res = await fetchWithAuth(BASE);
  if (!res.ok) throw new Error(`공지 목록 조회 실패 (${res.status})`);
  return res.json();
}

export async function getNotice(id: string): Promise<NoticeResponse> {
  const res = await fetchWithAuth(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`공지 조회 실패 (${res.status})`);
  return res.json();
}

export async function createNotice(req: NoticeCreateRequest): Promise<NoticeResponse> {
  const res = await fetchWithAuth(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`공지 발행 실패 (${res.status})`);
  return res.json();
}

export async function updateNotice(id: string, req: NoticeUpdateRequest): Promise<NoticeResponse> {
  const res = await fetchWithAuth(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`공지 수정 실패 (${res.status})`);
  return res.json();
}

export async function deleteNotice(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`공지 삭제 실패 (${res.status})`);
}

export async function markNoticeRead(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/${encodeURIComponent(id)}/read`, { method: 'POST' });
  if (!res.ok) throw new Error(`읽음 처리 실패 (${res.status})`);
}

export async function pinNotice(id: string, req: NoticePinRequest): Promise<NoticeResponse> {
  const res = await fetchWithAuth(`${BASE}/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`공지 고정 실패 (${res.status})`);
  return res.json();
}
