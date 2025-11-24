import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import {QuizSession} from '../types/quiz';
import {useToast} from '../hooks/useToast';

const QuizDetailPage = () => {
  const {id: orgId, quizId} = useParams<{id: string; quizId: string}>();
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      </Card>
    </div>
  );
};

export default QuizDetailPage;
