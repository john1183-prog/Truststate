import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { NotificationUnreadCount, RoleEnum } from '../types';
import { useAuth } from '../auth/AuthContext';
import { getAuthGeneration } from '../auth/tokenStore';

interface UseNotificationPollingOptions {
  isAdmin?: boolean;
  enabled?: boolean;
}

const POLLING_INTERVAL_MS = 45000; // 45 seconds

export function useNotificationPolling({
  isAdmin = false,
  enabled = true,
}: UseNotificationPollingOptions = {}) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  const canPoll =
    enabled &&
    !isAuthLoading &&
    isAuthenticated &&
    userId !== null &&
    (!isAdmin || userRole === RoleEnum.admin);

  const fetchUnreadCount = useCallback(async () => {
    if (!canPoll) return;

    const requestGen = getAuthGeneration();

    try {
      setLoading(true);
      const url = isAdmin
        ? '/admin/notifications/unread-count'
        : '/notifications/unread-count';
      const res = await api.get<NotificationUnreadCount>(url);
      if (requestGen !== getAuthGeneration()) {
        return;
      }
      setUnreadCount(res.data.unread_count);
      setError(null);
    } catch (err) {
      if (requestGen !== getAuthGeneration()) {
        return;
      }
      console.error('Failed to fetch unread notification count:', err);
      setError('Failed to fetch notification count');
    } finally {
      if (requestGen === getAuthGeneration()) {
        setLoading(false);
      }
    }
  }, [canPoll, isAdmin, userId]);

  useEffect(() => {
    const stopPolling = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!canPoll) {
      stopPolling();
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    // Reset state on user/role switch before starting fresh poll
    setUnreadCount(0);
    setError(null);

    // Initial fetch
    fetchUnreadCount();

    const startPolling = () => {
      stopPolling();
      intervalRef.current = window.setInterval(() => {
        fetchUnreadCount();
      }, POLLING_INTERVAL_MS);
    };

    // Start polling initially
    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnreadCount();
        startPolling();
      }
    };

    const handleFocus = () => {
      fetchUnreadCount();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUnreadCount, canPoll, userId, isAdmin]);

  return {
    unreadCount,
    setUnreadCount,
    loading,
    error,
    refreshUnreadCount: fetchUnreadCount,
  };
}
