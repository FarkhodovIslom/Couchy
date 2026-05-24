'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProactiveAlert } from '@kibo/shared';
import { getAlerts, markAlertRead } from '../lib/api';

export function useAlerts(sessionId: string) {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);

  useEffect(() => {
    getAlerts(sessionId).then(setAlerts);
    const interval = setInterval(() => {
      getAlerts(sessionId).then((a) => {
        if (a.length > 0) setAlerts(a);
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const addAlerts = useCallback((newAlerts: ProactiveAlert[]) => {
    setAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const unique = newAlerts.filter((a) => !existingIds.has(a.id));
      return unique.length > 0 ? [...unique, ...prev] : prev;
    });
  }, []);

  const markRead = useCallback(async (alertId: string) => {
    await markAlertRead(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
    );
  }, []);

  return { alerts, addAlerts, markRead };
}
