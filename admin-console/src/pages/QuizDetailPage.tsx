import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import {QuizSession} from '../types/quiz';
import {useToast} from '../hooks/useToast';
import EmptyState from '../components/EmptyState';

const QuizDetailPage = () => {
  const {id: orgId, quizId} = useParams<{id: string; quizId: string}>();
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'details' | 'submissions'>('details');
  const [subs, setSubs] = useState<any[] | null>(null);
  const [subsStats, setSubsStats] = useState<any | null>(null);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [presence, setPresence] = useState<any[] | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(false);

  const load = async () => {
    if (!orgId || !quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuiz(orgId, quizId);
      setQuiz(res);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId, quizId]);

  const loadSubs = async () => {
    if (!orgId || !quizId) return;
    setSubsLoading(true);
    setSubsError(null);
    try {
      const res = await api.getQuizSubmissions(orgId, quizId);
      const subsList = (res as any)?.submissions ?? [];
      setSubs(subsList);
      setSubsStats((res as any)?.stats ?? null);
    } catch (err: any) {
      setSubsError(err?.message ?? 'Failed to load submissions');
      setSubs(null);
      setSubsStats(null);
    } finally {
      setSubsLoading(false);
    }
  };

  const startNow = async () => {
    if (!orgId || !quizId) return;
    try {
      const res = await api.startQuiz(orgId, quizId);
      setQuiz(res);
      toast.success('Quiz started');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to start quiz');
    }
  };

  const endQuiz = async () => {
    if (!orgId || !quizId) return;
    try {
      const res = await api.endQuiz(orgId, quizId);
      setQuiz(res);
      toast.success('Quiz ended');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to end quiz');
    }
  };

  if (loading) {
    return (
      <div className="overview">
        <Card>
          <LoadingState message="Loading quiz..." />
        </Card>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="overview">
        <Card>
          <ErrorState message={error ?? 'Failed to load quiz'} onRetry={load} />
        </Card>
      </div>
    );
  }

  const now = new Date();
  const start = quiz.start_time ? new Date(quiz.start_time) : null;
  const planned =
    start && start.getTime() > now.getTime() ? `Planned start: ${start.toLocaleString()}` : 'Starts immediately if run now';

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>{quiz.title}</h2>
            <p className="muted">
              Status: <span className="badge">{quiz.status}</span>
            </p>
            <p className="muted">
              Start: {quiz.start_time ? new Date(quiz.start_time).toLocaleString() : '—'} | End:{' '}
              {quiz.end_time ? new Date(quiz.end_time).toLocaleString() : '—'}
            </p>
            <p className="muted">{planned}</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <button className="secondary" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
            <button className="primary" type="button" onClick={startNow}>
              Start quiz now
            </button>
            <button className="secondary" type="button" onClick={endQuiz}>
              End quiz
            </button>
          </div>
        </div>
        <div style={{display: 'flex', gap: 8, marginTop: 8}}>
          <button className={tab === 'details' ? 'primary' : 'secondary'} onClick={() => setTab('details')}>
            Details
          </button>
          <button
            className={tab === 'submissions' ? 'primary' : 'secondary'}
            onClick={() => {
              setTab('submissions');
              void loadSubs();
            }}>
            Submissions
          </button>
          <button
            className={tab === 'presence' ? 'primary' : 'secondary'}
            onClick={async () => {
              setTab('presence');
              if (presence) return;
              if (!orgId || !quizId) return;
              setPresenceLoading(true);
              setPresenceError(null);
              try {
                const res = await api.getQuizPresence(orgId, quizId);
                setPresence(res?.presence_logs ?? []);
              } catch (err: any) {
                setPresenceError(err?.message ?? 'Failed to load presence');
              } finally {
                setPresenceLoading(false);
              }
            }}>
            Presence
          </button>
        </div>
      </Card>

      {tab === 'submissions' ? (
        <Card>
          {subsLoading ? (
            <LoadingState message="Loading submissions..." />
          ) : subsError ? (
            <ErrorState message={subsError} onRetry={loadSubs} />
          ) : subs && subs.length > 0 ? (
            <>
              <div className="table__header">
                <div>
                  <h3>Submissions</h3>
                  <p className="muted">
                    Avg score: {subsStats?.average_score?.toFixed?.(2) ?? '—'} | Total: {subsStats?.submission_count ?? subs.length}
                  </p>
                </div>
              </div>
              <div className="table">
            <div className="table__row table__head">
              <div>Profile</div>
              <div>Submitted at</div>
              <div>Score</div>
              <div>Status</div>
            </div>
            {subs.map(s => (
              <div className="table__row" key={s.id}>
                <div>{s.profile_id}</div>
                <div className="muted">{formatDate(s.submitted_at)}</div>
                <div>{s.score ?? '—'}</div>
                <div>
                  <span className="badge">{s.status}</span>
                </div>
              </div>
            ))}
            </div>
              <div className="actions" style={{marginTop: 12}}>
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    if (!orgId || !quizId) return;
                    try {
                      const csv = await api.exportQuizSubmissionsCsv(orgId, quizId);
                      const blob = new Blob([csv], {type: 'text/csv'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `quiz_${quizId}_submissions.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                      toast.error(err?.message ?? 'Failed to export CSV');
                    }
                  }}>
                  Export CSV
                </button>
              </div>
            </>
          ) : (
            <EmptyState message="No submissions yet." />
          )}
        </Card>
      ) : null}
      {tab === 'presence' ? (
        <Card>
          {presenceLoading ? (
            <LoadingState message="Loading presence..." />
          ) : presenceError ? (
            <ErrorState message={presenceError} onRetry={() => setPresence(null)} />
          ) : presence && presence.length > 0 ? (
            <div className="table">
              <div className="table__row table__head">
                <div>User</div>
                <div>Receiver</div>
                <div>Time</div>
                <div>Result</div>
                <div>Token prefix</div>
              </div>
              {presence.map((p: any) => (
                <div className="table__row" key={p.id}>
                  <div>{p.user_ref || '—'}</div>
                  <div>{p.receiver_id || '—'}</div>
                  <div className="muted">{formatDate(p.server_timestamp)}</div>
                  <div>{p.auth_result}</div>
                  <div>{p.token_prefix}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No presence logs in the quiz window." />
          )}
        </Card>
      ) : null}
    </div>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default QuizDetailPage;
