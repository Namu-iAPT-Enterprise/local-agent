import React, { useState, useRef, useCallback } from 'react';
import { API_BASE } from '../config/apiBase';
import {
  ShieldAlert, Play, RotateCcw, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Loader2, Terminal, ArrowLeft,
  User, Lock, Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Credential { userId: string; password: string; }

interface TestStep {
  label: string;
  actor: 'admin' | 'attacker';
  method: string;
  path: string;
  body?: Record<string, unknown>;
  /** 기대 HTTP 상태 코드 (배열이면 OR) */
  expected: number | number[];
  /** should-block: 공격 차단 확인 / should-pass: 정상 통과 확인 / info: 설정/정리 */
  role: 'should-block' | 'should-pass' | 'info';
  note?: string;
}

interface Scenario {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  description: string;
  steps: TestStep[];
}

interface StepResult {
  status: number;
  body: unknown;
  durationMs: number;
  pass: boolean;
  skipped?: boolean;
}

interface ScenarioResult {
  scenarioId: string;
  steps: StepResult[];
  pass: boolean;
}

// ── 시나리오 정의 ──────────────────────────────────────────────────────────────

function buildScenarios(): Scenario[] {
  const TEAM   = 'ATTACK_TEST_TEAM';
  const TEAM_B = 'ATTACK_OTHER_TEAM';
  const LIMITED = 'ATK_LIMITED';       // attacker's role: ROLE_MODIFY_OWN + ROLE_ASSIGN_OWN + CHAT_MESSAGE
  const TARGET_A = 'ATK_TARGET_A';    // 같은 팀, manageableBy 없음
  const TARGET_B = 'ATK_TARGET_B';    // 같은 팀, manageableBy: [LIMITED]
  const OTHER_ROLE = 'ATK_OTHER_ROLE';// 다른 팀 역할

  return [
    // ── 시나리오 1 ─────────────────────────────────────────────────────────────
    {
      id: 's1',
      title: 'GLOBAL 태그 밀수',
      category: '권한 상승',
      categoryColor: 'text-red-400',
      description: 'ROLE_MODIFY_OWN만 가진 공격자가 GLOBAL 스코프 태그를 역할에 끼워넣으려 시도합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '타깃 역할 생성 (같은 팀)', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: TARGET_B, teamId: TEAM, displayName: '테스트 타깃 B', permissionTagIds: ['CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['ROLE_MODIFY_OWN', 'ROLE_ASSIGN_OWN', 'ROLE_CREATE_OWN', 'CHAT_MESSAGE'], manageableByRoleIds: [LIMITED] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: GLOBAL_TEAM_DELETE 태그 끼워넣기',
          actor: 'attacker',
          method: 'PATCH',
          path: `/api/management/role/define/${TARGET_B}`,
          body: { permissionTagIds: ['CHAT_MESSAGE', 'GLOBAL_TEAM_DELETE'] },
          expected: 403,
          role: 'should-block',
          note: 'GLOBAL_ROLE_PERMISSION_ASSIGN 없으므로 차단되어야 함',
        },
        { label: '정리: 역할 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${TARGET_B}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 역할 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 2 ─────────────────────────────────────────────────────────────
    {
      id: 's2',
      title: '다른 팀 역할 무단 수정',
      category: '권한 상승',
      categoryColor: 'text-red-400',
      description: 'ROLE_MODIFY_OWN만 가진 공격자가 소속되지 않은 팀의 역할을 수정하려 시도합니다.',
      steps: [
        { label: '공격자 팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격자 팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '피해자 팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM_B, name: '피해자 팀', color: '#3498db' }, expected: [200, 201, 409], role: 'info' },
        { label: '피해자 팀 역할 생성', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: OTHER_ROLE, teamId: TEAM_B, displayName: '피해 역할', permissionTagIds: ['CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성 (TEAM 소속)', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['ROLE_MODIFY_OWN', 'CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: 피해자 팀 역할 수정',
          actor: 'attacker',
          method: 'PATCH',
          path: `/api/management/role/define/${OTHER_ROLE}`,
          body: { displayName: '해킹됨', permissionTagIds: ['CHAT_MESSAGE', 'FILE_UPLOAD'] },
          expected: 403,
          role: 'should-block',
          note: '자기 팀(TEAM)에 대한 권한만 있으므로 차단되어야 함',
        },
        { label: '정리: 역할들 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${OTHER_ROLE}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 역할 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM_B}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 3 ─────────────────────────────────────────────────────────────
    {
      id: 's3',
      title: 'manageableBy 우회 — 미등록 역할 배정',
      category: 'manageableBy',
      categoryColor: 'text-amber-400',
      description: 'ROLE_ASSIGN_OWN이 있어도 manageableBy에 등록되지 않은 역할은 배정할 수 없어야 합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '타깃 역할 생성 (manageableBy 없음)', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: TARGET_A, teamId: TEAM, displayName: '타깃 A', permissionTagIds: ['CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['ROLE_ASSIGN_OWN', 'CHAT_MESSAGE'], manageableByRoleIds: [LIMITED] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: manageableBy 없는 역할 배정 시도',
          actor: 'attacker',
          method: 'POST',
          path: `/api/management/role/assign`,
          body: { userId: '__ATTACKER__', roleId: TARGET_A },
          expected: 403,
          role: 'should-block',
          note: 'ROLE_ASSIGN_OWN이 있어도 manageableBy 미등록이면 차단',
        },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${TARGET_A}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 4 ─────────────────────────────────────────────────────────────
    {
      id: 's4',
      title: '우선순위 자멸 방지 — 동급 역할 삭제',
      category: '자멸 방지',
      categoryColor: 'text-violet-400',
      description: '팀 내에서 자신의 역할과 동급(priority) 또는 상위 역할을 삭제할 수 없어야 합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성 (priority 자동 배정)', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['ROLE_DELETE_OWN', 'CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '동급 타깃 역할 생성', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: TARGET_A, teamId: TEAM, displayName: '동급 타깃', permissionTagIds: ['CHAT_MESSAGE'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '우선순위 동일하게 재정렬', actor: 'admin', method: 'PATCH', path: `/api/management/role/define/reorder?teamId=${TEAM}`, body: [LIMITED, TARGET_A], expected: [200, 204], role: 'info', note: 'LIMITED와 TARGET_A를 priority=1, 2로 설정' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: 자신보다 높은(낮은 priority) TARGET_A 삭제 시도',
          actor: 'attacker',
          method: 'DELETE',
          path: `/api/management/role/define/${LIMITED}`,
          expected: 400,
          role: 'should-block',
          note: '본인 역할(priority=1)과 동급이므로 차단되어야 함',
        },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${TARGET_A}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 5 ─────────────────────────────────────────────────────────────
    {
      id: 's5',
      title: '셀프 GLOBAL 권한 부트스트랩',
      category: '권한 상승',
      categoryColor: 'text-red-400',
      description: '자신의 역할에 GLOBAL_ROLE_PERMISSION_ASSIGN을 셀프 부여하여 권한을 올리려 시도합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['ROLE_MODIFY_OWN', 'CHAT_MESSAGE'], manageableByRoleIds: [LIMITED] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: 본인 역할에 GLOBAL_ROLE_PERMISSION_ASSIGN 추가',
          actor: 'attacker',
          method: 'PATCH',
          path: `/api/management/role/define/${LIMITED}`,
          body: { permissionTagIds: ['ROLE_MODIFY_OWN', 'CHAT_MESSAGE', 'GLOBAL_ROLE_PERMISSION_ASSIGN'] },
          expected: 403,
          role: 'should-block',
          note: 'GLOBAL 태그 포함 시도 → GLOBAL_ROLE_PERMISSION_ASSIGN 없으므로 차단',
        },
        {
          label: '검증: 역할 조회 — 태그가 변경되지 않았는지 확인',
          actor: 'admin',
          method: 'GET',
          path: `/api/management/role/define/${LIMITED}`,
          expected: 200,
          role: 'should-pass',
          note: 'permissionTagIds에 GLOBAL_ROLE_PERMISSION_ASSIGN이 없어야 함',
        },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 6 ─────────────────────────────────────────────────────────────
    {
      id: 's6',
      title: '캐시 일관성 — 태그 제거 후 즉시 차단',
      category: '캐시 일관성',
      categoryColor: 'text-sky-400',
      description: '역할에서 태그를 제거한 후 캐시가 즉시 무효화되어 다음 요청이 차단되는지 확인합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자 역할 생성 (FILE_UPLOAD 포함)', actor: 'admin', method: 'POST', path: `/api/management/role/define`, body: { roleId: LIMITED, teamId: TEAM, displayName: '제한된 역할', permissionTagIds: ['CHAT_MESSAGE', 'FILE_UPLOAD'], manageableByRoleIds: [] }, expected: [200, 201, 409], role: 'info' },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '✅ 태그 제거 전: 권한 확인 (FILE_UPLOAD 있음)',
          actor: 'attacker',
          method: 'GET',
          path: `/api/role/profile`,
          expected: 200,
          role: 'should-pass',
          note: 'permissionTags에 FILE_UPLOAD가 포함되어 있어야 함',
        },
        { label: '관리자: 역할에서 FILE_UPLOAD 태그 제거', actor: 'admin', method: 'PATCH', path: `/api/management/role/define/${LIMITED}`, body: { permissionTagIds: ['CHAT_MESSAGE'] }, expected: [200, 204], role: 'info', note: '이 시점에 캐시가 자동 evict되어야 함' },
        {
          label: '🔴 태그 제거 후: 프로필 재조회 — FILE_UPLOAD 없어야 함',
          actor: 'attacker',
          method: 'GET',
          path: `/api/role/profile`,
          expected: 200,
          role: 'should-pass',
          note: '응답 body의 permissionTags에 FILE_UPLOAD가 없어야 함 (캐시 evict 확인)',
        },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },

    // ── 시나리오 7 ─────────────────────────────────────────────────────────────
    {
      id: 's7',
      title: 'ORIGIN 역할 직접 배정 시도',
      category: 'manageableBy',
      categoryColor: 'text-amber-400',
      description: 'GLOBAL_ROLE_ASSIGN이 있어도 manageableBy에 없는 ORIGIN은 배정할 수 없어야 합니다.',
      steps: [
        { label: '팀 생성', actor: 'admin', method: 'POST', path: `/api/management/team`, body: { teamId: TEAM, name: '공격 테스트팀', color: '#e74c3c' }, expected: [200, 201, 409], role: 'info' },
        {
          label: '공격자 역할 생성 (GLOBAL_ROLE_ASSIGN 포함)',
          actor: 'admin',
          method: 'POST',
          path: `/api/management/role/define`,
          body: { roleId: LIMITED, teamId: TEAM, displayName: '전역 배정자', permissionTagIds: ['GLOBAL_ROLE_ASSIGN', 'CHAT_MESSAGE'], manageableByRoleIds: [] },
          expected: [200, 201, 409],
          role: 'info',
          note: '이 역할은 GLOBAL_ 태그를 포함하므로 GLOBAL 팀이 아니면 자동 제거됨 — 해당 동작도 확인',
        },
        { label: '공격자에게 역할 배정', actor: 'admin', method: 'POST', path: `/api/management/role/assign`, body: { userId: '__ATTACKER__', roleId: LIMITED }, expected: [200, 201], role: 'info' },
        {
          label: '🔴 공격: 피해자에게 ORIGIN 역할 배정 시도',
          actor: 'attacker',
          method: 'POST',
          path: `/api/management/role/assign`,
          body: { userId: '__ATTACKER__', roleId: 'ORIGIN' },
          expected: 403,
          role: 'should-block',
          note: 'GLOBAL_ROLE_ASSIGN이 있어도 manageableBy에 없으면 차단. 또한 비-GLOBAL팀 역할에서 GLOBAL 태그가 자동 제거되었다면 GLOBAL_ROLE_ASSIGN 자체도 없음',
        },
        { label: '정리', actor: 'admin', method: 'DELETE', path: `/api/management/role/define/${LIMITED}`, expected: [200, 204, 404], role: 'info' },
        { label: '정리: 팀 삭제', actor: 'admin', method: 'DELETE', path: `/api/management/team/${TEAM}`, expected: [200, 204, 404], role: 'info' },
      ],
    },
  ];
}

// ── API 헬퍼 ──────────────────────────────────────────────────────────────────

async function apiLogin(userId: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
  if (!res.ok) throw new Error(`로그인 실패 (${res.status}): ${userId}`);
  const data = await res.json();
  return data.accessToken as string;
}

async function apiCall(
  token: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: unknown; durationMs: number }> {
  const start = Date.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const durationMs = Date.now() - start;
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* raw text */ }
  return { status: res.status, body: parsed, durationMs };
}

// ── 로그 항목 타입 ────────────────────────────────────────────────────────────

type LogEntry =
  | { type: 'scenario-header'; scenarioId: string; title: string; category: string }
  | { type: 'step-req';   stepLabel: string; actor: 'admin' | 'attacker'; method: string; path: string; body?: unknown }
  | { type: 'step-res';   stepLabel: string; status: number; body: unknown; durationMs: number; pass: boolean; role: TestStep['role']; expected: number | number[] }
  | { type: 'scenario-result'; pass: boolean; passed: number; total: number }
  | { type: 'summary'; passed: number; total: number }
  | { type: 'error'; message: string }
  | { type: 'divider' };

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function SecurityTestPage({ onBack }: { onBack?: () => void }) {
  const [adminCred, setAdminCred]       = useState<Credential>({ userId: 'admin', password: '' });
  const [attackerCred, setAttackerCred] = useState<Credential>({ userId: '', password: '' });
  const [running, setRunning]           = useState(false);
  const [logs, setLogs]                 = useState<LogEntry[]>([]);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const scenarios = buildScenarios();

  const pushLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const isExpected = (status: number, expected: number | number[]) =>
    Array.isArray(expected) ? expected.includes(status) : status === expected;

  const toggleScenario = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const runScenarios = useCallback(async () => {
    if (!adminCred.password || !attackerCred.userId || !attackerCred.password) return;
    setRunning(true);
    setLogs([]);

    const toRun = selectedIds.size > 0
      ? scenarios.filter(s => selectedIds.has(s.id))
      : scenarios;

    let adminToken = '';
    let attackerToken = '';

    try {
      adminToken    = await apiLogin(adminCred.userId, adminCred.password);
      attackerToken = await apiLogin(attackerCred.userId, attackerCred.password);
    } catch (e) {
      pushLog({ type: 'error', message: String(e) });
      setRunning(false);
      return;
    }

    let totalPass = 0;
    let totalScenarios = 0;

    for (const scenario of toRun) {
      totalScenarios++;
      pushLog({ type: 'scenario-header', scenarioId: scenario.id, title: scenario.title, category: scenario.category });

      let scenarioPass = true;
      let blockPassed = 0;
      let blockTotal  = 0;

      for (const step of scenario.steps) {
        const token = step.actor === 'admin' ? adminToken : attackerToken;
        // attacker 경로에서 __ATTACKER__ 치환
        const path = step.path;
        const body = step.body
          ? JSON.parse(JSON.stringify(step.body).replace(/__ATTACKER__/g, attackerCred.userId))
          : undefined;

        pushLog({ type: 'step-req', stepLabel: step.label, actor: step.actor, method: step.method, path, body });

        const { status, body: resBody, durationMs } = await apiCall(token, step.method, path, body);
        const pass = isExpected(status, step.expected);

        if (step.role !== 'info') {
          blockTotal++;
          if (pass) blockPassed++;
          else scenarioPass = false;
        }

        pushLog({ type: 'step-res', stepLabel: step.label, status, body: resBody, durationMs, pass, role: step.role, expected: step.expected });
        await new Promise(r => setTimeout(r, 200));
      }

      pushLog({ type: 'scenario-result', pass: scenarioPass, passed: blockPassed, total: blockTotal });
      if (scenarioPass) totalPass++;
      pushLog({ type: 'divider' });
    }

    pushLog({ type: 'summary', passed: totalPass, total: totalScenarios });
    setRunning(false);
  }, [adminCred, attackerCred, selectedIds, scenarios, pushLog]);

  // ── 렌더 헬퍼 ──────────────────────────────────────────────────────────────

  const statusColor = (status: number) => {
    if (status < 300) return 'text-emerald-400';
    if (status < 400) return 'text-sky-400';
    if (status < 500) return 'text-amber-400';
    return 'text-red-400';
  };

  const methodColor: Record<string, string> = {
    GET: 'text-sky-300', POST: 'text-emerald-300',
    PATCH: 'text-amber-300', DELETE: 'text-red-300',
  };

  const renderBody = (body: unknown): string => {
    if (typeof body === 'string') return body.length > 300 ? body.slice(0, 300) + '…' : body;
    const s = JSON.stringify(body, null, 2);
    return s.length > 500 ? s.slice(0, 500) + '\n…' : s;
  };

  const renderLog = (entry: LogEntry, idx: number) => {
    switch (entry.type) {

      case 'scenario-header':
        return (
          <div key={idx} className="mt-4 mb-1">
            <span className="text-gray-500 text-xs font-mono mr-2">▶▶</span>
            <span className="text-white font-bold">{entry.title}</span>
            <span className="ml-2 text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{entry.category}</span>
          </div>
        );

      case 'step-req': {
        const isOpen = expanded[`${idx}-req`];
        const hasBody = entry.body !== undefined;
        return (
          <div key={idx} className="ml-4 mt-1.5">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => hasBody && setExpanded(p => ({ ...p, [`${idx}-req`]: !isOpen }))}
            >
              <span className="text-gray-600 font-mono text-xs w-4">{hasBody ? (isOpen ? '▾' : '▸') : ' '}</span>
              <span className={`text-[10px] font-bold font-mono w-14 ${entry.actor === 'admin' ? 'text-sky-400' : 'text-rose-400'}`}>
                [{entry.actor === 'admin' ? 'ADMIN' : 'ATTKR'}]
              </span>
              <span className={`font-mono text-xs font-bold w-14 ${methodColor[entry.method] ?? 'text-gray-400'}`}>{entry.method}</span>
              <span className="font-mono text-xs text-gray-300">{entry.path}</span>
            </div>
            {isOpen && hasBody && (
              <pre className="ml-6 mt-1 text-[10px] text-gray-400 font-mono bg-gray-900 rounded p-2 overflow-x-auto">
                {renderBody(entry.body)}
              </pre>
            )}
          </div>
        );
      }

      case 'step-res': {
        const isOpen = expanded[`${idx}-res`];
        const roleLabel = entry.role === 'should-block' ? '🚫 BLOCK' : entry.role === 'should-pass' ? '✅ PASS' : null;
        const expectedArr = Array.isArray(entry.expected) ? entry.expected : [entry.expected];
        return (
          <div key={idx} className="ml-4 mt-0.5">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => setExpanded(p => ({ ...p, [`${idx}-res`]: !isOpen }))}
            >
              <span className="text-gray-600 font-mono text-xs w-4">▸</span>
              <span className="text-gray-500 font-mono text-xs w-14">←</span>
              <span className={`font-mono text-xs font-bold w-10 ${statusColor(entry.status)}`}>{entry.status}</span>
              <span className="font-mono text-[10px] text-gray-500">{entry.durationMs}ms</span>
              {roleLabel && (
                <span className={`text-[10px] font-bold ml-2 ${entry.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                  {entry.pass ? '✓' : '✗'} {roleLabel}
                  {!entry.pass && <span className="text-gray-500 font-normal ml-1">(기대: {expectedArr.join(' or ')})</span>}
                </span>
              )}
            </div>
            {isOpen && (
              <pre className="ml-6 mt-1 text-[10px] text-gray-400 font-mono bg-gray-900 rounded p-2 overflow-x-auto max-h-48">
                {renderBody(entry.body)}
              </pre>
            )}
          </div>
        );
      }

      case 'scenario-result':
        return (
          <div key={idx} className="ml-4 mt-2 flex items-center gap-2">
            {entry.pass
              ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
              : <XCircle     size={14} className="text-red-400 flex-shrink-0" />}
            <span className={`text-xs font-bold ${entry.pass ? 'text-emerald-400' : 'text-red-400'}`}>
              {entry.pass ? 'PASS' : 'FAIL'} — 차단/통과 검증 {entry.passed}/{entry.total}
            </span>
          </div>
        );

      case 'divider':
        return <div key={idx} className="border-t border-gray-800 my-3" />;

      case 'summary':
        return (
          <div key={idx} className="mt-4 p-3 rounded-lg border border-gray-700 bg-gray-900">
            <div className="flex items-center gap-2">
              {entry.passed === entry.total
                ? <CheckCircle2 size={18} className="text-emerald-400" />
                : <XCircle     size={18} className="text-red-400" />}
              <span className="font-bold text-white">최종 결과: {entry.passed}/{entry.total} 시나리오 통과</span>
            </div>
          </div>
        );

      case 'error':
        return (
          <div key={idx} className="mt-2 text-red-400 font-mono text-xs ml-4">
            ✗ {entry.message}
          </div>
        );

      default: return null;
    }
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        {onBack && (
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <ShieldAlert size={20} className="text-rose-400" />
        <h1 className="font-bold text-white">보안 테스트 러너</h1>
        <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">권한 시스템 공격 시나리오</span>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: Config + Scenario selector */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">

          {/* 계정 설정 */}
          <div className="p-4 border-b border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">계정 설정</p>

            <div className="mb-3">
              <label className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-1.5">
                <User size={11} /> 관리자 (ORIGIN)
              </label>
              <input className={inputCls} placeholder="userId" value={adminCred.userId}
                onChange={e => setAdminCred(p => ({ ...p, userId: e.target.value }))} />
              <input className={`${inputCls} mt-1.5`} type="password" placeholder="password" value={adminCred.password}
                onChange={e => setAdminCred(p => ({ ...p, password: e.target.value }))} />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-1.5">
                <Lock size={11} /> 공격자 (제한된 권한)
              </label>
              <input className={inputCls} placeholder="userId" value={attackerCred.userId}
                onChange={e => setAttackerCred(p => ({ ...p, userId: e.target.value }))} />
              <input className={`${inputCls} mt-1.5`} type="password" placeholder="password" value={attackerCred.password}
                onChange={e => setAttackerCred(p => ({ ...p, password: e.target.value }))} />
            </div>
          </div>

          {/* 시나리오 선택 */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">시나리오 선택</p>
              <button
                onClick={() => setSelectedIds(selectedIds.size === scenarios.length ? new Set() : new Set(scenarios.map(s => s.id)))}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {selectedIds.size === scenarios.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="space-y-1.5">
              {scenarios.map(s => (
                <label key={s.id} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-rose-500"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleScenario(s.id)}
                  />
                  <div>
                    <p className="text-xs text-gray-200 group-hover:text-white transition-colors leading-tight">{s.title}</p>
                    <p className={`text-[10px] ${s.categoryColor}`}>{s.category}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-gray-600">
              {selectedIds.size === 0 ? '선택 없음 → 전체 실행' : `${selectedIds.size}개 선택됨`}
            </p>
          </div>

          {/* 실행 버튼 */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={runScenarios}
              disabled={running || !adminCred.password || !attackerCred.userId || !attackerCred.password}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? '실행 중…' : '테스트 실행'}
            </button>
            {logs.length > 0 && !running && (
              <button
                onClick={() => setLogs([])}
                className="w-full mt-2 flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                <Trash2 size={12} /> 로그 지우기
              </button>
            )}
          </div>
        </div>

        {/* Right: Log panel */}
        <div className="flex-1 overflow-y-auto p-4 font-mono">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
              <Terminal size={40} />
              <p className="text-sm">계정을 입력하고 테스트를 실행하세요.</p>
              <p className="text-xs text-center max-w-xs">
                각 시나리오는 설정 → 공격 → 검증 → 정리 순서로 자동 진행됩니다.
              </p>
            </div>
          ) : (
            <>
              {logs.map((entry, idx) => renderLog(entry, idx))}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
