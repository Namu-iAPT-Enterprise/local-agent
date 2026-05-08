// src/hooks/useNotices.ts
//
// 공지 목록을 비동기로 로드하고, 미열람·고정·URGENT 등을 계산해주는 훅.
//
// 사용처: NotificationBell (메인 헤더), NoticesModal, NoticeBoardPage (발송 관리).
//
// 상태: 'idle' | 'loading' | 'loaded' | 'error'
//   - idle    — 사용자 비로그인 등 호출 전
//   - loading — 첫 fetch 또는 reload 진행 중
//   - loaded  — 성공
//   - error   — 마지막 시도 실패 (data는 직전 성공 결과 유지)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listNotices, markNoticeRead, type NoticeResponse } from '../api/notice';

export type NoticesStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface UseNoticesResult {
  notices: NoticeResponse[];
  pinned: NoticeResponse[];
  unpinned: NoticeResponse[];
  unreadCount: number;
  hasUnreadUrgent: boolean;
  unreadUrgent: NoticeResponse[];
  status: NoticesStatus;
  error: string | null;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useNotices(enabled: boolean = true): UseNoticesResult {
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [status, setStatus]   = useState<NoticesStatus>('idle');
  const [error, setError]     = useState<string | null>(null);
  const inFlight = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus((prev) => (prev === 'loaded' ? 'loaded' : 'loading'));
    try {
      const data = await listNotices();
      setNotices(data);
      setStatus('loaded');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  }, [enabled]);

  // 최초 로드
  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const markRead = useCallback(async (id: string) => {
    // 낙관적 업데이트
    setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    try {
      await markNoticeRead(id);
    } catch {
      // 실패 시 다음 reload에서 정정
    }
  }, []);

  const sorted = useMemo(() => {
    const byDate = (a: NoticeResponse, b: NoticeResponse) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    return [...notices].sort(byDate);
  }, [notices]);

  const pinned   = useMemo(() => sorted.filter((n) => n.pinned),   [sorted]);
  const unpinned = useMemo(() => sorted.filter((n) => !n.pinned), [sorted]);

  const unreadCount     = useMemo(() => notices.filter((n) => n.unread).length, [notices]);
  const unreadUrgent    = useMemo(() => notices.filter((n) => n.unread && n.priority === 'URGENT'), [notices]);
  const hasUnreadUrgent = unreadUrgent.length > 0;

  return {
    notices: sorted,
    pinned,
    unpinned,
    unreadCount,
    hasUnreadUrgent,
    unreadUrgent,
    status,
    error,
    reload,
    markRead,
  };
}
