import React, {useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {useToast} from '../hooks/useToast';
import {QuizQuestion} from '../types/quiz';

type QuestionDraft = {
  id: string;
  type: QuizQuestion['type'];
  text: string;
  options?: string[];
  correct_option?: string;
  time_limit_sec?: number;
};

const defaultQuestion: QuestionDraft = {
  id: crypto.randomUUID(),
  type: 'mcq',
  text: '',
  options: ['', '', '', ''],
  correct_option: '',
  time_limit_sec: 30,
};

const questionTypes = ['mcq', 'true_false', 'numeric', 'short_answer', 'long_answer'] as const;

const QuizBuilderPage = () => {
  const {id: orgIdParam} = useParams<{id: string}>();
  const orgId = orgIdParam || '';
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState('draft');
  const [questions, setQuestions] = useState<QuestionDraft[]>([{...defaultQuestion}]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirePresence, setRequirePresence] = useState(false);
  const [presenceWindow, setPresenceWindow] = useState(10);
  const [lateJoinAllowed, setLateJoinAllowed] = useState(false);

  const addQuestion = () => {
    setQuestions(qs => [...qs, {...defaultQuestion, id: crypto.randomUUID()}]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions(qs => qs.map(q => (q.id === id ? {...q, ...updates} : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const save = async () => {
    if (!orgId) {
      setError('Org ID missing');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        course_id: courseId || undefined,
        receiver_id: receiverId || undefined,
        start_time: startTime || new Date().toISOString(),
        duration_minutes: duration || 30,
        status,
        questions: questions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.options,
          options_json: q.options,
          correct_option: q.correct_option,
          time_limit_sec: q.time_limit_sec,
        })),
        settings_json: {
          require_presence: requirePresence,
          presence_window_minutes: presenceWindow,
          late_join_allowed: lateJoinAllowed,
        },
      };
      await api.createQuiz(orgId, payload);
      toast.success('Quiz saved as draft');
      navigate(`/organizations/${orgId}`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Quiz Builder</h2>
            <p className="muted">Create or edit a quiz. Saved as draft by default.</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <button className="primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>
        {error ? <div className="form__error">{error}</div> : null}
        <div className="form">
          <label className="form__field">
            <span>Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Midterm Quiz" />
          </label>
          <label className="form__field">
            <span>Course ID (optional)</span>
            <input value={courseId} onChange={e => setCourseId(e.target.value)} placeholder="COURSE-123" />
          </label>
          <label className="form__field">
            <span>Receiver ID (optional)</span>
            <input value={receiverId} onChange={e => setReceiverId(e.target.value)} placeholder="RX-123" />
          </label>
          <label className="form__field">
            <span>Start time</span>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </label>
          <label className="form__field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value) || 0)}
            />
          </label>
          <label className="form__field">
            <span>Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <div className="form__field" style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <input type="checkbox" checked={requirePresence} onChange={e => setRequirePresence(e.target.checked)} />
              <span>Require valid presence</span>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <input
                type="checkbox"
                checked={lateJoinAllowed}
                onChange={e => setLateJoinAllowed(e.target.checked)}
              />
              <span>Late join allowed</span>
            </label>
          </div>
          <label className="form__field">
            <span>Presence validity window (minutes)</span>
            <input
              type="number"
              min={1}
              value={presenceWindow}
              onChange={e => setPresenceWindow(Number(e.target.value) || 0)}
            />
          </label>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <h3>Questions</h3>
          <button className="primary" type="button" onClick={addQuestion} disabled={saving}>
            + Add question
          </button>
        </div>
        {questions.length === 0 ? (
          <EmptyState message="No questions yet." />
        ) : (
          <div className="stack" style={{display: 'grid', gap: 16}}>
            {questions.map((q, idx) => (
              <div key={q.id} className="card" style={{padding: 12}}>
                <div className="table__header" style={{justifyContent: 'space-between'}}>
                  <div>
                    <strong>Question {idx + 1}</strong>
                  </div>
                  <button className="secondary" type="button" onClick={() => removeQuestion(q.id)} disabled={saving}>
                    Remove
                  </button>
                </div>
                <label className="form__field">
                  <span>Type</span>
                  <select value={q.type} onChange={e => updateQuestion(q.id, {type: e.target.value as any})}>
                    {questionTypes.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form__field">
                  <span>Text</span>
                  <textarea
                    rows={3}
                    value={q.text}
                    onChange={e => updateQuestion(q.id, {text: e.target.value})}
                    placeholder="Enter the question"
                  />
                </label>
                {q.type === 'mcq' ? (
                  <div className="form__field">
                    <span>Options (A-E)</span>
                    {['A', 'B', 'C', 'D', 'E'].map((label, i) => (
                      <input
                        key={label}
                        style={{marginBottom: 4}}
                        value={q.options?.[i] ?? ''}
                        onChange={e => {
                          const opts = q.options ? [...q.options] : ['', '', '', '', ''];
                          opts[i] = e.target.value;
                          updateQuestion(q.id, {options: opts});
                        }}
                        placeholder={`Option ${label}`}
                      />
                    ))}
                    <label className="form__field">
                      <span>Correct option (A-E)</span>
                      <input
                        value={q.correct_option ?? ''}
                        onChange={e => updateQuestion(q.id, {correct_option: e.target.value})}
                        placeholder="A"
                      />
                    </label>
                  </div>
                ) : null}
                {q.type === 'true_false' ? (
                  <label className="form__field">
                    <span>Correct answer</span>
                    <select
                      value={q.correct_option ?? ''}
                      onChange={e => updateQuestion(q.id, {correct_option: e.target.value})}>
                      <option value="">--</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </label>
                ) : null}
                {q.type === 'numeric' ? (
                  <label className="form__field">
                    <span>Correct numeric answer</span>
                    <input
                      type="number"
                      value={q.correct_option ?? ''}
                      onChange={e => updateQuestion(q.id, {correct_option: e.target.value})}
                      placeholder="42"
                    />
                  </label>
                ) : null}
                {(q.type === 'short_answer' || q.type === 'long_answer') && (
                  <label className="form__field">
                    <span>Reference answer (optional)</span>
                    <textarea
                      rows={q.type === 'long_answer' ? 4 : 2}
                      value={q.correct_option ?? ''}
                      onChange={e => updateQuestion(q.id, {correct_option: e.target.value})}
                      placeholder="Reference answer"
                    />
                  </label>
                )}
                <label className="form__field">
                  <span>Time limit (seconds)</span>
                  <input
                    type="number"
                    min={5}
                    value={q.time_limit_sec ?? 0}
                    onChange={e => updateQuestion(q.id, {time_limit_sec: Number(e.target.value) || 0})}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuizBuilderPage;
