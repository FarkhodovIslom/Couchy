'use client';

import { useState, useEffect } from 'react';
import { getAlertReport } from '../lib/api';

interface Report {
  totalAlerts: number;
  unreadAlerts: number;
  gapNodes: Array<{ nodeId: string; count: number }>;
  alertsByType: Record<string, number>;
}

export function useReport(sessionId: string) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAlertReport(sessionId)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [sessionId]);

  return { report, loading };
}
