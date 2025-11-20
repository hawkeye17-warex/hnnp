import {useCallback, useEffect, useMemo, useState} from 'react';

import {getPresenceHistory} from '../api/client';
import {HistoryEvent} from '../types/history';

export type HistorySection = {
  title: string;
  data: HistoryEvent[];
};

const groupEvents = (events: HistoryEvent[]): HistorySection[] => {
  // Simple grouping based on substrings in the mock time field
  const buckets: Record<string, HistoryEvent[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  events.forEach(event => {
    if (event.time.includes('Yesterday')) {
      buckets['Yesterday'].push(event);
    } else if (event.time.startsWith('Tue') || event.time.startsWith('Mon')) {
      buckets['This Week'].push(event);
    } else if (event.time.match(/^[0-9]{2}:/)) {
      buckets['Today'].push(event);
    } else {
      buckets['Earlier'].push(event);
    }
  });

  return Object.entries(buckets)
    .map(([title, data]) => ({title, data}))
    .filter(section => section.data.length > 0);
};

const useHistory = () => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPresenceHistory();
      setEvents(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const sections = useMemo(() => groupEvents(events), [events]);

  return {sections, loading, error, refresh: fetchHistory};
};

export default useHistory;
