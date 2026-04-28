import { useState, useEffect, useCallback } from 'react';
import { fetchRolePermissions } from '../api/gateway';
import type { AllowedApi } from '../api/gateway';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermissionStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface PermissionState {
  status: PermissionStatus;
  /** Assigned role IDs (e.g. "ORIGIN", "TEAM_ALPHA_LEAD") */
  roleIds: string[];
  /** Union of permission tags from all assigned roles */
  permissionTags: string[];
  /** Feature keys enabled for the user (frontend UI control) */
  enabledFeatures: string[];
  /** Allowed API details */
  allowedApis: AllowedApi[];
  reload: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Fetches permission info from GET /api/role/profile after login.
 * Call reload() to refetch immediately.
 */
export function usePermissions(isLoggedIn: boolean): PermissionState {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<Omit<PermissionState, 'reload'>>({
    status: 'idle',
    roleIds: [],
    permissionTags: [],
    enabledFeatures: [],
    allowedApis: [],
  });

  const reload = useCallback(() => {
    setReloadCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setState({ status: 'idle', roleIds: [], permissionTags: [], enabledFeatures: [], allowedApis: [] });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

    fetchRolePermissions()
      .then((data) => {
        if (cancelled) return;
        setState({
          status: 'loaded',
          roleIds: data.roleIds ?? [],
          permissionTags: data.permissionTags ?? [],
          enabledFeatures: data.enabledFeatures ?? [],
          allowedApis: data.allowedApis ?? [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error', roleIds: [], permissionTags: [], enabledFeatures: [], allowedApis: [] });
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, reloadCount]);

  return { ...state, reload };
}
