import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {QuizSession} from '../types/quiz';

type Props = {orgId: string};

const QuizzesTab = ({orgId}: Props) => {
  const api = useApi();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuizSessions(orgId);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setQuizzes(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId]);

  const filtered = useMemo(() => {
    return quizzes.filter(q => {
      if (course && q.course_id !== course) return false;
      if (status && q.status?.toLowerCase() !== status.toLowerCase()) return false;
      const start = q.start_time ? new Date(q.start_time).getTime() : null;
      if (from) {
        const f = new Date(from).getTime();
        if (start && start < f) return false;
      }
      if (to) {
        const t = new Date(to).getTime();
        if (start && start > t) return false;
      }
      return true;
    });
  }, [quizzes, course, status, from, to]);

  return (
    <Card>
      <div className="table__header">
        <div>
          <h2>Quizzes</h2>
          <p className="muted">Quiz sessions for this org.</p>
        </div>
        <div className="actions" style={{gap: 8}}>
          <input
            className="input"
            placeholder="Course ID filter"
            value={course}
            onChange={e => setCourse(e.target.value)}
          />
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="closed">Closed</option>
          </select>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setCourse('');
              setStatus('');
              setFrom('');
              setTo('');
            }}>
            Clear
          </button>
          <button className="primary" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button className="primary" type="button" onClick={() => navigate(`/organizations/${orgId}/quizzes/new`)}>
            + New quiz
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading quizzes..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No quizzes found." />
      ) : (
        <div className="table">
          <div className="table__row table__head">
            <div>Title</div>
            <div>Receiver</div>
            <div>Course</div>
            <div>Start</div>
            <div>End</div>
            <div>Status</div>
          </div>
          {filtered.map(q => (
            <div className="table__row" key={q.id}>
              <div>{q.title}</div>
              <div>{q.receiver_id || '—'}</div>
              <div>{q.course_id || '—'}</div>
              <div className="muted">{formatDate(q.start_time)}</div>
              <div className="muted">{formatDate(q.end_time)}</div>
              <div>
                <span className="badge">{q.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default QuizzesTab;
