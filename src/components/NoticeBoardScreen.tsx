import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Megaphone, Plus, RefreshCw, Trash2, Pin, PinOff, Pencil,
  AlertTriangle, Eye, X, Save, CheckCircle,
} from 'lucide-react';
import {
  createNotice, updateNotice, deleteNotice, pinNotice, listNotices,
  type NoticeResponse, type NoticeCreateRequest, type NoticePriority, type NoticeTargetType,
} from '../api/notice';
import { fetchRoleDefinitions, type RoleDefinitionDto } from '../api/gateway';

interface NoticeBoardScreenProps {
  onBack: () => void;
  /** 사용자가 보유한 권한 태그 — UI 상의 발행 가능 대상 결정 */
  permissionTags: string[];
}

type FilterMode = 'mine' | 'all';

/**
 * 공지 발송 관리 페이지 — 커뮤니티/카페 스타일.
 *
 * <ul>
 *   <li>좌측: 공지 목록. 권한에 따라 mine(내 게시글) / all(전체 — GLOBAL_NOTICE 한정) 토글</li>
 *   <li>우측: 작성/수정 폼 — HTML 에디터(textarea + 라이브 프리뷰), 우선순위, 대상 선택, 스냅샷 토글, 고정 토글</li>
 *   <li>대상 옵션은 권한에 따라 동적: TEAM_NOTICE_OWN은 자기 팀/팀:역할만, GLOBAL_NOTICE는 모든 옵션</li>
 *   <li>비동기 — 로딩 중 스피너, 성공/실패 토스트</li>
 * </ul>
 */
