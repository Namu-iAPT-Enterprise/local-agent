import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../api/auth';
import { fetchGatewayPermissions } from '../api/gateway';
import type { AllowedApi } from '../api/gateway';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermissionStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface PermissionState {
  status: PermissionStatus;
  permissionRoles: string[];
  allowedApis: AllowedApi[];
  errorCode?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Polls GET /api/gateway/permissions after login.
 *
 * - 202 (LOADING)  → waits retryAfterMs, then polls again
 * - 200 (LOADED)   → stores allowedApis / permissionRoles, stops polling
 * - 503 / error    → sets error state, stops polling
 *
 * Resets to idle when isLoggedIn becomes false (logout).
 */
export function usePermissions(isLoggedIn: boolean): PermissionState {
  const [state, setState] = useState<PermissionState>({
    status: 'idle',
    permissionRoles: [],
    allowedApis: [],
  });

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const poll = useCallback(async () => {
    if (!mountedRef.current || !getAccessToken()) return;

    try {
      const { httpStatus, data } = await fetchGatewayPermissions();

      if (!mountedRef.current) return;

      // Still loading on the gateway side → retry after suggested delay
      if (httpStatus === 202 && data.status === 'LOADING') {
        const retryMs = data.retryAfterMs ?? 2000;
        timerRef.current = setTimeout(poll, retryMs);
        return;
      }

      // Successfully loaded
      if (httpStatus === 200 && data.status === 'LOADED') {
        setState({
          status: 'loaded',
          permissionRoles: data.permissionRoles,
          allowedApis: data.allowedApis,
        });
        return;
      }

      // 503 or unexpected response
      setState(prev => ({
        ...prev,
        status: 'error',
        errorCode: String(httpStatus),
      }));
    } catch {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (isLoggedIn) {
      setState({ status: 'loading', permissionRoles: [], allowedApis: [] });
      poll();
    } else {
      // Reset on logout / not yet logged in
      clearTimer();
      setState({ status: 'idle', permissionRoles: [], allowedApis: [] });
    }

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [isLoggedIn, poll]);

  return state;
}
