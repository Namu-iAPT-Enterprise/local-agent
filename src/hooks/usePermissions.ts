import { useState, useEffect, useCallback } from 'react';
import { fetchRolePermissions } from '../api/gateway';
import type { AllowedApi } from '../api/gateway';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermissionStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface PermissionState {
  status: PermissionStatus;
  permissionRoles: string[];
  allowedApis: AllowedApi[];
  reload: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * 로그인 후 GET /api/management/role/profile 를 호출해 권한 정보를 가져옵니다.
 *
 * reload()를 호출하면 즉시 재조회합니다.
 * isLoggedIn이 false가 되면(로그아웃) 상태를 idle로 초기화합니다.
 */
export function usePermissions(isLoggedIn: boolean): PermissionState {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<Omit<PermissionState, 'reload'>>({
    status: 'idle',
    permissionRoles: [],
    allowedApis: [],
  });

  const reload = useCallback(() => {
    setReloadCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setState({ status: 'idle', permissionRoles: [], allowedApis: [] });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

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
  }, [isLoggedIn, reloadCount]);

  return { ...state, reload };
}