export default function NoticeBoardScreen({ onBack, permissionTags }: NoticeBoardScreenProps) {
  const isGlobal  = permissionTags.includes('GLOBAL_NOTICE');
  const isTeamOwn = permissionTags.includes('TEAM_NOTICE_OWN');

  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [filter, setFilter]   = useState<FilterMode>(isGlobal ? 'all' : 'mine');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<NoticeResponse | null>(null);
  const [creating, setCreating] = useState(false);

  const [roleDefs, setRoleDefs] = useState<RoleDefinitionDto[]>([]);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotices();
      setNotices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // 역할 정의는 옵션 셀렉트 구성용 — 실패해도 무시
    fetchRoleDefinitions().then(setRoleDefs).catch(() => { /* 무시 */ });
  }, []);

  const visible = useMemo(() => {
    if (filter === 'mine') return notices.filter((n) => n.editable);
    return notices;
  }, [notices, filter]);

  const handleCreate = async (req: NoticeCreateRequest) => {
    try {
      const created = await createNotice(req);
      setNotices((prev) => [created, ...prev]);
      setCreating(false);
      showToast('ok', '공지가 발행되었습니다.');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : String(e));
    }
  };

  const handleUpdate = async (id: string, req: NoticeCreateRequest) => {
    try {
      const updated = await updateNotice(id, {
        title: req.title,
        contentHtml: req.contentHtml,
        priority: req.priority,
        targetType: req.targetType,
        targetIds: req.targetIds,
        snapshotMode: req.snapshotMode,
      });
      setNotices((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditing(null);
      showToast('ok', '수정되었습니다. 수신자 빨간 점이 부활합니다.');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 공지를 삭제하시겠습니까? 모든 사용자에게 즉시 비공개됩니다.')) return;
    try {
      await deleteNotice(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      if (editing?.id === id) setEditing(null);
      showToast('ok', '삭제되었습니다.');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : String(e));
    }
  };

  const handlePinToggle = async (n: NoticeResponse, teamId: string | null) => {
    try {
      const updated = await pinNotice(n.id, { pinned: !n.pinned, pinnedTeamId: !n.pinned ? teamId : null });
      setNotices((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      showToast('ok', updated.pinned ? '고정되었습니다.' : '고정이 해제되었습니다.');
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : String(e));
    }
  };

  const canPublish = isGlobal || isTeamOwn;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <Megaphone size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">공지 발송</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void reload()}
            disabled={loading}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            title="새로고침"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {canPublish && !creating && !editing && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              <Plus size={13} /> 새 공지
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left list */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col min-h-0">
          {/* Filter tabs (only when GLOBAL_NOTICE) */}
          {isGlobal && (
            <div className="flex p-2 gap-1 border-b border-gray-200 dark:border-gray-800">
              <FilterTab active={filter === 'all'}  onClick={() => setFilter('all')}  label="전체 공지" />
              <FilterTab active={filter === 'mine'} onClick={() => setFilter('mine')} label="내 공지" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading && visible.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <RefreshCw size={18} className="mx-auto animate-spin mb-2" />
                불러오는 중…
              </div>
            ) : error ? (
              <div className="p-6 text-center text-xs text-red-500">
                <AlertTriangle size={18} className="mx-auto mb-2" />
                {error}
              </div>
            ) : visible.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                표시할 공지가 없습니다.
              </div>
            ) : (
              visible.map((n) => (
                <ListRow
                  key={n.id}
                  notice={n}
                  active={editing?.id === n.id}
                  onSelect={() => { setCreating(false); setEditing(n); }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right pane */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {creating ? (
            <NoticeForm
              key="new"
              mode="create"
              isGlobal={isGlobal}
              isTeamOwn={isTeamOwn}
              roleDefs={roleDefs}
              onCancel={() => setCreating(false)}
              onSubmit={handleCreate}
            />
          ) : editing ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{editing.id}</span>
                <div className="flex items-center gap-1">
                  {editing.editable && (
                    <button
                      onClick={() => handlePinToggle(editing, null)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-colors ${
                        editing.pinned
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {editing.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                      {editing.pinned ? '고정 해제' : '글로벌 고정'}
                    </button>
                  )}
                  {editing.editable && (
                    <button
                      onClick={() => handleDelete(editing.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors"
                    >
                      <Trash2 size={11} /> 삭제
                    </button>
                  )}
                  <button onClick={() => setEditing(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {editing.editable ? (
                <NoticeForm
                  key={editing.id}
                  mode="edit"
                  initial={editing}
                  isGlobal={isGlobal}
                  isTeamOwn={isTeamOwn}
                  roleDefs={roleDefs}
                  onCancel={() => setEditing(null)}
                  onSubmit={(req) => handleUpdate(editing.id, req)}
                />
              ) : (
                <ReadOnlyView notice={editing} />
              )}
            </div>
          ) : (
            <Placeholder canPublish={canPublish} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg border ${
            toast.kind === 'ok'
              ? 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-red-500 dark:text-red-300'
          } text-xs`}
        >
          {toast.kind === 'ok' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

// ── 좌측 행 ────────────────────────────────────────────────────────────────

interface ListRowProps {
  notice: NoticeResponse;
  active: boolean;
  onSelect: () => void;
}
function ListRow({ notice, active, onSelect }: ListRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800 ${
        active
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {notice.priority === 'URGENT' && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">긴급</span>
        )}
        {notice.pinned && <Pin size={10} className="text-amber-500" />}
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{notice.title}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span>{notice.publisherId}</span>
        <span>·</span>
        <span>{notice.targetType}</span>
        {notice.editedAt && <><span>·</span><span className="flex items-center gap-0.5"><Pencil size={9}/>편집됨</span></>}
      </div>
    </div>
  );
}

// ── 우측 폼 ────────────────────────────────────────────────────────────────

interface NoticeFormProps {
  mode: 'create' | 'edit';
  initial?: NoticeResponse;
  isGlobal: boolean;
  isTeamOwn: boolean;
  roleDefs: RoleDefinitionDto[];
  onCancel: () => void;
  onSubmit: (req: NoticeCreateRequest) => Promise<void> | void;
}

function NoticeForm({ mode, initial, isGlobal, isTeamOwn, roleDefs, onCancel, onSubmit }: NoticeFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [html, setHtml]   = useState(initial?.contentHtml ?? '');
  const [priority, setPriority] = useState<NoticePriority>(initial?.priority ?? 'NORMAL');
  const [targetType, setTargetType] = useState<NoticeTargetType>(initial?.targetType ?? (isGlobal ? 'GLOBAL' : 'TEAM'));
  const [targetIdsRaw, setTargetIdsRaw] = useState<string>((initial?.targetIds ?? []).join(','));
  const [snapshot, setSnapshot] = useState<boolean>(initial?.snapshotMode ?? false);
  const [pinned, setPinned] = useState<boolean>(initial?.pinned ?? false);
  const [pinnedTeamId, setPinnedTeamId] = useState<string | null>(initial?.pinnedTeamId ?? null);
  const [submitting, setSubmitting] = useState(false);

  // 권한자에 따른 타겟 옵션 제한
  const allowedTargetTypes: NoticeTargetType[] = useMemo(() => {
    if (isGlobal) return ['GLOBAL', 'USER', 'ROLE', 'TEAM', 'TEAM_ROLE'];
    if (isTeamOwn) return ['TEAM', 'TEAM_ROLE'];
    return [];
  }, [isGlobal, isTeamOwn]);

  // 사용자가 권한이 부족한 타입을 선택해뒀다면 첫 옵션으로 보정
  useEffect(() => {
    if (!allowedTargetTypes.includes(targetType) && allowedTargetTypes.length > 0) {
      setTargetType(allowedTargetTypes[0] ?? 'GLOBAL');
    }
  }, [allowedTargetTypes, targetType]);

  const targetIds = useMemo(
    () => targetIdsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    [targetIdsRaw],
  );

  const teams = useMemo(() => {
    const set = new Set<string>();
    roleDefs.forEach((r) => { if (r.teamId) set.add(r.teamId); });
    return Array.from(set).sort();
  }, [roleDefs]);

  const submit = async () => {
    if (!title.trim()) { window.alert('제목을 입력하세요.'); return; }
    if (targetType !== 'GLOBAL' && targetIds.length === 0) {
      window.alert('대상 ID를 1개 이상 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        contentHtml: html,
        priority,
        targetType,
        targetIds: targetType === 'GLOBAL' ? [] : targetIds,
        snapshotMode: snapshot,
        pinned,
        pinnedTeamId: pinned ? pinnedTeamId : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const helpForType: Record<NoticeTargetType, string> = {
    USER:      '사용자 ID들 — 콤마로 구분',
    ROLE:      '역할 ID들 — 콤마로 구분',
    TEAM:      '팀 ID들 — 콤마로 구분',
    TEAM_ROLE: '"teamId:roleId" 페어 — 콤마로 구분',
    GLOBAL:    '대상 입력 불필요 (모든 사용자)',
  };

  return (
    <div className="max-w-3xl">
      <div className="text-xs text-gray-500 mb-2">{mode === 'create' ? '새 공지 발행' : '공지 수정'}</div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full px-3 py-2 mb-3 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:border-amber-400"
      />

      {/* HTML editor + preview */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">본문 (HTML)</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            placeholder="<p>HTML 본문을 직접 작성하세요. 위험한 태그는 서버에서 제거됩니다.</p>"
            className="w-full px-3 py-2 text-xs font-mono rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block flex items-center gap-1"><Eye size={11}/> 미리보기 (sanitize 전)</label>
          <div
            className="w-full h-[218px] overflow-y-auto px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 prose prose-sm dark:prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: html || '<em class="text-gray-400">본문 미리보기</em>' }}
          />
        </div>
      </div>

      {/* Settings row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">우선순위</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as NoticePriority)}
            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="NORMAL">일반 (NORMAL)</option>
            <option value="URGENT">긴급 (URGENT — 자동 팝업)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">대상 타입</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as NoticeTargetType)}
            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            {allowedTargetTypes.map((t) => (
              <option key={t} value={t}>{labelForTargetType(t)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Target IDs */}
      {targetType !== 'GLOBAL' && (
        <div className="mb-3">
          <label className="text-[11px] text-gray-500 mb-1 block">{helpForType[targetType]}</label>
          <input
            value={targetIdsRaw}
            onChange={(e) => setTargetIdsRaw(e.target.value)}
            placeholder={
              targetType === 'TEAM_ROLE'
                ? 'TEAM_A:LEAD, TEAM_B:MEMBER'
                : targetType === 'USER'
                  ? 'user1, user2, user3'
                  : 'A, B, C'
            }
            className="w-full px-3 py-2 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          />
        </div>
      )}

      {/* Toggles */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-700 dark:text-gray-300">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={snapshot} onChange={(e) => setSnapshot(e.target.checked)} />
          <span>스냅샷 발송 (발송 시점에 사용자 목록 박제)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <span>상단 고정</span>
        </label>
        {pinned && (
          <select
            value={pinnedTeamId ?? ''}
            onChange={(e) => setPinnedTeamId(e.target.value || null)}
            className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="">글로벌 슬롯 (시스템 2개)</option>
            {teams.map((t) => (
              <option key={t} value={t}>팀 {t} 슬롯 (1개)</option>
            ))}
          </select>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
          {mode === 'create' ? '발행' : '저장'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ReadOnlyView({ notice }: { notice: NoticeResponse }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{notice.title}</h2>
      <div className="text-[11px] text-gray-400 mb-4">
        {notice.publisherId} · {new Date(notice.createdAt).toLocaleString()} · {notice.targetType}
      </div>
      <div
        className="prose prose-sm dark:prose-invert max-w-none break-words"
        dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
      />
    </div>
  );
}

function Placeholder({ canPublish }: { canPublish: boolean }) {
  return (
    <div className="h-full flex items-center justify-center text-center">
      <div className="text-gray-400">
        <Megaphone size={32} strokeWidth={1.2} className="mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">왼쪽 목록에서 공지를 선택하세요.</p>
        {canPublish && <p className="text-xs">또는 우상단 "새 공지" 버튼을 눌러 새 글을 작성합니다.</p>}
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

function labelForTargetType(t: NoticeTargetType): string {
  switch (t) {
    case 'USER':      return '특정 사용자';
    case 'ROLE':      return '특정 역할';
    case 'TEAM':      return '특정 팀';
    case 'TEAM_ROLE': return '특정 팀의 역할';
    case 'GLOBAL':    return '전체';
  }
}
