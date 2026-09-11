import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { NotificationUnreadCount } from '../types';

interface UseNotificationPollingOptions {
  userId?: number;
  isAdmin?: boolean;
  enabled?: boolean;
}

const POLLING_INTERVAL_MS = 45000; // 45 seconds

export function useNotificationPolling({
  userId,
  isAdmin = false,
  enabled = true,
}: UseNotificationPollingOptions) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!enabled) return;
    if (!isAdmin && userId === undefined) return;

    try {
      setLoading(true);
      const url = isAdmin
        ? '/admin/notifications/unread-count'
        : `/notifications/unread-count?user_id=${userId}`;
      const res = await api.get<NotificationUnreadCount>(url);
      setUnreadCount(res.data.unread_count);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
      setError('Failed to fetch notification count');
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, enabled]);

  useEffect(() => {
    if (!enabled || (!isAdmin && userId === undefined)) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchUnreadCount();

    const startPolling = () => {
      stopPolling();
      intervalRef.current = window.setInterval(() => {
        fetchUnreadCount();
      }, POLLING_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
  }, [fetchUnreadCount, userId, isAdmin, enabled]);

  return {
    unreadCount,
    setUnreadCount,
    loading,
    error,
    refreshUnreadCount: fetchUnreadCount,
  };
}
