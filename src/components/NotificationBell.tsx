import React, { useEffect, useState } from 'react';
import { Bell, RefreshCw, AlertTriangle, X, Pin, Pencil } from 'lucide-react';
import type { NoticeResponse } from '../api/notice';
import { useNotices } from '../hooks/useNotices';

/**
 * 메인 헤더에 노출되는 알람 벨.
 *
 * <ul>
 *   <li>미열람 공지 수 배지 (빨간 점 / 숫자)</li>
 *   <li>로딩 상태 — 벨 옆에 작은 스피너</li>
 *   <li>에러 상태 — 빨간 톤 + 재시도 안내</li>
 *   <li>클릭 시 모달 펼침. 고정 공지(상단) + 최신순 본문</li>
 *   <li>URGENT 미열람 1건이 있으면 세션당 1회 자동 팝업</li>
 *   <li>모달 안에 작은 새로고침 버튼</li>
 * </ul>
 */

const URGENT_AUTOPOPUP_FLAG = 'namu_urgent_notice_session_seen';

function urgentSessionFlagSeen(): boolean {
  return sessionStorage.getItem(URGENT_AUTOPOPUP_FLAG) === '1';
}
function markUrgentSessionFlagSeen() {
  sessionStorage.setItem(URGENT_AUTOPOPUP_FLAG, '1');
}

interface NotificationBellProps {
  /** 비로그인이면 false — 호출 차단 */
  enabled?: boolean;
  /** 사이드바와 톤을 맞추기 위한 위치 클래스 (선택) */
  className?: string;
}

export default function NotificationBell({ enabled = true, className = '' }: NotificationBellProps) {
  const {
    notices, pinned, unpinned, unreadCount, hasUnreadUrgent, unreadUrgent,
    status, error, reload, markRead,
  } = useNotices(enabled);

  const [open, setOpen]       = useState(false);
  const [urgentOpen, setUrgentOpen] = useState<NoticeResponse | null>(null);

  // 세션당 1회 URGENT 자동 팝업
  useEffect(() => {
    if (!hasUnreadUrgent) return;
    if (urgentSessionFlagSeen()) return;
    const first = unreadUrgent[0];
    if (first) {
      setUrgentOpen(first);
      markUrgentSessionFlagSeen();
    }
  }, [hasUnreadUrgent, unreadUrgent]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="공지 알림"
        className={`relative p-2 rounded-lg transition-colors
          ${open
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }
          ${status === 'error' ? 'text-red-500 dark:text-red-400' : ''}`}
      >
        <Bell size={18} />

        {status === 'loading' && (
          <span className="absolute -top-0.5 -right-0.5">
            <RefreshCw size={10} className="animate-spin text-gray-400" />
          </span>
        )}

        {status === 'loaded' && unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
            ${hasUnreadUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500 text-white'}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {status === 'error' && (
          <span className="absolute -top-0.5 -right-0.5">
            <AlertTriangle size={10} className="text-red-500" />
          </span>
        )}
      </button>

      {open && (
        <NoticesModal
          notices={notices}
          pinned={pinned}
          unpinned={unpinned}
          status={status}
          error={error}
          onClose={() => setOpen(false)}
          onReload={reload}
          onRead={markRead}
        />
      )}

      {urgentOpen && (
        <UrgentPopup
          notice={urgentOpen}
          onClose={() => setUrgentOpen(null)}
          onRead={markRead}
        />
      )}
    </div>
  );
}

// ── 공지 모달 ──────────────────────────────────────────────────────────────

interface NoticesModalProps {
  notices: NoticeResponse[];
  pinned: NoticeResponse[];
  unpinned: NoticeResponse[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
  onClose: () => void;
  onReload: () => Promise<void>;
  onRead: (id: string) => Promise<void>;
}

function NoticesModal({ notices, pinned, unpinned, status, error, onClose, onReload, onRead }: NoticesModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-14 right-4 z-50 w-[380px] max-h-[78vh] flex flex-col rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">공지</span>
            {status === 'loading' && <RefreshCw size={11} className="animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void onReload()}
              disabled={status === 'loading'}
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              title="새로고침"
            >
              <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {status === 'loading' && notices.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              <RefreshCw size={20} className="mx-auto animate-spin mb-2 text-gray-400" />
              불러오는 중…
            </div>
          ) : status === 'error' ? (
            <div className="p-6 text-center">
              <AlertTriangle size={20} className="mx-auto text-red-400 mb-2" />
              <p className="text-xs text-red-500 mb-2">공지를 불러오지 못했습니다.</p>
              {error && <p className="text-[10px] text-gray-400 mb-3">{error}</p>}
              <button
                onClick={() => void onReload()}
                className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                재시도
              </button>
            </div>
          ) : notices.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              <Bell size={22} className="mx-auto mb-2 text-gray-300" strokeWidth={1.2} />
              표시할 공지가 없습니다.
            </div>
          ) : (
            <div>
              {pinned.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Pin size={10} /> 고정
                  </div>
                  {pinned.map((n) => (
                    <NoticeRow key={n.id} notice={n} onRead={onRead} />
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                </div>
              )}
              {unpinned.map((n) => (
                <NoticeRow key={n.id} notice={n} onRead={onRead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── 공지 한 행 (펼침 가능) ─────────────────────────────────────────────────

interface NoticeRowProps {
  notice: NoticeResponse;
  onRead: (id: string) => Promise<void>;
}

function NoticeRow({ notice, onRead }: NoticeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const onToggle = () => {
    const next = !expanded;
    setExpanded(next);
    // 펼친 시점에 1회 read 처리
    if (next && notice.unread) void onRead(notice.id);
  };

  const isUrgent = notice.priority === 'URGENT';

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onToggle(); }}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800 ${
        notice.unread ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* 미열람 빨간 점 */}
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          notice.unread ? (isUrgent ? 'bg-red-600 animate-pulse' : 'bg-red-500') : 'bg-transparent'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isUrgent && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 flex items-center gap-0.5">
                <AlertTriangle size={9} /> 긴급
              </span>
            )}
            {notice.pinned && <Pin size={10} className="text-amber-500 flex-shrink-0" />}
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{notice.title}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
            <span>{notice.publisherId}</span>
            <span>·</span>
            <span>{formatTime(notice.createdAt)}</span>
            {notice.editedAt && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Pencil size={9}/>편집됨</span>
              </>
            )}
          </div>
          {expanded && (
            <div
              className="mt-2 notice-html notice-html-compact text-xs text-gray-700 dark:text-gray-200 break-words"
              // 서버에서 sanitize된 HTML — XSS 안전
              dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── URGENT 자동 팝업 ───────────────────────────────────────────────────────

interface UrgentPopupProps {
  notice: NoticeResponse;
  onClose: () => void;
  onRead: (id: string) => Promise<void>;
}

function UrgentPopup({ notice, onClose, onRead }: UrgentPopupProps) {
  const close = () => {
    void onRead(notice.id);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-red-300 dark:border-red-700 shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-red-500 text-white flex items-center gap-2">
          <AlertTriangle size={16} />
          <span className="text-sm font-bold">긴급 공지</span>
          <button onClick={close} className="ml-auto p-1 rounded hover:bg-red-600 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{notice.title}</h3>
          <p className="text-[11px] text-gray-400 mb-3">{notice.publisherId} · {formatTime(notice.createdAt)}</p>
          <div
            className="notice-html text-sm text-gray-700 dark:text-gray-200 break-words"
            dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={close}
              className="px-3 py-1.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return d.toLocaleDateString();
}
