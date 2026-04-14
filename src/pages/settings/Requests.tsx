import React, { useState, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Inbox, ChevronRight, ArrowLeft,
  Clock, CheckCircle2, Tag, Terminal, AlignLeft, Database,
} from 'lucide-react';
import {
  fetchManagementRequests,
  fetchManagementRequest,
  type ManagementRequestResponse,
} from '../../api/gateway';

// ── 유틸 ────────────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// ── 상수 ────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ManagementRequestResponse['status'], { label: string; icon: React.ElementType; color: string }> = {
  PENDING:  { label: '대기 중',  icon: Clock,         color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  RESOLVED: { label: '처리 완료', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
};

// ── 목록 행 ──────────────────────────────────────────────────────────────────────

function RequestRow({
  req,
  onClick,
}: {
  req: ManagementRequestResponse;
  onClick: () => void;
}) {
  const s = STATUS_META[req.status];
  const SIcon = s.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-b-0 group"
    >
      {/* 상태 배지 */}
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold flex-shrink-0 ${s.color}`}>
        <SIcon size={9} />
        {s.label}
      </span>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
          {req.title ?? req.message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
          <span className="font-mono">{req.type}</span>
          <span>·</span>
          <span>{req.source}</span>
          <span>·</span>
          <span>{formatRelative(req.createdAt)}</span>
        </p>
      </div>

      {/* 화살표 */}
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0 transition-colors" />
    </button>
  );
}

// ── 상세 뷰 ──────────────────────────────────────────────────────────────────────

function RequestDetail({
  req,
  onBack,
}: {
  req: ManagementRequestResponse;
  onBack: () => void;
}) {
  const s = STATUS_META[req.status];
  const SIcon = s.icon;

  const fields: { icon: React.ElementType; label: string; value: string | undefined; mono?: boolean }[] = [
    { icon: Tag,       label: 'ID',       value: req.id,        mono: true },
    { icon: Terminal,  label: '유형',     value: req.type,      mono: true },
    { icon: Database,  label: '출처',     value: req.source,    mono: true },
    { icon: AlignLeft, label: '제목',     value: req.title },
    { icon: AlignLeft, label: '본문',     value: req.message },
    { icon: Database,  label: '메타데이터', value: req.metadata, mono: true },
    { icon: Clock,     label: '생성일시', value: formatDateTime(req.createdAt) },
  ];

  return (
    <div className="space-y-5">
      {/* 뒤로 + 상태 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          목록으로
        </button>
        <span className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${s.color}`}>
          <SIcon size={11} />
          {s.label}
        </span>
      </div>

      {/* 카드 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
        {fields.map(({ icon: Icon, label, value, mono }) => {
          if (!value) return null;
          return (
            <div key={label} className="px-5 py-3 flex gap-4">
              <div className="flex items-start gap-2 w-24 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 pt-0.5">
                <Icon size={12} className="mt-0.5 flex-shrink-0" />
                {label}
              </div>
              <p className={`flex-1 text-sm text-gray-800 dark:text-white break-all ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────────

type ViewState =
  | { mode: 'list' }
  | { mode: 'detail-loading'; id: string }
  | { mode: 'detail'; req: ManagementRequestResponse }
  | { mode: 'detail-error'; id: string; error: string };

export default function Requests() {
  const [items, setItems]         = useState<ManagementRequestResponse[]>([]);
  const [listStatus, setListStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [listError, setListError] = useState('');
  const [view, setView]           = useState<ViewState>({ mode: 'list' });

  // ── 목록 로드 ──────────────────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    setListStatus('loading');
    setListError('');
    try {
      const data = await fetchManagementRequests();
      // 최신순 정렬
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(data);
      setListStatus('loaded');
    } catch (e: unknown) {
      setListStatus('error');
      setListError(e instanceof Error ? e.message : '목록 조회 실패');
    }
  }, []);

  // 초기 로드
  const handleLoadClick = () => {
    if (listStatus !== 'loading') loadList();
  };

  // ── 상세 로드 ──────────────────────────────────────────────────────────────

  const handleSelectItem = async (req: ManagementRequestResponse) => {
    setView({ mode: 'detail-loading', id: req.id });
    try {
      const detail = await fetchManagementRequest(req.id);
      setView({ mode: 'detail', req: detail });
    } catch (e: unknown) {
      setView({ mode: 'detail-error', id: req.id, error: e instanceof Error ? e.message : '조회 실패' });
    }
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  const isDetailMode = view.mode !== 'list';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      {!isDetailMode && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">문의사항 관리</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              사용자가 보낸 요청·문의사항을 조회합니다. REQUEST_VIEW_ALL 권한이 필요합니다.
            </p>
          </div>
          <button
            onClick={handleLoadClick}
            disabled={listStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <RefreshCw size={13} className={listStatus === 'loading' ? 'animate-spin' : ''} />
            {listStatus === 'idle' ? '목록 불러오기' : '새로고침'}
          </button>
        </div>
      )}

      {/* ── 목록 뷰 ── */}
      {!isDetailMode && (
        <>
          {/* 미로드 상태 */}
          {listStatus === 'idle' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Inbox size={36} strokeWidth={1.2} />
              <p className="text-sm">상단의 "목록 불러오기"를 눌러 문의사항을 조회하세요.</p>
            </div>
          )}

          {/* 로딩 */}
          {listStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <RefreshCw size={28} strokeWidth={1.2} className="animate-spin" />
              <p className="text-sm">문의사항 목록을 불러오는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {listStatus === 'error' && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={15} />
              {listError}
            </div>
          )}

          {/* 빈 목록 */}
          {listStatus === 'loaded' && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Inbox size={36} strokeWidth={1.2} />
              <p className="text-sm">문의사항이 없습니다.</p>
            </div>
          )}

          {/* 목록 */}
          {listStatus === 'loaded' && items.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
              {/* 카운트 헤더 */}
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  총 {items.length}건
                </span>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={9} className="text-amber-500" />
                    대기 중: {items.filter(r => r.status === 'PENDING').length}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={9} className="text-emerald-500" />
                    처리 완료: {items.filter(r => r.status === 'RESOLVED').length}
                  </span>
                </div>
              </div>

              {items.map((req) => (
                <RequestRow key={req.id} req={req} onClick={() => handleSelectItem(req)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 상세 뷰 ── */}
      {view.mode === 'detail-loading' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <RefreshCw size={28} strokeWidth={1.2} className="animate-spin" />
          <p className="text-sm">문의사항을 불러오는 중...</p>
        </div>
      )}

      {view.mode === 'detail-error' && (
        <div className="space-y-4">
          <button
            onClick={() => setView({ mode: 'list' })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />목록으로
          </button>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={15} />
            {view.error}
          </div>
        </div>
      )}

      {view.mode === 'detail' && (
        <RequestDetail req={view.req} onBack={() => setView({ mode: 'list' })} />
      )}
    </div>
  );
}
