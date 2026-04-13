import { useState, useEffect } from 'react';
import { fetchRolePermissions } from '../api/gateway';
import type { AllowedApi } from '../api/gateway';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermissionStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface PermissionState {
  status: PermissionStatus;
  permissionRoles: string[];
  allowedApis: AllowedApi[];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * 로그인 후 GET /api/management/role/profile 를 한 번 호출해 권한 정보를 가져옵니다.
 *
 * Data Gateway가 자체 캐시에서 즉시 응답하므로 202 폴링 없이 단순 fetch입니다.
 * isLoggedIn이 false가 되면(로그아웃) 상태를 idle로 초기화합니다.
 */
export function usePermissions(isLoggedIn: boolean): PermissionState {
  const [state, setState] = useState<PermissionState>({
    status: 'idle',
    permissionRoles: [],
    allowedApis: [],
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setState({ status: 'idle', permissionRoles: [], allowedApis: [] });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', permissionRoles: [], allowedApis: [] });

    fetchRolePermissions()
      .then((data) => {
        if (cancelled) return;
        setState({
          status: 'loaded',
          permissionRoles: data.permissionRoles ?? [],
          allowedApis: data.allowedApis ?? [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error', permissionRoles: [], allowedApis: [] });
      });

    return () => { cancelled = true; };
  }, [isLoggedIn]);

  return state;
}
